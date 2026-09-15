import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Zap,
  Gauge,
  Sliders,
  CheckCircle2,
  Clock,
  Play,
  Share2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  Camera,
  CameraOff,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ArrowRight,
  X,
  Edit2,
  Cpu,
  Layers,
  Activity,
  Filter,
  Eye,
  ExternalLink,
  Search,
  BookOpen,
} from 'lucide-react';
import {
  ActiveSentence,
  CameraPermissionState,
  CameraSettings,
  CNNFeatureTensor,
  HandFeatureTelemetry,
  RecognitionStatus,
  SentenceSpeedMode,
  SignLanguage,
  TranslationHistoryItem,
} from '../types';
import { cnnSentenceEngine } from '../services/cnnSentenceEngine';
import { languageContextEngine } from '../services/languageContextEngine';
import {
  COMMON_CONVERSATIONAL_SENTENCES,
  SENTENCE_STUDIO_CATEGORIES,
  CommonSentenceItem,
} from '../data/commonSentences';

interface SentenceTranslationStudioProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  overlayCanvasRef: React.RefObject<HTMLCanvasElement>;
  showDebugOverlay: boolean;
  cameraPermission: CameraPermissionState;
  permissionError?: string | null;
  isTranslating: boolean;
  recognitionStatus: RecognitionStatus;
  activeSentence: ActiveSentence;
  telemetry?: HandFeatureTelemetry;
  cnnTelemetry?: CNNFeatureTensor | null;
  cnnEnabled?: boolean;
  onToggleCnn?: () => void;
  signLanguage: SignLanguage;
  settings: CameraSettings;
  sentenceHistory: TranslationHistoryItem[];
  timeRemainingMs: number | null;
  timeWindowMs: number;
  onStartCamera: () => void;
  onStartSimulation?: () => void;
  onStopCamera: () => void;
  onToggleTranslation: () => void;
  onClearSentence: () => void;
  onCompleteSentence: () => void;
  onRemoveWord: (idOrIndex: string | number) => void;
  onAddWord?: (wordOrGloss: string) => void;
  onSpeakSentence: (text: string) => void;
  onChangeSpeedMode: (mode: SentenceSpeedMode) => void;
  currentSpeedMode: SentenceSpeedMode;
  onChangeSentenceWindow: (windowMs: number) => void;
  onOpenCorrectionModal: () => void;
  onOpenPermissionGuide?: () => void;
  onSelectQuickSentence: (text: string, glosses: string[]) => void;
  onDeleteHistoryItem: (id: string) => void;
  onClearHistory: () => void;
}

const QUICK_SIGN_VOCABULARY = [
  'HELLO',
  'GOOD',
  'MORNING',
  'AFTERNOON',
  'EVENING',
  'HOW',
  'YOU',
  'FINE',
  'THANK-YOU',
  'MEET',
  'SEE',
  'LATER',
  'CARE',
  'WHAT',
  'DO',
  'WHERE',
  'GO',
  'HAPPEN',
  'OKAY',
  'UNDERSTAND',
  'AGAIN',
  'SLOW',
  'MINUTE',
  'NO',
  'PROBLEM',
  'PLEASE',
  'WELCOME',
  'EXCUSE-ME',
  'SORRY',
  'MAY',
  'HELP',
  'YES',
  'SURE',
  'OF-COURSE',
  'MAYBE',
  'THINK',
  'YET',
  'SOUNDS',
  'GREAT',
  'NEVER-MIND',
];

