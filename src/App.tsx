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
  ServerHealthStatus,
  ActiveSentence,
  ActiveSentenceWord,
  SignLanguage,
  SigningMode,
  HandFeatureTelemetry,
  SignSegmentEvent,
  SentenceSpeedMode,
  CNNFeatureTensor,
} from './types';
import { aslRecognitionService, getApiBaseUrl } from './services/aslRecognitionService';
import { speechService } from './services/speechService';
import { temporalVisionTracker } from './services/temporalVisionTracker';
import { languageContextEngine } from './services/languageContextEngine';
import { cnnSentenceEngine } from './services/cnnSentenceEngine';
import { Header } from './components/Header';
import { LandingHero } from './components/LandingHero';
import { CameraPanel } from './components/CameraPanel';
import { TranslationPanel } from './components/TranslationPanel';
import { TranslationHistory } from './components/TranslationHistory';
import { ActiveSentenceArea } from './components/ActiveSentenceArea';
import { QuickSentencesBar } from './components/QuickSentencesBar';
import { SentenceTranslationStudio } from './components/SentenceTranslationStudio';
import { ASLReferenceModal } from './components/ASLReferenceModal';
import { PermissionGuideModal } from './components/PermissionGuideModal';
import { PrivacyModal } from './components/PrivacyModal';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { DeveloperDebugPanel } from './components/DeveloperDebugPanel';
import { CorrectionModal } from './components/CorrectionModal';
import { EvaluationSuiteModal } from './components/EvaluationSuiteModal';
import { ConfigBanner } from './components/ConfigBanner';
import { Sparkles, ShieldCheck, Heart, Volume2, Hand, MessageSquare } from 'lucide-react';

/**
 * Format an array of single words into a clean, punctuated English sentence
 * using LanguageContextEngine rule-based grammar synthesis.
 */
