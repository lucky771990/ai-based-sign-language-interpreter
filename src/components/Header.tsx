import React from 'react';
import { CameraPermissionState, AppState, SignLanguage, SigningMode } from '../types';
import {
  Hand,
  Volume2,
  VolumeX,
  BookOpen,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  Camera,
  CameraOff,
  Activity,
  Terminal,
  Brain,
  Award,
  MessageSquare,
  Power,
} from 'lucide-react';

export type AppStudioSection = 'sentence' | 'vocabulary';

interface HeaderProps {
  cameraPermission: CameraPermissionState;
  appState?: AppState;
  isTranslating: boolean;
  autoSpeak: boolean;
  signLanguage: SignLanguage;
  signingMode: SigningMode;
  activeSection?: AppStudioSection;
  onSelectSection?: (section: AppStudioSection) => void;
  onStopCamera?: () => void;
  onSelectLanguage: (lang: SignLanguage) => void;
  onToggleSigningMode: () => void;
  onToggleAutoSpeak: () => void;
  onOpenReference: () => void;
  onOpenPermissionGuide: () => void;
  onOpenPrivacy: () => void;
  onOpenDiagnostics?: () => void;
  onOpenDebugPanel?: () => void;
  onOpenCorrectionModal?: () => void;
  onOpenEvaluationModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cameraPermission,
  appState,
  isTranslating,
  autoSpeak,
  signLanguage,
  signingMode,
  activeSection = 'sentence',
  onSelectSection,
  onStopCamera,
  onSelectLanguage,
  onToggleSigningMode,
  onToggleAutoSpeak,
  onOpenReference,
  onOpenPermissionGuide,
  onOpenPrivacy,
  onOpenDiagnostics,
  onOpenDebugPanel,
  onOpenCorrectionModal,
  onOpenEvaluationModal,
}) => {
  const getStatusBadge = () => {
    switch (cameraPermission) {
      case 'granted':
        return (
          <div className="flex items-center gap-2">
            <div
              id="status-badge-active"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-medium backdrop-blur-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Active {isTranslating ? '• Translating' : '• Ready'}</span>
            </div>

            {onStopCamera && (
              <button
                id="header-turn-off-camera-btn"
                onClick={onStopCamera}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-rose-950/90 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-200 text-xs font-semibold transition-all shadow-sm cursor-pointer"
                title="Turn off video camera"
              >
                <CameraOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Turn Off Camera</span>
              </button>
            )}
          </div>
        );
      case 'requesting':
        return (
          <div
            id="status-badge-requesting"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/80 border border-amber-500/30 text-amber-300 text-xs font-medium backdrop-blur-sm"
          >
            <span className="animate-spin h-2 w-2 border-2 border-amber-400 border-t-transparent rounded-full"></span>
            <span>Requesting Permission...</span>
          </div>
        );
      case 'simulated':
        return (
          <div
            id="status-badge-simulated"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-medium backdrop-blur-sm shadow-sm"
          >
            <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse"></span>
            <span>Demo Simulation Mode</span>
            {onStopCamera && (
              <button
                id="header-stop-sim-button"
                onClick={onStopCamera}
                className="ml-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Stop Simulation"
              >
                <Power className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      case 'denied':
      case 'blocked':
        return (
          <button
            id="status-badge-denied"
            onClick={onOpenPermissionGuide}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-medium backdrop-blur-sm hover:bg-rose-900/80 transition-colors"
          >
            <CameraOff className="w-3.5 h-3.5 text-rose-400" />
            <span>Permission Denied (Fix)</span>
          </button>
        );
      default:
        return (
          <div
            id="status-badge-off"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-400 text-xs font-medium"
          >
            <span className="h-2 w-2 rounded-full bg-slate-500"></span>
            <span>Camera Off</span>
          </div>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Hand className="w-5 h-5 text-indigo-400 transform -rotate-12" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                SignBridge
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Multi-Stage AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {signLanguage} Real-Time Temporal Sign-to-Text
            </p>
          </div>
        </div>

        {/* Dedicated Section Navigation Tabs */}
        {onSelectSection && (
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              id="nav-section-sentence"
              onClick={() => onSelectSection('sentence')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSection === 'sentence'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Dedicated Sentence Translation Studio"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Sentence Studio</span>
            </button>

            <button
              id="nav-section-vocabulary"
              onClick={() => onSelectSection('vocabulary')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSection === 'vocabulary'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Single Sign Vocabulary & Handshape Reference"
            >
              <Hand className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Signs & Vocab</span>
            </button>
          </div>
        )}

        {/* Language & Signing Mode Controls */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <select
            id="select-sign-language"
            value={signLanguage}
            onChange={(e) => onSelectLanguage(e.target.value as SignLanguage)}
            className="bg-slate-950 border border-slate-800 text-xs font-bold text-indigo-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            title="Select Sign Language System"
          >
            <option value="ASL">ASL (American)</option>
            <option value="ISL">ISL (International/Indian)</option>
            <option value="BSL">BSL (British)</option>
          </select>

          <button
            id="toggle-signing-mode-button"
            onClick={onToggleSigningMode}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              signingMode === 'continuous'
                ? 'bg-indigo-600/30 border-indigo-500/40 text-indigo-200 font-semibold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle between Continuous signing stream and Isolated single sign mode"
          >
            {signingMode === 'continuous' ? 'Continuous' : 'Isolated'}
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Status badge for larger displays */}
          <div className="hidden xl:flex items-center mr-1">
            {getStatusBadge()}
          </div>

          {/* Test & Evaluation Suite Button */}
          {onOpenEvaluationModal && (
            <button
              id="open-evaluation-button"
              onClick={onOpenEvaluationModal}
              className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="Test Scenarios & Accuracy Benchmarks"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Benchmarks</span>
            </button>
          )}

          {/* User Correction & Learning Loop Button */}
          {onOpenCorrectionModal && (
            <button
              id="open-correction-modal-header-button"
              onClick={onOpenCorrectionModal}
              className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="Teach/Correct Signs in Session"
            >
              <Brain className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Corrections</span>
            </button>
          )}

          {/* Developer & Pipeline Diagnostics Button */}
          {onOpenDebugPanel && (
            <button
              id="open-developer-debug-button"
              onClick={onOpenDebugPanel}
              className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-indigo-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="Open Developer Pipeline Diagnostics & Telemetry"
            >
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span className="hidden lg:inline">Diagnostics</span>
            </button>
          )}

          {/* Auto Speech TTS Toggle */}
          <button
            id="toggle-speech-button"
            onClick={onToggleAutoSpeak}
            aria-label={autoSpeak ? 'Disable speech output' : 'Enable speech output'}
            title={autoSpeak ? 'Voice speech enabled' : 'Voice speech disabled'}
            className={`p-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border cursor-pointer ${
              autoSpeak
                ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300 shadow-sm shadow-indigo-500/10'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {autoSpeak ? (
              <>
                <Volume2 className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline text-xs">Speech On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline text-xs">Speech Off</span>
              </>
            )}
          </button>

          {/* Sign Reference Cheat Sheet */}
          <button
            id="open-reference-button"
            onClick={onOpenReference}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="Sign Language Reference & Dictionary"
          >
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span className="hidden lg:inline">Guide</span>
          </button>
        </div>
      </div>
    </header>
  );
};