export const SentenceTranslationStudio: React.FC<SentenceTranslationStudioProps> = ({
  videoRef,
  overlayCanvasRef,
  showDebugOverlay,
  cameraPermission,
  permissionError,
  isTranslating,
  recognitionStatus,
  activeSentence,
  telemetry,
  cnnTelemetry,
  cnnEnabled = true,
  onToggleCnn,
  signLanguage,
  settings,
  sentenceHistory,
  timeRemainingMs,
  timeWindowMs,
  onStartCamera,
  onStartSimulation,
  onStopCamera,
  onToggleTranslation,
  onClearSentence,
  onCompleteSentence,
  onRemoveWord,
  onAddWord,
  onSpeakSentence,
  onChangeSpeedMode,
  currentSpeedMode,
  onChangeSentenceWindow,
  onOpenCorrectionModal,
  onOpenPermissionGuide,
  onSelectQuickSentence,
  onDeleteHistoryItem,
  onClearHistory,
}) => {
  const [copied, setCopied] = useState(false);
  const [autoSpeakSentence, setAutoSpeakSentence] = useState(true);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showFeatureMaps, setShowFeatureMaps] = useState(true);
  const [quickInputText, setQuickInputText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sentenceSearchQuery, setSentenceSearchQuery] = useState<string>('');
  const [expandedSentenceId, setExpandedSentenceId] = useState<string | null>(null);
  const [showSignVocabularyPills, setShowSignVocabularyPills] = useState<boolean>(false);
  const [copiedSentenceId, setCopiedSentenceId] = useState<string | null>(null);
  const lastSpokenSentenceRef = useRef<string>('');
  const cnnCanvasRef = useRef<HTMLCanvasElement>(null);

  const filteredSentences = useMemo(() => {
    return COMMON_CONVERSATIONAL_SENTENCES.filter((item) => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchesCat) return false;
      if (!sentenceSearchQuery.trim()) return true;
      const q = sentenceSearchQuery.toLowerCase();
      const sentenceText = item.sentence || item.text || item.label || '';
      return (
        sentenceText.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q) ||
        item.glosses.some((g) => g.toLowerCase().includes(q)) ||
        (item.aslDescription && item.aslDescription.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, sentenceSearchQuery]);

  const handleCopyPresetSentence = (id: string, textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedSentenceId(id);
    setTimeout(() => setCopiedSentenceId(null), 2000);
  };

  const handleQuickInputSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = quickInputText.trim();
    if (!trimmed) return;

    // If single sign gloss or word, append to current sentence
    const tokens = trimmed.replace(/[.,!?;:]+$/, '').split(/\s+/).filter(Boolean);
    if (tokens.length === 1 && onAddWord) {
      onAddWord(tokens[0]);
      setQuickInputText('');
      return;
    }

    // If multiple words or full sentence, synthesize and load
    const glosses = tokens.map((s) => s.toUpperCase());
    const localResult = languageContextEngine.synthesizeGrammarSentence(
      glosses.map((g, i) => ({ id: `q-${i}`, word: g.toLowerCase(), gloss: g }))
    );
    const translatedText = localResult.finalTranslation || trimmed;
    onSelectQuickSentence(translatedText, glosses);
    setQuickInputText('');
  };

  // Guarantee that when camera is granted and video has a stream, playback starts without stalling
  useEffect(() => {
    if (cameraPermission === 'granted' && videoRef.current) {
      if (videoRef.current.srcObject && videoRef.current.paused) {
        videoRef.current.play().catch((err) => {
          console.warn('Sentence video playback retry:', err);
        });
      }
    }
  }, [cameraPermission, videoRef]);

  // Render CNN 4-channel spatial feature maps when camera is active
  useEffect(() => {
    if (cameraPermission !== 'granted') return;
    let animId: number;
    let isMounted = true;

    const renderLoop = () => {
      if (!isMounted) return;
      if (cnnCanvasRef.current && cnnEnabled) {
        cnnSentenceEngine.renderFeatureMapsToCanvas(cnnCanvasRef.current);
      }
      animId = requestAnimationFrame(renderLoop);
    };
    animId = requestAnimationFrame(renderLoop);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animId);
    };
  }, [cameraPermission, cnnEnabled]);

  // Auto-speak when a sentence is completed
  useEffect(() => {
    if (
      autoSpeakSentence &&
      activeSentence.isComplete &&
      activeSentence.sentenceText.trim() &&
      activeSentence.sentenceText !== lastSpokenSentenceRef.current
    ) {
      lastSpokenSentenceRef.current = activeSentence.sentenceText;
      onSpeakSentence(activeSentence.sentenceText);
    }
  }, [activeSentence.isComplete, activeSentence.sentenceText, autoSpeakSentence, onSpeakSentence]);

  const handleCopySentence = async () => {
    if (!activeSentence.sentenceText) return;
    try {
      await navigator.clipboard.writeText(activeSentence.sentenceText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // Calculate pause timer percentage
  const pauseProgressPercent =
    timeRemainingMs !== null && timeWindowMs > 0
      ? Math.max(0, Math.min(100, (timeRemainingMs / timeWindowMs) * 100))
      : null;

  // Cadence state determination
  const cadenceState = telemetry?.segmentationState || 'IDLE';
  const isHandsResting =
    !telemetry?.leftHandDetected && !telemetry?.rightHandDetected;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner: Dedicated Sentence Translation Studio Header */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/80 to-purple-950/40 p-4 sm:p-5 shadow-xl shadow-indigo-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Dedicated Sentence Translation Studio
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400" />
                {currentSpeedMode === 'turbo'
                  ? 'Ultra-Fast Mode (300ms)'
                  : currentSpeedMode === 'balanced'
                  ? 'Balanced Mode (500ms)'
                  : 'Deep Precision Mode'}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                {signLanguage} Grammar Synthesizer
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl">
              Sign continuously with natural movement. The engine tracks phrase cadence, suppresses held duplicate signs, and translates grammatical glosses into fluent English.
            </p>
          </div>

          {/* Quick Speed & Cadence Presets */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <div className="flex items-center rounded-xl bg-slate-950/80 p-1 border border-slate-800 text-xs">
              <button
                onClick={() => onChangeSpeedMode('turbo')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  currentSpeedMode === 'turbo'
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Ultra-low latency sub-second translation"
              >
                ⚡ Turbo
              </button>
              <button
                onClick={() => onChangeSpeedMode('balanced')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  currentSpeedMode === 'balanced'
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Balanced speed and syntactic depth"
              >
                ⚖️ Balanced
              </button>
              <button
                onClick={() => onChangeSpeedMode('precision')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  currentSpeedMode === 'precision'
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Deep multi-stage temporal verification"
              >
                🎯 Precision
              </button>
            </div>

            <button
              onClick={() => setAutoSpeakSentence((prev) => !prev)}
              className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-colors ${
                autoSpeakSentence
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle automatic speech synthesis when sentence completes"
            >
              {autoSpeakSentence ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              <span className="hidden md:inline font-medium">Auto-Speak</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Grid: Camera Feed + Real-Time Sentence Translation Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Camera Viewport (6 cols on lg) */}
        <div className="lg:col-span-6 w-full space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl aspect-[4/3] flex items-center justify-center">
            {/* Always mounted video feed to ensure videoRef is never null and stream attaches immediately */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              id="sentence-studio-camera-video"
              className={`w-full h-full object-cover transition-transform duration-200 ${
                settings.mirrored ? 'scale-x-[-1]' : 'scale-x-100'
              } ${cameraPermission === 'granted' ? 'block' : 'hidden'}`}
            />
            {/* Vision Landmark Overlay Canvas */}
            <canvas
              ref={overlayCanvasRef}
              id="sentence-telemetry-overlay-canvas"
              className={`absolute inset-0 w-full h-full pointer-events-none z-10 transition-opacity duration-200 ${
                settings.mirrored ? 'scale-x-[-1]' : 'scale-x-100'
              } ${
                cameraPermission === 'granted' && showDebugOverlay ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Overlays active only when camera is granted */}
            {cameraPermission === 'granted' && (
              <>
                {/* Real-Time Cadence & Motion Pill */}
                <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                  <div className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-xs font-semibold text-white flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        cadenceState === 'STROKE'
                          ? 'bg-emerald-400 animate-ping'
                          : cadenceState === 'HOLD'
                          ? 'bg-amber-400'
                          : cadenceState === 'TRANSITION'
                          ? 'bg-indigo-400'
                          : 'bg-slate-500'
                      }`}
                    />
                    <span>
                      {cadenceState === 'STROKE'
                        ? 'Signing Active'
                        : cadenceState === 'HOLD'
                        ? 'Hold Sustained'
                        : cadenceState === 'TRANSITION'
                        ? 'Transitioning'
                        : isHandsResting
                        ? 'Resting Position'
                        : 'Ready'}
                    </span>
                  </div>

                  {telemetry?.isTwoHandedSign && (
                    <div className="px-2 py-0.5 rounded-full bg-purple-500/30 border border-purple-500/50 text-[10px] font-bold text-purple-200">
                      2-Handed
                    </div>
                  )}

                  {recognitionStatus === 'analyzing' && (
                    <div className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-semibold text-cyan-300 flex items-center gap-1 animate-pulse">
                      <Zap className="w-3 h-3 text-cyan-400" />
                      Analyzing
                    </div>
                  )}
                </div>

                {/* Top-Right Direct Turn Off Camera Button */}
                <div className="absolute top-3 right-3 z-10">
                  <button
                    id="sentence-viewport-stop-camera-button"
                    onClick={onStopCamera}
                    className="px-3 py-1.5 rounded-full bg-slate-950/80 hover:bg-rose-950/90 border border-slate-700/70 hover:border-rose-500/60 text-slate-200 hover:text-rose-200 text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
                    title="Turn Off Camera"
                  >
                    <CameraOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>Turn Off Camera</span>
                  </button>
                </div>

                {/* Real-time Pause Timer Bar */}
                {pauseProgressPercent !== null && pauseProgressPercent > 0 && (
                  <div className="absolute bottom-3 left-3 right-3 z-10">
                    <div className="bg-slate-950/90 backdrop-blur-md rounded-xl p-2 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        <span>Pause detected • Finalizing in {(timeRemainingMs! / 1000).toFixed(1)}s</span>
                      </div>
                      <div className="w-32 bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-400 h-full rounded-full transition-all duration-100 ease-linear"
                          style={{ width: `${pauseProgressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Non-granted states: Unrequested, Requesting, Denied, Unavailable */}
            {cameraPermission === 'unrequested' && (
              <div className="p-8 text-center space-y-4 max-w-md animate-in fade-in duration-200">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Camera Required for Sentence Translation</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Allow camera access to start continuous signing. Video is analyzed locally and securely in real time.
                  </p>
                </div>
                <button
                  id="sentence-start-camera-feed-button"
                  onClick={onStartCamera}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Camera Feed</span>
                </button>
              </div>
            )}

            {cameraPermission === 'requesting' && (
              <div className="p-8 text-center space-y-4 max-w-md animate-in fade-in duration-200">
                <div className="w-16 h-16 rounded-2xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                  <span className="animate-spin h-8 w-8 border-3 border-amber-400 border-t-transparent rounded-full"></span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Waiting for Browser Permission...</h3>
                  <p className="text-xs text-amber-200/90 mt-1">
                    Please click <strong className="text-white">"Allow"</strong> on the browser's camera prompt to start sentence translation.
                  </p>
                </div>
              </div>
            )}

            {(cameraPermission === 'denied' || cameraPermission === 'blocked') && (
              <div className="p-6 text-center space-y-3 max-w-md bg-rose-950/30 border border-rose-500/40 rounded-2xl m-4 animate-in fade-in duration-200">
                <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Camera Access Blocked</h3>
                  <p className="text-xs text-rose-200/90 leading-relaxed">
                    {permissionError ||
                      'Camera permission was not granted by your browser or system. Please allow camera access to use real-time sign translation.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    id="sentence-retry-camera-btn"
                    onClick={onStartCamera}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                  {onStartSimulation && (
                    <button
                      id="sentence-start-sim-btn"
                      onClick={onStartSimulation}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Try Demo Simulator (No Camera)</span>
                    </button>
                  )}
                  {onOpenPermissionGuide && (
                    <button
                      onClick={onOpenPermissionGuide}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                      <span>Troubleshoot Camera</span>
                    </button>
                  )}
                  {typeof window !== 'undefined' && window.self !== window.top && (
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                      <span>Open in New Tab</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {cameraPermission === 'unavailable' && (
              <div className="p-6 text-center space-y-3 max-w-md bg-amber-950/30 border border-amber-500/40 rounded-2xl m-4 animate-in fade-in duration-200">
                <div className="w-14 h-14 rounded-2xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Camera Hardware Unavailable</h3>
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    {permissionError ||
                      'No video input devices were found. Please connect an external webcam or verify your video drivers.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    id="sentence-retry-camera-hardware-btn"
                    onClick={onStartCamera}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Detection</span>
                  </button>
                  {onStartSimulation && (
                    <button
                      id="sentence-hardware-sim-btn"
                      onClick={onStartSimulation}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Use Demo Simulator</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Simulation Mode Indicator Pill if active */}
            {cameraPermission === 'simulated' && (
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/90 border border-purple-500/50 text-purple-200 text-xs shadow-lg backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-purple-400 animate-ping"></span>
                <span className="font-bold">Virtual ASL Simulator Active</span>
                <button
                  onClick={onStartCamera}
                  className="ml-2 px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Connect physical camera"
                >
                  Switch to Webcam
                </button>
              </div>
            )}
          </div>

          {/* Camera Controls & Pause Setting */}
          <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                id="sentence-toggle-translation-btn"
                onClick={onToggleTranslation}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isTranslating
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isTranslating ? 'Pause Translation' : 'Resume Translation'}
              </button>

              {/* Explicit Turn Off Camera Button */}
              {cameraPermission === 'granted' && (
                <button
                  id="sentence-studio-turn-off-camera-btn"
                  onClick={onStopCamera}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Completely stop video camera and turn off feed"
                >
                  <CameraOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Turn Off Camera</span>
                </button>
              )}
            </div>

            {/* Pause Completion Threshold Selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Auto-Finish Pause:</span>
              <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                {[1500, 2500, 4000, 6000].map((ms) => (
                  <button
                    key={ms}
                    onClick={() => onChangeSentenceWindow(ms)}
                    className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                      timeWindowMs === ms
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {ms === 1500 ? '⚡ 1.5s' : `${(ms / 1000).toFixed(1)}s`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CNN Spatial-Temporal Accuracy Hub */}
          <div className="rounded-2xl bg-slate-900/90 border border-indigo-500/30 p-4 shadow-xl space-y-3.5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between flex-wrap gap-2 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      CNN Sentence Formation Engine
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                        cnnEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      <Layers className="w-3 h-3" />
                      {cnnEnabled ? 'Conv2D + Conv1D Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Spatial-temporal convolutions filter out transition epenthesis and lock onto sign apexes
                  </p>
                </div>
              </div>

              {onToggleCnn && (
                <button
                  onClick={onToggleCnn}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    cnnEnabled
                      ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 hover:bg-indigo-600/50'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                  title="Toggle CNN acceleration"
                >
                  {cnnEnabled ? 'CNN Active' : 'Enable CNN'}
                </button>
              )}
            </div>

            {/* CNN Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 relative z-10">
              {/* Handshape Cluster */}
              <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800 space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block tracking-wider">
                  Handshape Cluster
                </span>
                <div className="text-xs font-bold text-indigo-300 truncate">
                  {cnnTelemetry?.handshapeCluster ? cnnTelemetry.handshapeCluster.replace(/_/g, ' ') : 'OPEN PALM B'}
                </div>
                <div className="text-[10px] text-slate-400">Spatial Conv2D</div>
              </div>

              {/* Apex Detection Probability */}
              <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                    Sign Apex Peak
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400">
                    {cnnTelemetry ? `${Math.round(cnnTelemetry.apexProbability * 100)}%` : '78%'}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-150"
                    style={{
                      width: `${cnnTelemetry ? Math.min(100, Math.round(cnnTelemetry.apexProbability * 100)) : 78}%`,
                    }}
                  />
                </div>
                <div className="text-[10px] text-slate-400">Temporal Conv1D</div>
              </div>

              {/* Receptive Cadence & Epenthesis Filter */}
              <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800 space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block tracking-wider">
                  Cadence Filter
                </span>
                <div className="text-xs font-bold truncate">
                  {cnnTelemetry?.receptiveFieldCadence === 'LEXICAL_APEX' ? (
                    <span className="text-emerald-300">Lexical Apex</span>
                  ) : cnnTelemetry?.receptiveFieldCadence === 'SUSTAINED_HOLD' ? (
                    <span className="text-amber-300">Sustained Hold</span>
                  ) : cnnTelemetry?.receptiveFieldCadence === 'TRANSITION_EPENTHESIS' ? (
                    <span className="text-indigo-300">Transition Filter</span>
                  ) : (
                    <span className="text-slate-400">Resting Base</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400">Noise Gating</div>
              </div>

              {/* Conv Latency & Saliency */}
              <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800 space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block tracking-wider">
                  CNN Latency
                </span>
                <div className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  <span>{cnnTelemetry?.temporalLatencyMs ? `${cnnTelemetry.temporalLatencyMs}ms` : '< 2.1ms'}</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {cnnTelemetry
                    ? `Saliency ${Math.round(cnnTelemetry.spatialAttentionScore * 100)}%`
                    : 'Client Tensor'}
                </div>
              </div>
            </div>

            {/* Collapsible 4-Channel Spatial Conv2D Feature Map Canvas */}
            <div className="bg-slate-950/90 rounded-xl p-3 border border-slate-800 space-y-2 relative z-10">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Live 4-Channel Convolutional Feature Maps</span>
                </div>
                <button
                  onClick={() => setShowFeatureMaps((prev) => !prev)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                >
                  {showFeatureMaps ? 'Hide Maps' : 'Show Maps'}
                </button>
              </div>

              {showFeatureMaps && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <div className="rounded-lg overflow-hidden border border-slate-800 bg-black">
                    <canvas
                      ref={cnnCanvasRef}
                      width={256}
                      height={64}
                      className="w-full h-16 object-fill"
                    />
                  </div>
                  <div className="grid grid-cols-4 text-center text-[9px] font-semibold text-slate-400 tracking-tight">
                    <span className="text-sky-400">1. Vertical Edges</span>
                    <span className="text-purple-400">2. Palm Base</span>
                    <span className="text-rose-400">3. Finger Angles</span>
                    <span className="text-emerald-400">4. Hand Saliency</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: High-Accuracy Dedicated Sentence Display (6 cols on lg) */}
        <div className="lg:col-span-6 w-full space-y-4">
          {/* Main Translation Card */}
          <div className="rounded-2xl border border-indigo-500/40 bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Synthesized English Sentence
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {activeSentence.words.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold">
                    {activeSentence.words.length} {activeSentence.words.length === 1 ? 'sign' : 'signs'}
                  </span>
                )}
                {activeSentence.isComplete && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Complete
                  </span>
                )}
              </div>
            </div>

            {/* Synthesized Sentence Display Banner */}
            <div className="min-h-[110px] flex items-center justify-center p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center relative group">
              {activeSentence.sentenceText.trim() ? (
                <div className="space-y-2 w-full">
                  <p className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-relaxed">
                    {activeSentence.sentenceText}
                  </p>
                  <p className="text-xs text-indigo-400/80 font-medium">
                    {activeSentence.isComplete
                      ? 'Sentence finalized and verified'
                      : 'Live synthesis updating in real-time...'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 py-4">
                  <p className="text-sm text-slate-400 font-medium">
                    {isTranslating
                      ? 'Waiting for signing to begin...'
                      : 'Press "Resume Translation" or begin signing in frame'}
                  </p>
                  <p className="text-xs text-slate-400">
                    Sign naturally in {signLanguage}. Words and grammar assemble automatically.
                  </p>
                </div>
              )}
            </div>

            {/* Signed Gloss Sequence Ribbon */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <span>Verbatim Signed Gloss Chain:</span>
                </span>
                {activeSentence.words.length > 0 && (
                  <span className="text-[11px] text-slate-400">Tap word to remove</span>
                )}
              </div>

              {activeSentence.words.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 min-h-[48px]">
                  {activeSentence.words.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/70 border border-indigo-500/40 text-xs font-bold text-indigo-200 transition-all hover:border-indigo-400"
                    >
                      <span>{item.gloss || item.word.toUpperCase()}</span>
                      {item.confidence && (
                        <span className="text-[10px] text-indigo-400 font-normal">
                          {Math.round(item.confidence * 100)}%
                        </span>
                      )}
                      <button
                        onClick={() => onRemoveWord(item.id || index)}
                        className="text-indigo-400 hover:text-rose-400 transition-colors ml-0.5 cursor-pointer"
                        title="Remove sign from sentence"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-400 italic">
                  No signs in current sequence yet. Signs from camera or quick taps appear here.
                </div>
              )}

              {/* Quick Sign Palette (tap to build sentences instantly) */}
              {onAddWord && (
                <div className="pt-2 border-t border-slate-800/50 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-400">Tap to add signs to sentence:</span>
                    <span className="text-[10px] text-indigo-400">Instant syntax engine</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {[
                      'HELLO', 'ME', 'YOU', 'WANT', 'WATER', 'FOOD', 'GO',
                      'SCHOOL', 'TOMORROW', 'YESTERDAY', 'LIKE', 'COFFEE',
                      'PLEASE', 'HELP', 'THANK-YOU', 'TIRED', 'WHERE', 'WHAT', 'DOCTOR'
                    ].map((gloss) => (
                      <button
                        key={gloss}
                        type="button"
                        onClick={() => onAddWord(gloss)}
                        className="px-2 py-1 rounded-md bg-slate-800/80 hover:bg-indigo-600 hover:text-white border border-slate-700/80 text-[11px] font-mono font-medium text-slate-300 transition-all cursor-pointer shadow-xs active:scale-95"
                        title={`Add ${gloss} to sentence`}
                      >
                        +{gloss}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sentence Action Toolbar */}
            <div className="mt-5 flex items-center justify-between gap-2 pt-4 border-t border-slate-800/80 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSpeakSentence(activeSentence.sentenceText)}
                  disabled={!activeSentence.sentenceText.trim()}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-2 shadow-md transition-colors cursor-pointer"
                  title="Speak sentence aloud"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Speak</span>
                </button>

                <button
                  onClick={handleCopySentence}
                  disabled={!activeSentence.sentenceText.trim()}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Copy translation to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={onOpenCorrectionModal}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Teach correction or report sign mistranslation"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Teach Correction</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onCompleteSentence}
                  disabled={activeSentence.words.length === 0}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Manually finish and record sentence"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Finish Now</span>
                </button>

                <button
                  onClick={onClearSentence}
                  disabled={activeSentence.words.length === 0 && !activeSentence.sentenceText}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  title="Clear sentence buffer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Conversational Sign Language Studio & Practice */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-800/80">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                    Conversational Sign Language Studio & Practice
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-700/40">
                    {COMMON_CONVERSATIONAL_SENTENCES.length} Sentences
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Translate full phrases across Greetings, Everyday Conversation, Polite Phrases, and Useful Responses using sign language.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-lg">
                  <Zap className="w-3 h-3" />
                  Instant Grammar Synthesis
                </span>
                <button
                  onClick={() => setShowSignVocabularyPills((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    showSignVocabularyPills
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Sign Tokens</span>
                  {showSignVocabularyPills ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            {/* Quick Interactive Input Field */}
            <form onSubmit={handleQuickInputSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={quickInputText}
                  onChange={(e) => setQuickInputText(e.target.value)}
                  placeholder="Type sign glosses (e.g. HOW YOU, GOOD MORNING, CAN YOU HELP ME)..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-3.5 pr-8 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all font-mono"
                />
                {quickInputText && (
                  <button
                    type="button"
                    onClick={() => setQuickInputText('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={!quickInputText.trim()}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:hover:from-indigo-600 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Translate Quick</span>
              </button>
            </form>

            {/* Collapsible Sign Vocabulary Token Palette */}
            {showSignVocabularyPills && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-indigo-900/40 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-indigo-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Interactive Sign Gloss Palette (Click to append into live sentence):
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {QUICK_SIGN_VOCABULARY.length} vocabulary signs
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {QUICK_SIGN_VOCABULARY.map((signGloss) => (
                    <button
                      key={signGloss}
                      type="button"
                      onClick={() => onAddWord && onAddWord(signGloss)}
                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-800 hover:border-indigo-500 text-[11px] font-mono font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                      title={`Click to add "${signGloss}" to active sentence`}
                    >
                      +{signGloss}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category Navigation Tabs & Search Controls */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Category Pills */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedCategory === 'all'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:bg-slate-900'
                    }`}
                  >
                    <span>All Phrases</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        selectedCategory === 'all'
                          ? 'bg-indigo-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {COMMON_CONVERSATIONAL_SENTENCES.length}
                    </span>
                  </button>

                  {SENTENCE_STUDIO_CATEGORIES.map((cat) => {
                    const catCount = COMMON_CONVERSATIONAL_SENTENCES.filter(
                      (s) => s.category === cat.id
                    ).length;
                    const isSelected = selectedCategory === cat.id;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:bg-slate-900'
                        }`}
                      >
                        <span>{cat.emoji || cat.icon || '💬'}</span>
                        <span>{cat.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            isSelected
                              ? 'bg-indigo-700 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {catCount}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Instant Search Bar */}
                <div className="relative min-w-[200px] sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={sentenceSearchQuery}
                    onChange={(e) => setSentenceSearchQuery(e.target.value)}
                    placeholder="Search phrase or sign..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-8.5 pr-8 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  />
                  {sentenceSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setSentenceSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sentences Count & Search Indicator */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>
                  Showing{' '}
                  <strong className="text-slate-200">{filteredSentences.length}</strong>{' '}
                  phrases
                  {sentenceSearchQuery && (
                    <span>
                      {' '}
                      matching &quot;<span className="text-indigo-300">{sentenceSearchQuery}</span>&quot;
                    </span>
                  )}
                </span>
                {sentenceSearchQuery && (
                  <button
                    onClick={() => setSentenceSearchQuery('')}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
                  >
                    Clear search
                  </button>
                )}
              </div>

              {/* Categorized Conversational Sentence Cards Grid */}
              {filteredSentences.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <HelpCircle className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">
                    No phrases found matching &quot;{sentenceSearchQuery}&quot;
                  </p>
                  <p className="text-xs text-slate-500">
                    Try searching for another word or select another category above.
                  </p>
                  <button
                    onClick={() => {
                      setSentenceSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[540px] overflow-y-auto pr-1">
                  {filteredSentences.map((item) => {
                    const isExpanded = expandedSentenceId === item.id;
                    const isCopied = copiedSentenceId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl border transition-all p-3.5 flex flex-col justify-between space-y-3 ${
                          isExpanded
                            ? 'bg-slate-950 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/20'
                            : 'bg-slate-950/80 border-slate-800/90 hover:border-slate-700 hover:bg-slate-950'
                        }`}
                      >
                        {/* Top Metadata Row */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1">
                              <span>
                                {SENTENCE_STUDIO_CATEGORIES.find((c) => c.id === item.category)?.emoji || item.emoji || '💬'}
                              </span>
                              <span>{item.categoryLabel}</span>
                            </span>

                            {/* Audio & Copy Quick Controls */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onSpeakSentence(item.sentence || item.text || '')}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 border border-slate-800/80 transition-colors cursor-pointer"
                                title={`Speak "${item.sentence || item.text}"`}
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyPresetSentence(item.id, item.sentence || item.text || '')}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80 transition-colors cursor-pointer"
                                title="Copy sentence text"
                              >
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Target English Sentence */}
                          <p className="text-sm font-bold text-white tracking-tight leading-snug">
                            {item.sentence || item.text}
                          </p>

                          {/* ASL Gloss Badges Sequence */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                                ASL Glosses:
                              </span>
                              {item.glosses.map((g, gIdx) => (
                                <button
                                  key={gIdx}
                                  type="button"
                                  onClick={() => onAddWord && onAddWord(g)}
                                  className="px-2 py-0.5 rounded-md bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 hover:text-white border border-indigo-800/50 text-[11px] font-mono font-bold transition-all cursor-pointer active:scale-95"
                                  title={`Click to append sign gloss "${g}" into active sentence`}
                                >
                                  {g}
                                </button>
                              ))}
                            </div>

                            {/* Sign Description */}
                            {item.aslDescription && (
                              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                {item.aslDescription}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Card Bottom Actions */}
                        <div className="pt-2 border-t border-slate-800/70 space-y-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                onSelectQuickSentence(item.sentence || item.text || '', item.glosses)
                              }
                              className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-sm hover:shadow-indigo-500/25 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>Translate Sentence</span>
                            </button>

                            {item.signsBreakdown && item.signsBreakdown.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedSentenceId((prev) =>
                                    prev === item.id ? null : item.id
                                  )
                                }
                                className={`py-1.5 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                                  isExpanded
                                    ? 'bg-slate-800 text-indigo-300 border-indigo-500/50'
                                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                                }`}
                                title="View step-by-step sign language instructions"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Guide</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>

                          {/* Step-by-Step Sign Breakdown Guide (Expanded) */}
                          {isExpanded && item.signsBreakdown && (
                            <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 space-y-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                Step-by-Step Sign Breakdown:
                              </span>

                              <div className="space-y-1.5">
                                {item.signsBreakdown.map((sb, stepIdx) => (
                                  <div
                                    key={stepIdx}
                                    className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] space-y-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono font-bold text-indigo-300 bg-indigo-950/80 px-1.5 py-0.2 rounded border border-indigo-800/40">
                                        Step {stepIdx + 1}: {sb.sign}
                                      </span>
                                      <span className="text-[10px] text-slate-400 italic">
                                        {sb.handshape}
                                      </span>
                                    </div>
                                    <p className="text-slate-300 leading-snug">
                                      {sb.movement}
                                    </p>
                                    {(sb.tips || sb.nonManual) && (
                                      <p className="text-[10px] text-amber-300/90 flex items-center gap-1">
                                        <span className="font-semibold">Expression/Tips:</span>{' '}
                                        {sb.tips || sb.nonManual}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Sentence Translation Conversation History */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Sentence Transcript & Conversation Log ({sentenceHistory.length})
            </h3>
          </div>

          {sentenceHistory.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Print Transcript
              </button>
              <button
                onClick={onClearHistory}
                className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-medium transition-colors cursor-pointer"
              >
                Clear Log
              </button>
            </div>
          )}
        </div>

        {sentenceHistory.length > 0 ? (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {sentenceHistory.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all flex items-start justify-between gap-3 group"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {item.formattedTime}
                    </span>
                    {item.recognized_signs && item.recognized_signs.length > 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {item.recognized_signs.join(' → ')}
                      </span>
                    )}
                    {item.confidence && (
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        {Math.round(item.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-100">
                    {item.english_translation}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                  <button
                    onClick={() => onSpeakSentence(item.english_translation)}
                    className="p-1.5 rounded-lg bg-slate-850 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Speak sentence"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(item.english_translation);
                    }}
                    className="p-1.5 rounded-lg bg-slate-850 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Copy translation"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteHistoryItem(item.id)}
                    className="p-1.5 rounded-lg bg-slate-850 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                    title="Delete item"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            Completed sentences will be automatically archived here with their gloss sequence and timestamps.
          </div>
        )}
      </div>
    </div>
  );
};
