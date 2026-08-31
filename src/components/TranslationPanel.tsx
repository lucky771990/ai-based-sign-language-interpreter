import React, { useState } from 'react';
import { ASLRecognitionResult, RecognitionStatus } from '../types';
import {
  Copy,
  Check,
  Volume2,
  Trash2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Hand,
  Activity,
  Smile,
  ShieldAlert
} from 'lucide-react';

interface TranslationPanelProps {
  currentResult: ASLRecognitionResult | null;
  recognitionStatus: RecognitionStatus;
  isTranslating: boolean;
  onClearTranslation: () => void;
  onSpeakText: (text: string) => void;
}

export const TranslationPanel: React.FC<TranslationPanelProps> = ({
  currentResult,
  recognitionStatus,
  isTranslating,
  onClearTranslation,
  onSpeakText,
}) => {
  const [copied, setCopied] = useState(false);
  const [showLinguistics, setShowLinguistics] = useState(true);

  const handleCopy = () => {
    if (!currentResult?.english_translation) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(currentResult.english_translation).catch((err) => {
          console.warn('Clipboard write rejected:', err);
        });
      }
    } catch (e) {
      console.warn('Clipboard write error:', e);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confidenceScore = currentResult ? Math.round(currentResult.confidence * 100) : 0;
  const isReliable = Boolean(currentResult?.is_reliable && confidenceScore >= 65);
  const isUncertain = Boolean(
    currentResult && (!isReliable || currentResult.recognized_sign === 'NONE' || currentResult.english_translation.includes('not confident'))
  );

  return (
    <div
      id="translation-panel-card"
      className="flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
    >
      {/* Panel Top Header */}
      <div className="px-5 py-3.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-white tracking-tight">English Translation</h2>
        </div>

        {/* Status / Confidence Badge */}
        {currentResult && (
          <div className="flex items-center gap-2">
            {isReliable ? (
              <span
                id="translation-confidence-high"
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 border border-emerald-500/30 text-emerald-300"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{confidenceScore}% Confidence</span>
              </span>
            ) : (
              <span
                id="translation-confidence-low"
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 border border-amber-500/30 text-amber-300"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Low Confidence</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Text Content Area */}
      <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-6">
        <div>
          {/* Main Translated Text Display */}
          {currentResult ? (
            <div className="space-y-4">
              {isUncertain ? (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
                    <AlertCircle className="w-4 h-4" />
                    <span>Sign Needs Clarification</span>
                  </div>
                  <p className="text-base sm:text-lg font-medium text-amber-100/90 leading-relaxed">
                    {currentResult.english_translation || "I'm not confident about that sign. Please try again."}
                  </p>
                  <p className="text-xs text-amber-300/80">
                    Tip: Ensure good lighting, hold the sign steady for 1 second, and position your hands clearly within the frame.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                    Recognized Meaning
                  </div>
                  <div
                    id="translation-english-text"
                    className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug break-words selection:bg-indigo-600"
                  >
                    "{currentResult.english_translation}"
                  </div>

                  {/* Sign Gloss Badges */}
                  {currentResult.recognized_signs && currentResult.recognized_signs.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-xs text-slate-400 font-medium mr-1">ASL Gloss:</span>
                      {currentResult.recognized_signs.map((sign, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 tracking-wide font-mono"
                        >
                          {sign}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ASL Linguistic Feature Breakdown */}
              {isReliable && (currentResult.hand_shape_analysis || currentResult.movement_description) && (
                <div className="pt-2">
                  <button
                    onClick={() => setShowLinguistics(!showLinguistics)}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1 mb-2 transition-colors cursor-pointer"
                  >
                    <span>Linguistic Analysis</span>
                    <span className="text-[10px] text-slate-500">
                      {showLinguistics ? '(hide)' : '(show details)'}
                    </span>
                  </button>

                  {showLinguistics && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                      {currentResult.hand_shape_analysis && (
                        <div className="flex items-start gap-2">
                          <Hand className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-slate-300">Handshape: </span>
                            <span className="text-slate-400">{currentResult.hand_shape_analysis}</span>
                          </div>
                        </div>
                      )}
                      {currentResult.movement_description && (
                        <div className="flex items-start gap-2">
                          <Activity className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-slate-300">Movement: </span>
                            <span className="text-slate-400">{currentResult.movement_description}</span>
                          </div>
                        </div>
                      )}
                      {currentResult.detected_non_manual_markers && (
                        <div className="flex items-start gap-2 sm:col-span-2">
                          <Smile className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-slate-300">Expression / NMM: </span>
                            <span className="text-slate-400">{currentResult.detected_non_manual_markers}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-800 rounded-xl space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500">
                <Hand className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-300">
                {isTranslating ? 'Ready for ASL Signs...' : 'Translation is Paused'}
              </p>
              <p className="text-xs text-slate-400 max-w-xs">
                {isTranslating
                  ? 'Perform a sign within the camera frame. The AI will translate it into natural English text.'
                  : 'Start camera and resume translation to begin interpreting ASL.'}
              </p>
            </div>
          )}
        </div>

        {/* Action Controls (Copy, Speak, Clear) */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Copy Button */}
            <button
              id="copy-translation-button"
              onClick={handleCopy}
              disabled={!currentResult?.english_translation || isUncertain}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-200 border border-slate-700/80 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Copy English Translation"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            {/* Speak Aloud Button */}
            <button
              id="speak-translation-button"
              onClick={() => onSpeakText(currentResult?.english_translation || '')}
              disabled={!currentResult?.english_translation || isUncertain}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-200 border border-slate-700/80 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Speak Translation Aloud"
            >
              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Speak</span>
            </button>
          </div>

          {/* Clear Translation Button */}
          {currentResult && (
            <button
              id="clear-translation-button"
              onClick={onClearTranslation}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Clear Current Translation"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Assistive Technology Small Disclaimer */}
      <div className="px-5 py-3 bg-slate-950/80 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span>
          AI-generated translations may contain mistakes. This tool is intended as an assistive technology and should not replace a certified ASL interpreter.
        </span>
      </div>
    </div>
  );
};