function assembleSentence(words: (ActiveSentenceWord | string)[], isComplete = false): string {
  if (!words || words.length === 0) return '';
  const wordObjs: ActiveSentenceWord[] = words.map((w, idx) => {
    if (typeof w === 'string') {
      return { id: `w-${idx}`, word: w, timestamp: Date.now() };
    }
    return w;
  });
  const synth = languageContextEngine.synthesizeGrammarSentence(wordObjs);
  return synth.finalTranslation;
}

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

  // Active Sentence Grouping State
  const [activeSentence, setActiveSentence] = useState<ActiveSentence>({
    words: [],
    sentenceText: '',
    lastWordTimestamp: null,
    isComplete: false,
  });
  const [sentenceWindowMs, setSentenceWindowMs] = useState<number>(5000);
  const [sentenceTimeRemainingMs, setSentenceTimeRemainingMs] = useState<number>(0);
  const [inStudioView, setInStudioView] = useState<boolean>(false);

  // Server health state
  const [serverHealth, setServerHealth] = useState<ServerHealthStatus>({
    status: 'ready',
    geminiConfigured: true,
    model: 'gemini-3.8-flash',
  });

  // Dedicated Section Mode: 'sentence' (Focused Sentence Translation) vs 'vocabulary' (Single Signs & Reference)
  const [activeSection, setActiveSection] = useState<'sentence' | 'vocabulary'>('sentence');
  const [sentenceSpeedMode, setSentenceSpeedMode] = useState<SentenceSpeedMode>('turbo');

  // Multi-Stage Pipeline & Sign Language Configuration
  const [signLanguage, setSignLanguage] = useState<SignLanguage>('ASL');
  const [signingMode, setSigningMode] = useState<SigningMode>('continuous');
  const [telemetry, setTelemetry] = useState<HandFeatureTelemetry>(temporalVisionTracker.getTelemetry());
  const [cnnTelemetry, setCnnTelemetry] = useState<CNNFeatureTensor | null>(null);
  const [cnnEnabled, setCnnEnabled] = useState<boolean>(true);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showDebugOverlay, setShowDebugOverlay] = useState<boolean>(true);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState<boolean>(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState<boolean>(false);

  // Settings (tuned for ultra-fast response and smart fallback)
  const [settings, setSettings] = useState<CameraSettings>({
    mirrored: true,
    deviceId: '',
    autoSpeak: false,
    continuousMode: true,
    sampleIntervalMs: 500,
    confidenceThreshold: 0.60,
    smartAutoTranslateWeirdSigns: true,
    fastMode: true,
  });

  const [lastAutoTranslatedText, setLastAutoTranslatedText] = useState<string | null>(null);

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
          model: 'gemini-3.8-flash',
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
    temporalVisionTracker.stop();
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

  // Synchronize temporal vision tracker lifecycle with active camera stream
  useEffect(() => {
    if (cameraPermission === 'granted' && videoRef.current) {
      // Ensure video element has active stream attached
      if (streamRef.current && videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch((err) => {
          console.warn('Vision tracker video play note:', err);
        });
      }

      temporalVisionTracker.start(
        videoRef.current,
        (updatedTelemetry) => {
          setTelemetry(updatedTelemetry);
          if (showDebugOverlay && overlayCanvasRef.current) {
            temporalVisionTracker.renderOverlay(overlayCanvasRef.current);
          }
        },
        (segmentEvent: SignSegmentEvent) => {
          // Continuous signing segmentation event
          if (segmentEvent.phase === 'STROKE' || segmentEvent.phase === 'HOLD') {
            // High motion velocity or hold boundary
          }
        }
      );
    } else {
      temporalVisionTracker.stop();
    }
    return () => {
      temporalVisionTracker.stop();
    };
  }, [cameraPermission, showDebugOverlay, activeSection]);

  // Keep active video element synced across mode switches (Sentence Studio <-> Vocabulary)
  useEffect(() => {
    if (cameraPermission === 'granted' && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch((err) => {
        console.warn('Stream sync auto-play note:', err);
      });
    }
  }, [cameraPermission, activeSection]);

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

      const bindAndPlay = async () => {
        if (videoRef.current) {
          if (videoRef.current.srcObject !== stream) {
            videoRef.current.srcObject = stream;
          }
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn('Video play note:', playErr);
          }
        }
      };

      await bindAndPlay();

      setCameraPermission('granted');
      setIsTranslating(true);
      setAppState('TRANSLATING');
      refreshDevices();

      // Secondary check to guarantee stream is playing after React re-renders
      setTimeout(() => {
        bindAndPlay();
      }, 50);
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
   * Handle incoming single-word translation and automatically group into
   * an active sentence if received within the short time window.
   */
  const handleIncomingSingleWord = useCallback(
    (word: string, gloss?: string) => {
      const now = Date.now();

      setActiveSentence((prev) => {
        const timeDiff = prev.lastWordTimestamp ? now - prev.lastWordTimestamp : Infinity;

        // Deduplication guard: ignore identical word if within 1.5s to prevent duplicate frame capture of same held sign
        const lastWord = prev.words[prev.words.length - 1];
        if (lastWord && timeDiff < 1500 && lastWord.word.toLowerCase() === word.toLowerCase()) {
          return prev;
        }

        // If within the time window and not explicitly completed, append word
        if (timeDiff <= sentenceWindowMs && prev.words.length > 0 && !prev.isComplete) {
          const updatedWords: ActiveSentenceWord[] = [
            ...prev.words,
            {
              id: `w-${now}-${Math.random().toString(36).slice(2, 6)}`,
              word,
              gloss,
              timestamp: now,
            },
          ];
          const rawGlosses = updatedWords.map((w) => w.gloss || w.word.toUpperCase());
          const grammarResult = languageContextEngine.synthesizeGrammarSentence(updatedWords);
          return {
            words: updatedWords,
            rawGlossSequence: rawGlosses,
            synthesizedSentence: grammarResult.finalTranslation,
            sentenceText: grammarResult.finalTranslation,
            lastWordTimestamp: now,
            isComplete: false,
          };
        }

        // Otherwise start fresh active sentence with this single word
        const newWords: ActiveSentenceWord[] = [
          {
            id: `w-${now}-${Math.random().toString(36).slice(2, 6)}`,
            word,
            gloss,
            timestamp: now,
          },
        ];
        const rawGlosses = [gloss || word.toUpperCase()];
        const grammarResult = languageContextEngine.synthesizeGrammarSentence(newWords);
        return {
          words: newWords,
          rawGlossSequence: rawGlosses,
          synthesizedSentence: grammarResult.finalTranslation,
          sentenceText: grammarResult.finalTranslation,
          lastWordTimestamp: now,
          isComplete: false,
        };
      });
    },
    [sentenceWindowMs]
  );

  /**
   * Active sentence time window countdown and auto-completion
   */
  useEffect(() => {
    if (activeSentence.words.length === 0 || activeSentence.isComplete || !activeSentence.lastWordTimestamp) {
      setSentenceTimeRemainingMs(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - (activeSentence.lastWordTimestamp || 0);
      const remaining = Math.max(0, sentenceWindowMs - elapsed);
      setSentenceTimeRemainingMs(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        setActiveSentence((prev) => {
          if (prev.isComplete || prev.words.length === 0) return prev;
          const grammarResult = languageContextEngine.synthesizeGrammarSentence(prev.words);
          const completeSentence = grammarResult.finalTranslation;

          // If there are 2 or more words in the completed sentence, record it to session history
          if (prev.words.length >= 2) {
            const now = new Date();
            const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const historyItem: TranslationHistoryItem = {
              id: `sentence-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: Date.now(),
              formattedTime,
              recognized_signs: prev.words.map((w) => w.gloss || w.word),
              english_translation: completeSentence,
              confidence: 0.95,
              is_reliable: true,
              is_sentence: true,
            };
            setHistory((hist) => [historyItem, ...hist]);

            // Auto speak full sentence if autoSpeak is enabled
            if (settings.autoSpeak) {
              speechService.speak(completeSentence);
            }
          }

          return {
            ...prev,
            sentenceText: completeSentence,
            synthesizedSentence: completeSentence,
            isComplete: true,
          };
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [
    activeSentence.lastWordTimestamp,
    activeSentence.isComplete,
    activeSentence.words.length,
    sentenceWindowMs,
    settings.autoSpeak,
  ]);

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

      setRecognitionStatus('capturing');

      try {
        // Dynamically tune capture resolution and temporal sample count for highest accuracy
        let frameCount = 2;
        let delayMs = 45;
        let maxWidth = 512;
        let quality = 0.80;

        if (activeSection === 'sentence') {
          if (sentenceSpeedMode === 'precision') {
            frameCount = 2;
            delayMs = 60;
            maxWidth = 640;
            quality = 0.85;
          } else if (sentenceSpeedMode === 'balanced') {
            frameCount = 2;
            delayMs = 45;
            maxWidth = 512;
            quality = 0.80;
          } else {
            frameCount = 1;
            delayMs = 35;
            maxWidth = 420;
            quality = 0.74;
          }
        } else {
          frameCount = settings.fastMode ? 1 : 2;
          maxWidth = settings.fastMode ? 420 : 512;
          quality = settings.fastMode ? 0.75 : 0.82;
        }

        const frames = await aslRecognitionService.captureTemporalSequence(
          videoRef.current,
          frameCount,
          delayMs,
          maxWidth,
          quality
        );

        if (!frames || frames.length === 0) {
          setRecognitionStatus('idle');
          return;
        }

        setRecognitionStatus('analyzing');

        const currentTelemetry = temporalVisionTracker.getTelemetry();

        // Branch 1: Dedicated High-Speed Sentence Translation Stream
        if (activeSection === 'sentence') {
          const cnnFeatures =
            cnnEnabled && videoRef.current
              ? cnnSentenceEngine.processFrame(videoRef.current)
              : undefined;

          if (cnnFeatures) {
            setCnnTelemetry(cnnFeatures);
          }

          const existingGlosses = activeSentence.words.map((w) => w.gloss || w.word.toUpperCase());
          const sentenceResult = await aslRecognitionService.translateSentenceStream(
            frames,
            existingGlosses,
            signLanguage,
            currentTelemetry,
            sentenceSpeedMode,
            cnnFeatures
          );

          if (sentenceResult.cnn_features) {
            setCnnTelemetry(sentenceResult.cnn_features);
          }

          if (sentenceResult.new_gloss && sentenceResult.new_gloss !== 'NONE') {
            const cleanWord = sentenceResult.english_word || sentenceResult.new_gloss.toLowerCase();
            const newWordObj: ActiveSentenceWord = {
              id: `sw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              word: cleanWord,
              gloss: sentenceResult.new_gloss,
              confidence: sentenceResult.confidence,
              timestamp: Date.now(),
            };

            setVisualFlash(true);
            setTimeout(() => setVisualFlash(false), 250);

            setActiveSentence((prev) => {
              const updatedWords = [...prev.words, newWordObj];
              const updatedGlosses = updatedWords.map((w) => w.gloss || w.word.toUpperCase());
              return {
                words: updatedWords,
                sentenceText: sentenceResult.synthesized_sentence || prev.sentenceText,
                synthesizedSentence: sentenceResult.synthesized_sentence,
                rawGlossSequence: updatedGlosses,
                lastWordTimestamp: Date.now(),
                isComplete: false,
              };
            });
            setRecognitionStatus('success');
          } else if (sentenceResult.synthesized_sentence && activeSentence.words.length > 0) {
            setActiveSentence((prev) => ({
              ...prev,
              sentenceText: sentenceResult.synthesized_sentence,
              synthesizedSentence: sentenceResult.synthesized_sentence,
            }));
            setRecognitionStatus('idle');
          } else {
            setRecognitionStatus('idle');
          }
          return;
        }

        // Branch 2: Standard Single Sign / Vocabulary Translation Flow
        const recentHistorySigns = history.slice(-3).map((h) => h.recognized_signs?.[0] || h.english_translation);
        const result = await aslRecognitionService.translateFrames(
          frames,
          recentHistorySigns,
          isManualTrigger ? 'single_sign' : signingMode,
          signLanguage,
          currentTelemetry
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
          // Continuous signing deduplication guard: avoid spitting duplicate words while the user holds a sign
          if (!isManualTrigger && aslRecognitionService.shouldDebounceSign(result.recognized_sign, 1500)) {
            setRecognitionStatus('idle');
            return;
          }

          setRecognitionStatus('success');

          // Flash UI for deaf/HOH accessibility
          setVisualFlash(true);
          setTimeout(() => setVisualFlash(false), 320);

          if (result.is_auto_translated) {
            setLastAutoTranslatedText(result.english_translation);
          }

          // Check if this translation is a single word to group into active sentence
          const rawTranslation = result.english_translation.trim();
          const cleanWord = rawTranslation.replace(/[.,!?;:]+$/, '').trim();
          const wordsInResult = cleanWord.split(/\s+/).filter(Boolean);
          const isSingleWord = wordsInResult.length === 1;

          if (isSingleWord && cleanWord.length > 0) {
            handleIncomingSingleWord(cleanWord, result.recognized_sign);
          } else if (result.is_sentence || result.is_auto_translated || wordsInResult.length > 1) {
            // Whole sentence recognized or auto-translated: update active sentence area directly
            setActiveSentence({
              words: wordsInResult.map((w, idx) => ({
                id: `w-${Date.now()}-${idx}`,
                word: w,
                timestamp: Date.now(),
              })),
              sentenceText: rawTranslation,
              lastWordTimestamp: Date.now(),
              isComplete: true,
            });
          }

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
            is_sentence: result.is_sentence || !isSingleWord,
            is_auto_translated: result.is_auto_translated,
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
    [
      cameraPermission,
      history,
      settings.autoSpeak,
      settings.fastMode,
      settings.smartAutoTranslateWeirdSigns,
      handleIncomingSingleWord,
      signingMode,
      signLanguage,
      activeSection,
      sentenceSpeedMode,
      activeSentence.words,
    ]
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

  const handleClearActiveSentence = useCallback(() => {
    setActiveSentence({
      words: [],
      sentenceText: '',
      lastWordTimestamp: null,
      isComplete: false,
    });
    setSentenceTimeRemainingMs(0);
  }, []);

  const handleCompleteActiveSentence = useCallback(() => {
    setActiveSentence((prev) => {
      if (prev.words.length === 0) return prev;
      const completeSentence = assembleSentence(prev.words.map((w) => w.word), true);
      if (completeSentence) {
        languageContextEngine.addConversationHistory(completeSentence);
      }
      if (prev.words.length >= 2) {
        const now = new Date();
        const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const historyItem: TranslationHistoryItem = {
          id: `sentence-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          formattedTime,
          recognized_signs: prev.words.map((w) => w.gloss || w.word),
          english_translation: completeSentence,
          confidence: 0.95,
          is_reliable: true,
          is_sentence: true,
        };
        setHistory((hist) => [historyItem, ...hist]);
      }
      return {
        ...prev,
        sentenceText: completeSentence,
        isComplete: true,
      };
    });
    setSentenceTimeRemainingMs(0);
  }, []);

  const handleRemoveActiveSentenceWord = useCallback((id: string) => {
    setActiveSentence((prev) => {
      const updated = prev.words.filter((w) => w.id !== id);
      if (updated.length === 0) {
        return {
          words: [],
          sentenceText: '',
          lastWordTimestamp: null,
          isComplete: false,
        };
      }
      return {
        ...prev,
        words: updated,
        sentenceText: assembleSentence(updated.map((w) => w.word), prev.isComplete),
      };
    });
  }, []);

  const handleChangeSentenceWindow = useCallback((windowMs: number) => {
    setSentenceWindowMs(windowMs);
  }, []);

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSpeakText = (text: string) => {
    speechService.speak(text);
  };

  const handleToggleAutoTranslateWeirdSigns = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      smartAutoTranslateWeirdSigns: !prev.smartAutoTranslateWeirdSigns,
    }));
  }, []);

  const handleToggleFastMode = useCallback(() => {
    setSettings((prev) => {
      const nextFast = !prev.fastMode;
      return {
        ...prev,
        fastMode: nextFast,
        sampleIntervalMs: nextFast ? 500 : 1000,
      };
    });
  }, []);

  const handleSelectQuickSentence = useCallback(
    (sentence: string, gloss: string) => {
      // 1. Speak if autoSpeak or requested
      if (settings.autoSpeak) {
        speechService.speak(sentence);
      }

      // 2. Visual flash feedback
      setVisualFlash(true);
      setTimeout(() => setVisualFlash(false), 300);

      // 3. Set current result so TranslationPanel immediately displays the sentence
      const resultItem: ASLRecognitionResult = {
        recognized_sign: gloss,
        recognized_signs: [gloss],
        english_translation: sentence,
        confidence: 0.96,
        is_reliable: true,
        is_sentence: true,
        is_auto_translated: true,
        timestamp: Date.now(),
      };
      setCurrentResult(resultItem);
      setRecognitionStatus('success');

      // 4. Update active sentence area
      const words = sentence.replace(/[.,!?;:]+$/, '').split(/\s+/).filter(Boolean);
      setActiveSentence({
        words: words.map((w, i) => ({
          id: `qw-${Date.now()}-${i}`,
          word: w,
          timestamp: Date.now(),
        })),
        sentenceText: sentence,
        lastWordTimestamp: Date.now(),
        isComplete: true,
      });

      // 5. Add to session history
      const now = new Date();
      const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const historyItem: TranslationHistoryItem = {
        id: `quick-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        formattedTime,
        recognized_signs: [gloss],
        english_translation: sentence,
        confidence: 0.96,
        is_reliable: true,
        is_sentence: true,
        is_auto_translated: true,
      };
      setHistory((prev) => [historyItem, ...prev]);
      setLastAutoTranslatedText(sentence);
    },
    [settings.autoSpeak]
  );

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
        signLanguage={signLanguage}
        signingMode={signingMode}
        activeSection={activeSection}
        onSelectSection={(section) => {
          setActiveSection(section);
          setInStudioView(true);
        }}
        onStopCamera={handleStopAll}
        onSelectLanguage={setSignLanguage}
        onToggleSigningMode={() =>
          setSigningMode((prev) => (prev === 'continuous' ? 'isolated' : 'continuous'))
        }
        onToggleAutoSpeak={handleToggleAutoSpeak}
        onOpenReference={() => setShowReferenceModal(true)}
        onOpenPermissionGuide={() => setShowPermissionGuideModal(true)}
        onOpenPrivacy={() => setShowPrivacyModal(true)}
        onOpenDiagnostics={() => setShowDiagnosticsModal(true)}
        onOpenDebugPanel={() => setShowDebugPanel((prev) => !prev)}
        onOpenCorrectionModal={() => setShowCorrectionModal(true)}
        onOpenEvaluationModal={() => setShowEvaluationModal(true)}
      />

      {/* Main Body View */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {cameraPermission === 'unrequested' && !inStudioView ? (
          /* Landing Screen before camera is requested */
          <LandingHero
            onStartCamera={() => startCamera()}
            onOpenReference={() => setShowReferenceModal(true)}
            onOpenHowItWorks={() => {
              const el = document.getElementById('how-it-works-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            onOpenPermissionGuide={() => setShowPermissionGuideModal(true)}
            onEnterStudioWithoutCamera={() => setInStudioView(true)}
            isRequesting={cameraPermission === 'requesting'}
            cameraPermission={cameraPermission}
            permissionError={permissionError}
          />
        ) : (
          /* Main Interactive Studio Screen */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Dedicated Mode Switcher Header Bar */}
            <div className="flex items-center justify-between gap-3 p-2 bg-slate-900/90 rounded-2xl border border-slate-800 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  id="tab-sentence-studio"
                  onClick={() => setActiveSection('sentence')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeSection === 'sentence'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sentence Translation Section (Fast & Accurate)</span>
                </button>

                <button
                  id="tab-vocabulary-studio"
                  onClick={() => setActiveSection('vocabulary')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeSection === 'vocabulary'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Hand className="w-3.5 h-3.5" />
                  <span>Signs & Vocabulary Dictionary</span>
                </button>
              </div>

              <div className="text-xs text-slate-400 hidden md:block">
                {activeSection === 'sentence'
                  ? '⚡ Laser-focused on continuous signing, fluent grammar & pause detection'
                  : '📖 Single sign vocabulary, handshape reference & dictionary lookup'}
              </div>
            </div>

            {/* Developer Pipeline Diagnostics Collapsible Panel */}
            <DeveloperDebugPanel
              isOpen={showDebugPanel}
              onClose={() => setShowDebugPanel(false)}
              telemetry={telemetry}
              cnnTelemetry={cnnTelemetry}
              currentResult={currentResult}
              activeSequenceGlosses={activeSentence.rawGlossSequence || activeSentence.words.map((w) => w.gloss || w.word)}
              grammarSentence={activeSentence.synthesizedSentence || activeSentence.sentenceText}
              finalTranslation={activeSentence.sentenceText}
              signingMode={signingMode}
              signLanguage={signLanguage}
              showDebugOverlay={showDebugOverlay}
              onToggleDebugOverlay={setShowDebugOverlay}
              onModeToggle={() =>
                setSigningMode((prev) => (prev === 'continuous' ? 'isolated' : 'continuous'))
              }
            />

            {/* Render Selected Studio Section */}
            {activeSection === 'sentence' ? (
              /* DEDICATED SENTENCE TRANSLATION STUDIO */
              <SentenceTranslationStudio
                videoRef={videoRef}
                overlayCanvasRef={overlayCanvasRef}
                showDebugOverlay={showDebugOverlay}
                cameraPermission={cameraPermission}
                permissionError={permissionError}
                isTranslating={isTranslating}
                recognitionStatus={recognitionStatus}
                activeSentence={activeSentence}
                telemetry={telemetry}
                cnnTelemetry={cnnTelemetry}
                cnnEnabled={cnnEnabled}
                onToggleCnn={() => setCnnEnabled((prev) => !prev)}
                signLanguage={signLanguage}
                settings={settings}
                sentenceHistory={history}
                timeRemainingMs={sentenceTimeRemainingMs}
                timeWindowMs={sentenceWindowMs}
                onStartCamera={() => startCamera()}
                onStopCamera={handleStopAll}
                onToggleTranslation={handleToggleTranslation}
                onClearSentence={handleClearActiveSentence}
                onCompleteSentence={handleCompleteActiveSentence}
                onRemoveWord={handleRemoveActiveSentenceWord}
                onSpeakSentence={handleSpeakText}
                onChangeSpeedMode={setSentenceSpeedMode}
                currentSpeedMode={sentenceSpeedMode}
                onChangeSentenceWindow={handleChangeSentenceWindow}
                onOpenCorrectionModal={() => setShowCorrectionModal(true)}
                onOpenPermissionGuide={() => setShowPermissionGuideModal(true)}
                onSelectQuickSentence={handleSelectQuickSentence}
                onDeleteHistoryItem={handleDeleteHistoryItem}
                onClearHistory={handleClearHistory}
              />
            ) : (
              /* SINGLE SIGNS & VOCABULARY REFERENCE VIEW */
              <div className="space-y-6">
                {/* Top Workspace Grid: Camera Panel & Translation Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Camera Viewport (7 cols on lg) */}
                  <div className="lg:col-span-7 w-full">
                    <CameraPanel
                      videoRef={videoRef}
                      overlayCanvasRef={overlayCanvasRef}
                      showDebugOverlay={showDebugOverlay}
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
                      onOpenPermissionGuide={() => setShowPermissionGuideModal(true)}
                      visualFlash={visualFlash}
                    />
                  </div>

                  {/* Right Column: Active Sentence & English Translation (5 cols on lg) */}
                  <div className="lg:col-span-5 w-full space-y-6">
                    {/* Active Sentence Area */}
                    <ActiveSentenceArea
                      activeSentence={activeSentence}
                      timeRemainingMs={sentenceTimeRemainingMs}
                      timeWindowMs={sentenceWindowMs}
                      onChangeTimeWindow={handleChangeSentenceWindow}
                      onClearSentence={handleClearActiveSentence}
                      onCompleteSentence={handleCompleteActiveSentence}
                      onRemoveWord={handleRemoveActiveSentenceWord}
                      onSpeakSentence={handleSpeakText}
                      rawGlosses={activeSentence.rawGlossSequence}
                      onOpenCorrectionModal={() => setShowCorrectionModal(true)}
                    />

                    {/* English Translation Display */}
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

                {/* Quick Conversational Sentences & Smart Auto-Mapping Bar */}
                <div className="w-full">
                  <QuickSentencesBar
                    autoTranslateWeirdSigns={settings.smartAutoTranslateWeirdSigns !== false}
                    onToggleAutoTranslateWeirdSigns={handleToggleAutoTranslateWeirdSigns}
                    fastMode={Boolean(settings.fastMode)}
                    onToggleFastMode={handleToggleFastMode}
                    onSelectSentence={handleSelectQuickSentence}
                    onPhysicalPrint={() => window.print()}
                    onSpeakText={handleSpeakText}
                    lastAutoTranslatedText={lastAutoTranslatedText}
                  />
                </div>

                {/* Translation Session History */}
                <div className="w-full">
                  <TranslationHistory
                    history={history}
                    onClearHistory={handleClearHistory}
                    onDeleteItem={handleDeleteHistoryItem}
                    onSpeakItem={handleSpeakText}
                    onPrintTranscript={() => window.print()}
                  />
                </div>
              </div>
            )}
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

      {/* User Session Correction & Learning Loop Modal */}
      <CorrectionModal
        isOpen={showCorrectionModal}
        onClose={() => setShowCorrectionModal(false)}
        defaultOriginalSign={currentResult?.recognized_sign !== 'NONE' ? currentResult?.recognized_sign : ''}
        defaultCorrectedSign={currentResult?.english_translation || ''}
        onCorrectionSaved={() => {
          // Trigger visual feedback or state refresh
        }}
      />

      {/* Accuracy Evaluation Benchmark Suite */}
      <EvaluationSuiteModal
        isOpen={showEvaluationModal}
        onClose={() => setShowEvaluationModal(false)}
      />
    </div>
  );
}
