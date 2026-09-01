/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AppState,
  CameraPermissionState,
  RecognitionStatus,
  ASLRecognitionResult,
  TranslationHistoryItem,
  CameraSettings,
  ServerHealthStatus
} from './types';
import { aslRecognitionService, getApiBaseUrl } from './services/aslRecognitionService';
import { speechService } from './services/speechService';
import { Header } from './components/Header';
import { LandingHero } from './components/LandingHero';
import { CameraPanel } from './components/CameraPanel';
import { TranslationPanel } from './components/TranslationPanel';
import { TranslationHistory } from './components/TranslationHistory';
import { ASLReferenceModal } from './components/ASLReferenceModal';
import { PermissionGuideModal } from './components/PermissionGuideModal';
import { PrivacyModal } from './components/PrivacyModal';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { ConfigBanner } from './components/ConfigBanner';
import { Sparkles, ShieldCheck, Heart, Volume2 } from 'lucide-react';

export default function App() {
  // Explicit Application Lifecycle State (Initial state is strictly READY)
  const [appState, setAppState] = useState<AppState>('READY');

  // Camera & Stream State
  const [cameraPermission, setCameraPermission] = useState<CameraPermissionState>('unrequested');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Translation & Recognition State
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [recognitionStatus, setRecognitionStatus] = useState<RecognitionStatus>('idle');
  const [currentResult, setCurrentResult] = useState<ASLRecognitionResult | null>(null);
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [visualFlash, setVisualFlash] = useState<boolean>(false);

  // Server health state
  const [serverHealth, setServerHealth] = useState<ServerHealthStatus>({
    status: 'ready',
    geminiConfigured: true,
    model: 'gemini-3.7-flash',
  });

  // Settings
  const [settings, setSettings] = useState<CameraSettings>({
    mirrored: true,
    deviceId: '',
    autoSpeak: false,
    continuousMode: true,
    sampleIntervalMs: 1100,
    confidenceThreshold: 0.65,
  });

  // Modal Visibility
  const [showReferenceModal, setShowReferenceModal] = useState<boolean>(false);
  const [showPermissionGuideModal, setShowPermissionGuideModal] = useState<boolean>(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState<boolean>(false);

  // Reference to hold active translation loop timer
  const translationLoopRef = useRef<NodeJS.Timeout | null>(null);
  const isLoopRunningRef = useRef<boolean>(false);

  // Check server configuration health on mount (Non-blocking background check)
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const baseUrl = getApiBaseUrl();
    const endpoint = `${baseUrl}/api/health`;

    fetch(endpoint, { signal: controller.signal })
      .then(async (res) => {
        clearTimeout(timeoutId);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const text = await res.text();
        return JSON.parse(text);
      })
      .then((data) => {
        if (data && typeof data === 'object') {
          setServerHealth(data);
        }
      })
      .catch(() => {
        clearTimeout(timeoutId);
        // Non-blocking fallback for static hosting (e.g. GitHub Pages)
        setServerHealth({
          status: 'static_client',
          geminiConfigured: false,
          model: 'gemini-3.7-flash',
        });
      });

    return () => clearTimeout(timeoutId);
  }, []);


  // Enumerate camera devices
  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoInputs);
      if (settings.deviceId && videoInputs.length > 0) {
        const exists = videoInputs.some((d) => d.deviceId === settings.deviceId);
        if (!exists) {
          setSettings((prev) => ({ ...prev, deviceId: '' }));
        }
      }
    } catch (e) {
      console.warn('Error enumerating devices:', e);
    }
  }, [settings.deviceId]);

  // Listen for device connect/disconnect events
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      const handleDeviceChange = () => {
        refreshDevices();
      };
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };
    }
  }, [refreshDevices]);

  /**
   * Stop all active camera tracks and clean up video stream
   */
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTranslating(false);
    isLoopRunningRef.current = false;
    if (translationLoopRef.current) {
      clearTimeout(translationLoopRef.current);
      translationLoopRef.current = null;
    }
    setRecognitionStatus('idle');
    setAppState('READY');
  }, []);

  /**
   * Explicitly request camera access and initialize stream with robust fallback constraints
   */
  const startCamera = useCallback(async (customDeviceId?: string) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraPermission('unavailable');
      setAppState('CAMERA_ERROR');
      setPermissionError('Your browser does not support video media APIs or is running in an insecure HTTP context.');
      return;
    }

    // Stop existing stream if any
    stopCameraStream();

    setCameraPermission('requesting');
    setAppState('REQUESTING_CAMERA');
    setPermissionError(null);

    const targetDeviceId = customDeviceId || settings.deviceId;
    let stream: MediaStream | null = null;
    let lastError: any = null;

    // Define progressive constraint candidates from most specific/optimal to most permissive
    const candidateConstraints: MediaStreamConstraints[] = [];

    if (targetDeviceId) {
      // 1. Exact device ID requested
      candidateConstraints.push({
        video: { deviceId: { exact: targetDeviceId } },
        audio: false,
      });
      // 2. Ideal device ID
      candidateConstraints.push({
        video: { deviceId: { ideal: targetDeviceId } },
        audio: false,
      });
    }

    // 3. User-facing HD camera (ideal constraints)
    candidateConstraints.push({
      video: {
        facingMode: { ideal: 'user' },
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
      },
      audio: false,
    });

    // 4. Basic user-facing camera
    candidateConstraints.push({
      video: { facingMode: 'user' },
      audio: false,
    });

    // 5. Generic video with no constraints (compatible with OBS, virtual cameras, external USB webcams)
    candidateConstraints.push({
      video: true,
      audio: false,
    });

    // 6. Minimal fallback constraint
    candidateConstraints.push({
      video: { width: { min: 320 }, height: { min: 240 } },
      audio: false,
    });

    // Iterate through candidates until one succeeds
    for (let i = 0; i < candidateConstraints.length; i++) {
      try {
        const candidate = candidateConstraints[i];
        stream = await navigator.mediaDevices.getUserMedia(candidate);
        if (stream && stream.getVideoTracks().length > 0) {
          const track = stream.getVideoTracks()[0];
          if (track.readyState !== 'ended') {
            break;
          }
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Camera constraint candidate ${i + 1} failed:`, err?.name, err?.message);

        // If permission was explicitly denied, do not spam other constraints
        if (
          err?.name === 'NotAllowedError' ||
          err?.name === 'PermissionDeniedError' ||
          err?.name === 'SecurityError'
        ) {
          break;
        }

        // If targetDeviceId failed, reset it so future attempts use generic devices
        if (targetDeviceId && i <= 1) {
          setSettings((prev) => ({ ...prev, deviceId: '' }));
        }
      }
    }

    try {
      if (!stream) {
        throw lastError || new Error('Unable to access video stream from camera hardware.');
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video play note:', playErr);
        }
      }

      setCameraPermission('granted');
      setIsTranslating(true);
      setAppState('TRANSLATING');
      refreshDevices();
    } catch (err: any) {
      console.error('Camera getUserMedia error:', err);
      stopCameraStream();

      const errMsg = err?.message || '';
      const errName = err?.name || '';
      const isSystemDenied =
        errMsg.toLowerCase().includes('system') ||
        errMsg.toLowerCase().includes('permission denied by system') ||
        errMsg.toLowerCase().includes('blocked by os');

      const isNotFound =
        errName === 'NotFoundError' ||
        errName === 'DevicesNotFoundError' ||
        errName === 'OverconstrainedError' ||
        errMsg.toLowerCase().includes('not found') ||
        errMsg.toLowerCase().includes('requested device not found') ||
        errMsg.toLowerCase().includes('no device') ||
        errMsg.toLowerCase().includes('could not start video source');

      if (
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError' ||
        errName === 'SecurityError' ||
        errMsg.includes('Permission denied')
      ) {
        setCameraPermission('denied');
        setAppState('CAMERA_DENIED');
        setPermissionError(
          isSystemDenied
            ? 'Camera access is blocked by your operating system privacy settings (macOS Privacy & Security > Camera, or Windows Camera Settings). Please allow camera access and try again.'
            : 'Camera access was denied by your browser. Please click the camera/lock icon in the browser address bar to allow access.'
        );
        if (isSystemDenied) {
          setShowPermissionGuideModal(true);
        }
      } else if (isNotFound) {
        setCameraPermission('unavailable');
        setAppState('CAMERA_ERROR');
        setPermissionError(
          'No working camera device was found or the requested webcam was disconnected. Please connect a webcam or select another video device.'
        );
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCameraPermission('unavailable');
        setAppState('CAMERA_ERROR');
        setPermissionError('The camera is currently in use by another application or video tab. Please close other apps and try again.');
      } else {
        setCameraPermission('unavailable');
        setAppState('CAMERA_ERROR');
        setPermissionError(errMsg || 'Failed to acquire camera stream.');
      }
    }
  }, [settings.deviceId, stopCameraStream, refreshDevices]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
      speechService.stop();
    };
  }, [stopCameraStream]);

  // Rate limit cooldown state
  const [rateLimitCooldownSeconds, setRateLimitCooldownSeconds] = useState<number>(0);
  const rateLimitCooldownRef = useRef<number>(0);

  // Countdown timer for rate limit
  useEffect(() => {
    if (rateLimitCooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setRateLimitCooldownSeconds((prev) => {
        const next = prev - 1;
        rateLimitCooldownRef.current = Math.max(0, next);
        return Math.max(0, next);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitCooldownSeconds]);

  /**
   * Process a single translation cycle from the current video frames
   */
  const processFrameSequence = useCallback(
    async (isManualTrigger = false) => {
      if (!videoRef.current || cameraPermission !== 'granted') {
        return;
      }

      if (aslRecognitionService.getIsProcessing()) {
        return;
      }

      // If in rate limit cooldown and not manual, wait
      if (rateLimitCooldownRef.current > 0 && !isManualTrigger) {
        setRecognitionStatus('rate_limited');
        return;
      }

      // Motion gating: In continuous mode, check if there's any hand/gesture motion
      if (!isManualTrigger) {
        const motionLevel = aslRecognitionService.detectMotion(videoRef.current);
        if (motionLevel < 0.006) {
          // Camera is static / user is still - conserve API quota
          setRecognitionStatus('idle');
          return;
        }
      }

      setRecognitionStatus('capturing');

      try {
        // Capture a sequence of 2 sequential frames spaced 110ms apart to catch sign trajectory rapidly
        const frames = await aslRecognitionService.captureTemporalSequence(
          videoRef.current,
          2,
          110
        );

        if (!frames || frames.length === 0) {
          setRecognitionStatus('idle');
          return;
        }

        setRecognitionStatus('analyzing');

        const recentHistorySigns = history.slice(-3).map((h) => h.english_translation);
        const result = await aslRecognitionService.translateFrames(
          frames,
          recentHistorySigns,
          isManualTrigger ? 'single_sign' : 'continuous'
        );

        setCurrentResult(result);

        // Check if rate limited
        if (result.is_rate_limited) {
          const cooldown = result.retry_after_seconds || 15;
          setRateLimitCooldownSeconds(cooldown);
          rateLimitCooldownRef.current = cooldown;
          setRecognitionStatus('rate_limited');
          return;
        }

        // Check if backend reported missing key or connection error
        if (result.is_not_configured || result.is_connection_error) {
          setRecognitionStatus('idle');
          return;
        }

        // Check if sign is reliable and not a duplicate within cooldown
        if (result.is_reliable && result.recognized_sign !== 'NONE' && result.english_translation) {
          setRecognitionStatus('success');

          // Flash UI for deaf/HOH accessibility
          setVisualFlash(true);
          setTimeout(() => setVisualFlash(false), 320);

          // Auto speak if enabled
          if (settings.autoSpeak) {
            speechService.speak(result.english_translation);
          }

          // Add to session history
          const now = new Date();
          const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const newItem: TranslationHistoryItem = {
            id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
            formattedTime,
            recognized_signs: result.recognized_signs || [result.recognized_sign],
            english_translation: result.english_translation,
            confidence: result.confidence,
            is_reliable: result.is_reliable,
            hand_shape_analysis: result.hand_shape_analysis,
            movement_description: result.movement_description,
          };

          setHistory((prev) => [newItem, ...prev]);
        } else if (!result.is_reliable && result.recognized_sign !== 'NONE' && result.english_translation) {
          setRecognitionStatus('low_confidence');
        } else {
          setRecognitionStatus('idle');
        }
      } catch (err: any) {
        // Only log if it's not a benign skip
        if (err?.message !== 'A translation request is already in progress.') {
          console.warn('Translation cycle note:', err?.message || err);
        }
        setRecognitionStatus('idle');
      }
    },
    [cameraPermission, history, settings.autoSpeak]
  );

  /**
   * Continuous translation loop runner
   */
  useEffect(() => {
    if (cameraPermission !== 'granted' || !isTranslating) {
      if (translationLoopRef.current) {
        clearTimeout(translationLoopRef.current);
        translationLoopRef.current = null;
      }
      isLoopRunningRef.current = false;
      return;
    }

    isLoopRunningRef.current = true;

    const runLoop = async () => {
      if (!isLoopRunningRef.current || !isTranslating) return;

      await processFrameSequence(false);

      if (isLoopRunningRef.current && isTranslating) {
        const nextDelay = rateLimitCooldownRef.current > 0
          ? Math.max(3000, rateLimitCooldownRef.current * 1000)
          : settings.sampleIntervalMs;
        translationLoopRef.current = setTimeout(runLoop, nextDelay);
      }
    };

    // Kick off loop with small initial delay
    translationLoopRef.current = setTimeout(runLoop, 250);

    return () => {
      if (translationLoopRef.current) {
        clearTimeout(translationLoopRef.current);
        translationLoopRef.current = null;
      }
    };
  }, [cameraPermission, isTranslating, settings.sampleIntervalMs, processFrameSequence]);

  // Handler functions
  const handleChangeSpeed = (intervalMs: number) => {
    setSettings((prev) => ({ ...prev, sampleIntervalMs: intervalMs }));
  };

  const handleToggleTranslation = () => {
    setIsTranslating((prev) => !prev);
  };

  const handleManualSnap = () => {
    processFrameSequence(true);
  };

  const handleToggleMirror = () => {
    setSettings((prev) => ({ ...prev, mirrored: !prev.mirrored }));
  };

  const handleToggleAutoSpeak = () => {
    setSettings((prev) => {
      const next = !prev.autoSpeak;
      if (!next) speechService.stop();
      return { ...prev, autoSpeak: next };
    });
  };

  const handleSwitchDevice = (deviceId: string) => {
    setSettings((prev) => ({ ...prev, deviceId }));
    startCamera(deviceId);
  };

  const handleClearTranslation = () => {
    setCurrentResult(null);
    setRecognitionStatus('idle');
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSpeakText = (text: string) => {
    speechService.speak(text);
  };

  const handleStopAll = () => {
    stopCameraStream();
    setCameraPermission('unrequested');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Configuration notification if missing API key */}
      <ConfigBanner
        isConfigured={serverHealth.geminiConfigured}
        onOpenDiagnostics={() => setShowDiagnosticsModal(true)}
      />

      {/* Main Global Header */}
      <Header
        cameraPermission={cameraPermission}
        appState={appState}
        isTranslating={isTranslating}
        autoSpeak={settings.autoSpeak}
        onToggleAutoSpeak={handleToggleAutoSpeak}
        onOpenReference={() => setShowReferenceModal(true)}
        onOpenPermissionGuide={() => setShowPermissionGuideModal(true)}
        onOpenPrivacy={() => setShowPrivacyModal(true)}
        onOpenDiagnostics={() => setShowDiagnosticsModal(true)}
      />

      {/* Main Body View */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {cameraPermission === 'unrequested' ? (
          /* Landing Screen before camera is requested */
          <LandingHero
            onStartCamera={() => startCamera()}
            onOpenReference={() => setShowReferenceModal(true)}
            onOpenHowItWorks={() => {
              const el = document.getElementById('how-it-works-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            onOpenPermissionGuide={() => setShowPermissionGuideModal(true)}
            isRequesting={cameraPermission === 'requesting'}
            cameraPermission={cameraPermission}
            permissionError={permissionError}
          />
        ) : (
          /* Main Interactive Studio Screen */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Workspace Grid: Camera Panel & Translation Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Camera Viewport (7 cols on lg) */}
              <div className="lg:col-span-7 w-full">
                <CameraPanel
                  videoRef={videoRef}
                  cameraPermission={cameraPermission}
                  permissionError={permissionError}
                  isTranslating={isTranslating}
                  recognitionStatus={recognitionStatus}
                  rateLimitCooldownSeconds={rateLimitCooldownSeconds}
                  settings={settings}
                  availableDevices={availableDevices}
                  onStartCameraAndTranslation={() => startCamera()}
                  onStopCameraAndTranslation={handleStopAll}
                  onToggleTranslation={handleToggleTranslation}
                  onToggleMirror={handleToggleMirror}
                  onSwitchDevice={handleSwitchDevice}
                  onChangeSpeed={handleChangeSpeed}
                  onManualSnap={handleManualSnap}
                  onOpenPermissionGuide={() => setShowPermissionGuideModal(true)}
                  visualFlash={visualFlash}
                />
              </div>

              {/* Right Column: English Translation Display (5 cols on lg) */}
              <div className="lg:col-span-5 w-full">
                <TranslationPanel
                  currentResult={currentResult}
                  recognitionStatus={recognitionStatus}
                  isTranslating={isTranslating}
                  onClearTranslation={handleClearTranslation}
                  onSpeakText={handleSpeakText}
                  onRetryTranslation={() => processFrameSequence(true)}
                  onOpenDiagnostics={() => setShowDiagnosticsModal(true)}
                />
              </div>
            </div>

            {/* Translation Session History */}
            <div className="w-full">
              <TranslationHistory
                history={history}
                onClearHistory={handleClearHistory}
                onDeleteItem={handleDeleteHistoryItem}
                onSpeakItem={handleSpeakText}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-850 bg-slate-950/80 py-6 px-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">ASL Translate</span>
            <span>•</span>
            <span>AI Multimodal Vision for American Sign Language</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowPrivacyModal(true)}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Privacy & Disclaimer
            </button>
            <button
              onClick={() => setShowReferenceModal(true)}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Sign Reference
            </button>
            <button
              onClick={() => setShowPermissionGuideModal(true)}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Camera Help
            </button>
            <button
              onClick={() => setShowDiagnosticsModal(true)}
              className="text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer font-medium"
            >
              Diagnostics
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ASLReferenceModal
        isOpen={showReferenceModal}
        onClose={() => setShowReferenceModal(false)}
      />

      <PermissionGuideModal
        isOpen={showPermissionGuideModal}
        onClose={() => setShowPermissionGuideModal(false)}
        onRetry={() => {
          setShowPermissionGuideModal(false);
          startCamera();
        }}
      />

      <PrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />

      <DiagnosticsModal
        isOpen={showDiagnosticsModal}
        onClose={() => setShowDiagnosticsModal(false)}
        appState={appState}
        serverHealth={serverHealth}
      />
    </div>
  );
}
