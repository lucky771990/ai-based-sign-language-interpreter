import React, { useState } from 'react';
import { ASLRecognitionResult, RecognitionStatus, ActiveSentence } from '../types';
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
  activeSentence?: ActiveSentence;
  onClearTranslation: () => void;
  onSpeakText: (text: string) => void;
  onRetryTranslation?: () => void;
  onOpenDiagnostics?: () => void;
}

export const TranslationPanel: React.FC<TranslationPanelProps> = ({
  currentResult,
  recognitionStatus,
  isTranslating,
  activeSentence,
  onClearTranslation,
  onSpeakText,
  onRetryTranslation,
  onOpenDiagnostics,
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
  const isNotConfigured = Boolean(currentResult?.is_not_configured);
  const isConnectionError = Boolean(currentResult?.is_connection_error);
  const isUncertain = Boolean(
    currentResult && (!isReliable || currentResult.recognized_sign === 'NONE' || currentResult.english_translation.includes('not confident')) &&
    !isNotConfigured &&
    !isConnectionError &&
    !currentResult.is_rate_limited
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
        <div className="flex items-center gap-2 flex-wrap">
          {recognitionStatus === 'waiting_hand' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/80 border border-blue-500/30 text-blue-300 animate-pulse">
              <Hand className="w-3.5 h-3.5 text-blue-400" />
              <span>Waiting for Hand</span>
            </span>
          )}
          {recognitionStatus === 'holding' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/80 border border-indigo-500/30 text-indigo-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Holding Gesture</span>
            </span>
          )}
          {recognitionStatus === 'locked' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>1.5s Cooldown Active</span>
            </span>
          )}
          {recognitionStatus === 'cooling_down' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 border border-amber-500/30 text-amber-300">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Quota Cooldown Active</span>
            </span>
          )}
          {currentResult && (
            <>
              {isNotConfigured ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 border border-rose-500/30 text-rose-300">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Not Configured</span>
                </span>
              ) : isConnectionError ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 border border-rose-500/30 text-rose-300">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Backend Offline</span>
                </span>
              ) : currentResult.is_auto_translated ? (
                <span
                  id="translation-auto-mapped-badge"
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950/80 border border-purple-500/40 text-purple-300"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Auto-Mapped Conversational</span>
                </span>
              ) : isReliable ? (
                <span
                  id="translation-confidence-high"
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 border border-emerald-500/30 text-emerald-300"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>CONFIDENCE: {currentResult.confidence_level || 'High'} ({confidenceScore}%)</span>
                </span>
              ) : (
                <span
                  id="translation-confidence-low"
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 border border-amber-500/30 text-amber-300"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>CONFIDENCE: {currentResult.confidence_level || 'Low'}</span>
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Text Content Area */}
      <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-6">
        <div>
          {/* Main Translated Text Display */}
          {currentResult ? (
            <div className="space-y-4">
              {isNotConfigured ? (
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>AI translation is not configured</span>
                  </div>
                  <p className="text-base sm:text-lg font-medium text-rose-100/90 leading-relaxed">
                    Gemini is not configured on the translation server yet.
                  </p>
                  <p className="text-xs text-rose-300/80">
                    Please configure <code className="bg-rose-900/60 px-1 py-0.5 rounded font-mono text-rose-100">GEMINI_API_KEY</code> in the backend server environment.
                  </p>
                  {onOpenDiagnostics && (
                    <button
                      onClick={onOpenDiagnostics}
                      className="px-3 py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-100 text-xs font-semibold border border-rose-500/40 transition-colors cursor-pointer"
                    >
                      Open Diagnostics
                    </button>
                  )}
                </div>
              ) : isConnectionError ? (
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>AI translation unavailable</span>
                  </div>
                  <p className="text-base sm:text-lg font-medium text-amber-100/90 leading-relaxed">
                    Unable to connect to the translation service. Please check the API configuration and try again.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    {onRetryTranslation && (
                      <button
                        onClick={onRetryTranslation}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-md"
                      >
                        Try Again
                      </button>
                    )}
                    {onOpenDiagnostics && (
                      <button
                        onClick={onOpenDiagnostics}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                      >
                        Configure API URL
                      </button>
                    )}
                  </div>
                </div>
              ) : currentResult.is_rate_limited || recognitionStatus === 'rate_limited' || recognitionStatus === 'cooling_down' ? (
                <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200 space-y-3 shadow-lg">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>Quota Cooldown Active</span>
                  </div>
                  <p className="text-xl font-extrabold text-amber-100 leading-snug">
                    AI quota cooldown active. Recognition paused temporarily.
                  </p>
                  <p className="text-xs text-amber-300/80">
                    The system automatically pauses during API cooldown to prevent quota exhaustion and will resume automatically once the timer expires.
                  </p>
                </div>
              ) : isUncertain ? (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
                    <AlertCircle className="w-4 h-4" />
                    <span>Sign Unclear</span>
                  </div>
                  <p className="text-base font-medium text-amber-100/90 leading-relaxed">
                    {currentResult.uncertainty_reason || "Sign unclear — please repeat."}
                  </p>
                  <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 whitespace-pre-line">
                    {currentResult.formatted_output || "SIGN: Unclear\nTYPE: Unknown\nCONFIDENCE: Low"}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Prominent Sign Display Box matching User's Exact Specification */}
                  {(() => {
                    const signType = currentResult.sign_type || 'Word';
                    const isSentence = signType === 'Sentence';
                    const isAlphabet = signType === 'Alphabet';
                    const isFingerspelling = signType === 'Fingerspelling';

                    const primaryDisplay = isSentence
                      ? `"${currentResult.english_translation}"`
                      : `[${(currentResult.recognized_sign || currentResult.english_translation || '').toUpperCase()}]`;

                    const englishLabel = isAlphabet ? 'English letter:' : 'English:';
                    const englishValue = isAlphabet
                      ? (currentResult.recognized_sign || currentResult.english_translation).slice(0, 1).toUpperCase()
                      : isFingerspelling
                      ? currentResult.english_translation.toUpperCase()
                      : currentResult.english_translation;

                    const signLang = currentResult.language || 'ISL';
                    const confLevel = currentResult.confidence_level || (isReliable ? 'High' : 'Low');

                    return (
                      <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-3.5">
                        {/* Prominent Header e.g. [HELLO] or "Hello. How are you?" */}
                        <div
                          id="translation-english-text"
                          className="text-3xl sm:text-4xl font-extrabold text-indigo-300 tracking-tight font-mono break-words leading-tight"
                        >
                          {primaryDisplay}
                        </div>

                        {/* Structured Specification Attributes */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/80 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-medium">{englishLabel}</span>
                            <span className="text-white font-bold tracking-wide">{englishValue}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-medium">Sign language:</span>
                            <span className="text-indigo-400 font-bold">{signLang}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-medium">Type:</span>
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {signType}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-medium">Confidence:</span>
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                                confLevel === 'High'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : confLevel === 'Medium'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {confLevel}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Standard Final Output Format Box */}
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/90 font-mono text-xs space-y-1.5 shadow-inner">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>FINAL OUTPUT FORMAT</span>
                      <span className="text-indigo-400 font-semibold">{currentResult.language || 'ISL'}</span>
                    </div>
                    <div className="text-emerald-400 font-bold whitespace-pre-line leading-relaxed text-sm bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                      {currentResult.formatted_output ||
                        `SIGN: ${currentResult.english_translation || currentResult.recognized_sign}\nTYPE: ${currentResult.sign_type || 'Word'}\nCONFIDENCE: ${currentResult.confidence_level || (isReliable ? 'High' : 'Low')}`}
                    </div>
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

                  {/* Live Full Sentence Translation Ribbon */}
                  {activeSentence && activeSentence.words.length > 1 && activeSentence.sentenceText && (
                    <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500/40 text-white space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-indigo-300 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Full Sentence Translation</span>
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 font-medium">
                          {activeSentence.words.length} signs combined
                        </span>
                      </div>
                      <div className="text-lg font-bold text-white tracking-tight leading-snug">
                        "{activeSentence.sentenceText}"
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          {activeSentence.words.map((w, idx) => (
                            <span
                              key={w.id || idx}
                              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900/90 text-indigo-300 border border-indigo-500/30"
                            >
                              {w.gloss || w.word.toUpperCase()}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={() => onSpeakText(activeSentence.sentenceText)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                          title="Speak full sentence"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Speak</span>
                        </button>
                      </div>
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
                {isTranslating ? 'Ready for Hand Signs...' : 'Translation is Paused'}
              </p>
              <p className="text-xs text-slate-400 max-w-xs">
                {isTranslating
                  ? 'Show hand signs clearly in frame. The event detector will recognize alphabets, words, phrases, or sentences.'
                  : 'Start camera and resume translation to begin interpreting signs.'}
              </p>
              <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-400 mt-2">
                SIGN: No sign detected
              </div>
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
