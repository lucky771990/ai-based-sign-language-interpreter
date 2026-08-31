import React from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  EyeOff,
  VideoOff,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        id="privacy-modal"
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Privacy & Assistive Technology Policy
              </h2>
              <p className="text-xs text-slate-400">
                Transparent privacy architecture and responsible AI commitments
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs text-slate-300 max-h-[65vh] overflow-y-auto">
          {/* Privacy Notice */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              Camera Privacy Guarantee
            </h3>
            <p className="leading-relaxed">
              "Your camera is only used while translation is active. We do not record, save, or permanently store your camera video."
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li>Camera access is requested exclusively through native browser permission dialogs.</li>
              <li>When you click Stop Translation or leave the page, all camera tracks are immediately terminated using <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded">MediaStreamTrack.stop()</code>.</li>
              <li>No video feeds or frames are archived, sold, or retained.</li>
            </ul>
          </div>

          {/* ASL AI Linguistics & Limitations */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              ASL Linguistic Considerations & Limitations
            </h3>
            <p className="leading-relaxed">
              American Sign Language (ASL) is a complete, natural language with its own complex visual grammar, spatial morphology, and non-manual facial markers.
            </p>
            <p className="text-slate-400 leading-relaxed">
              While our system utilizes cutting-edge Google Gemini vision reasoning to interpret handshapes, palm orientation, and trajectory motion, AI recognition can still encounter ambiguities due to angles, lighting, rapid transitions, or regional dialectical variations.
            </p>
          </div>

          {/* Assistive Notice */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 space-y-1.5">
            <h4 className="font-bold flex items-center gap-1.5 text-amber-300">
              <AlertCircle className="w-4 h-4" />
              Assistive Technology Notice
            </h4>
            <p className="leading-relaxed">
              AI-generated translations may contain mistakes. This tool is intended as an assistive technology, educational practice aid, and communication supplement. It must not replace certified ASL human interpreters for critical medical, legal, or emergency situations.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/90 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
