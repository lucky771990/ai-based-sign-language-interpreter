import React, { useState } from 'react';
import { SessionCorrection } from '../types';
import { languageContextEngine } from '../services/languageContextEngine';
import {
  Brain,
  Edit3,
  Trash2,
  Plus,
  CheckCircle2,
  X,
  Sparkles,
  Info,
} from 'lucide-react';

interface CorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOriginalSign?: string;
  defaultCorrectedSign?: string;
  onCorrectionSaved: () => void;
}

export const CorrectionModal: React.FC<CorrectionModalProps> = ({
  isOpen,
  onClose,
  defaultOriginalSign = '',
  defaultCorrectedSign = '',
  onCorrectionSaved,
}) => {
  const [originalSign, setOriginalSign] = useState<string>(defaultOriginalSign);
  const [correctedSign, setCorrectedSign] = useState<string>(defaultCorrectedSign);
  const [contextNotes, setContextNotes] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentCorrections = languageContextEngine.getSessionCorrections();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalSign.trim() || !correctedSign.trim()) return;

    languageContextEngine.addSessionCorrection(
      originalSign.trim(),
      correctedSign.trim(),
      contextNotes.trim() || undefined
    );

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
    setOriginalSign('');
    setCorrectedSign('');
    setContextNotes('');
    onCorrectionSaved();
  };

  const handleRemove = (orig: string) => {
    languageContextEngine.removeSessionCorrection(orig);
    onCorrectionSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="correction-learning-modal"
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Session Correction & Learning Loop
              </h2>
              <p className="text-xs text-slate-400">
                Teach the system your personalized signs and correct mistakes for this session
              </p>
            </div>
          </div>
          <button
            id="close-correction-modal-button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Helper Banner */}
          <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex items-start gap-3 text-xs text-indigo-200">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              When you teach a correction (e.g. replacing <strong className="text-white">BENCH</strong> with <strong className="text-white">BANK</strong>), the system prioritizes this interpretation whenever similar visual gestures are performed during this session.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Detected / Misidentified Sign
                </label>
                <input
                  id="correction-original-input"
                  type="text"
                  placeholder="e.g. BENCH or SCHOOL"
                  value={originalSign}
                  onChange={(e) => setOriginalSign(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 uppercase font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Your Intended Sign / Translation
                </label>
                <input
                  id="correction-corrected-input"
                  type="text"
                  placeholder="e.g. BANK or PAPER"
                  value={correctedSign}
                  onChange={(e) => setCorrectedSign(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 uppercase font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Context / Notes (Optional)
              </label>
              <input
                id="correction-notes-input"
                type="text"
                placeholder="e.g. When signing about money/accounts"
                value={contextNotes}
                onChange={(e) => setContextNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 min-h-[20px]">
                {savedSuccess && (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Correction stored in active session!</span>
                  </>
                )}
              </span>

              <button
                id="save-correction-button"
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Save Correction</span>
              </button>
            </div>
          </form>

          {/* Stored Corrections List */}
          <div className="pt-3 border-t border-slate-800 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Active Session Corrections ({currentCorrections.length})</span>
            </h3>

            {currentCorrections.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No custom sign corrections added yet. Any corrections made will be remembered throughout your session.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {currentCorrections.map((corr) => (
                  <div
                    key={corr.id}
                    id={`stored-correction-${corr.id}`}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-rose-300 font-semibold line-through">
                          {corr.originalSign}
                        </span>
                        <span className="text-slate-500">➔</span>
                        <span className="font-mono text-emerald-300 font-bold">
                          {corr.correctedSign}
                        </span>
                      </div>
                      {corr.contextNotes && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {corr.contextNotes}
                        </p>
                      )}
                    </div>

                    <button
                      id={`delete-correction-${corr.id}`}
                      onClick={() => handleRemove(corr.originalSign)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Remove this correction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end">
          <button
            id="done-correction-modal-button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
