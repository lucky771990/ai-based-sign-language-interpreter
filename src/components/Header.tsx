import React from 'react';
import { CameraPermissionState } from '../types';
import {
  Hand,
  Volume2,
  VolumeX,
  BookOpen,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  Camera,
  CameraOff
} from 'lucide-react';

interface HeaderProps {
  cameraPermission: CameraPermissionState;
  isTranslating: boolean;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  onOpenReference: () => void;
  onOpenPermissionGuide: () => void;
  onOpenPrivacy: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cameraPermission,
  isTranslating,
  autoSpeak,
  onToggleAutoSpeak,
  onOpenReference,
  onOpenPermissionGuide,
  onOpenPrivacy,
}) => {
  const getStatusBadge = () => {
    switch (cameraPermission) {
      case 'granted':
        return (
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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
                ASL Translate
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> AI Vision
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              American Sign Language to English
            </p>
          </div>
        </div>

        {/* Middle Status indicator */}
        <div className="hidden md:flex items-center">
          {getStatusBadge()}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Status badge for mobile */}
          <div className="md:hidden">
            {getStatusBadge()}
          </div>

          {/* Auto Speech TTS Toggle */}
          <button
            id="toggle-speech-button"
            onClick={onToggleAutoSpeak}
            aria-label={autoSpeak ? 'Disable speech output' : 'Enable speech output'}
            title={autoSpeak ? 'Voice speech enabled' : 'Voice speech disabled'}
            className={`p-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
              autoSpeak
                ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300 shadow-sm shadow-indigo-500/10'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {autoSpeak ? (
              <>
                <Volume2 className="w-4 h-4 text-indigo-400" />
                <span className="hidden lg:inline text-xs">Speech On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-500" />
                <span className="hidden lg:inline text-xs">Speech Off</span>
              </>
            )}
          </button>

          {/* Sign Reference Cheat Sheet */}
          <button
            id="open-reference-button"
            onClick={onOpenReference}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="ASL Sign Reference & Dictionary"
          >
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">Sign Guide</span>
          </button>

          {/* Privacy & Info */}
          <button
            id="open-privacy-button"
            onClick={onOpenPrivacy}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Privacy & AI Disclaimer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Privacy</span>
          </button>
        </div>
      </div>
    </header>
  );
};
