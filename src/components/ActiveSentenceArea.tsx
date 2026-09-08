import React, { useState } from 'react';
import { ActiveSentence } from '../types';
import {
  MessageSquareText,
  Volume2,
  Copy,
  Check,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  Layers,
  ChevronDown
} from 'lucide-react';

interface ActiveSentenceAreaProps {
  activeSentence: ActiveSentence;
  timeRemainingMs: number;
  timeWindowMs: number;
  onChangeTimeWindow: (windowMs: number) => void;
  onClearSentence: () => void;
  onCompleteSentence: () => void;
  onRemoveWord: (id: string) => void;
  onSpeakSentence: (text: string) => void;
}

export const ActiveSentenceArea: React.FC<ActiveSentenceAreaProps> = ({
  activeSentence,
  timeRemainingMs,
  timeWindowMs,
  onChangeTimeWindow,
  onClearSentence,
  onCompleteSentence,
  onRemoveWord,
  onSpeakSentence,
}) => {
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const words = activeSentence.words;
  const hasWords = words.length > 0;
  const isComplete = activeSentence.isComplete;
  const sentenceText = activeSentence.sentenceText;

  // Calculate remaining progress percentage (0 - 100)
  const progressPercent = hasWords && !isComplete && timeWindowMs > 0
    ? Math.max(0, Math.min(100, (timeRemainingMs / timeWindowMs) * 100))
    : 0;

  const handleCopy = () => {
    if (!sentenceText) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(sentenceText).catch((err) => {
          console.warn('Clipboard write rejected:', err);
        });
      }
    } catch (e) {
      console.warn('Clipboard write error:', e);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const remainingSecs = (timeRemainingMs / 1000).toFixed(1);

  return (
    <div
      id="active-sentence-area"
      className="flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-all"
    >
      {/* Active Time Window Progress Bar */}
      {hasWords && !isComplete && (
        <div className="w-full h-1 bg-slate-800/80 overflow-hidden">
          <div
            id="active-sentence-timer-bar"
            className="h-full bg-indigo-500 transition-all duration-100 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Header Bar */}
      <div className="px-5 py-3.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <MessageSquareText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">Active Sentence</h2>
              {hasWords && (
                <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {words.length} {words.length === 1 ? 'word' : 'words'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Groups sequential single-word translations within {timeWindowMs / 1000}s
            </p>
          </div>
        </div>

        {/* State Status Badge & Window Duration Settings */}
        <div className="flex items-center gap-2">
          {hasWords ? (
            isComplete ? (
              <span
                id="active-sentence-status-complete"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 border border-emerald-500/30 text-emerald-300"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Complete</span>
              </span>
            ) : (
              <span
                id="active-sentence-status-listening"
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 animate-pulse"
              >
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Next sign: {remainingSecs}s</span>
              </span>
            )
          ) : (
            <span
              id="active-sentence-status-waiting"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800/80 border border-slate-700/80 text-slate-400"
            >
              <span>Ready for words</span>
            </span>
          )}

          {/* Time Window Duration Config Toggle */}
          <button
            id="toggle-time-window-settings-button"
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
            title="Configure grouping window time"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Optional Window Duration Dropdown Selector */}
      {showSettings && (
        <div className="px-5 py-2.5 bg-slate-950/90 border-b border-slate-800/90 flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            Grouping Time Window:
          </span>
          <div className="flex items-center gap-1.5">
            {[3000, 5000, 8000].map((ms) => (
              <button
                key={ms}
                id={`set-window-${ms / 1000}s-button`}
                onClick={() => {
                  onChangeTimeWindow(ms);
                  setShowSettings(false);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  timeWindowMs === ms
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {ms / 1000}s
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-5 sm:p-6 space-y-4">
        {hasWords ? (
          <div className="space-y-4">
            {/* The Assembled Sentence Display */}
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-indigo-400 mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Assembled Sentence</span>
              </div>
              <div
                id="active-sentence-display-text"
                className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-relaxed selection:bg-indigo-600"
              >
                "{sentenceText}"
                {!isComplete && (
                  <span className="inline-block ml-1 text-indigo-400 animate-pulse font-mono">
                    ...
                  </span>
                )}
              </div>
            </div>

            {/* Sequential Single-Word Tokens Flow */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-500" />
                <span>Grouped Word Sequence ({words.length}):</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {words.map((item, index) => (
                  <div
                    key={item.id}
                    id={`active-sentence-word-${item.id}`}
                    className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition-colors"
                  >
                    <span className="text-[10px] font-mono text-slate-500 font-bold">
                      {index + 1}.
                    </span>
                    <span className="font-semibold text-white">
                      {item.word}
                    </span>
                    {item.gloss && (
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {item.gloss}
                      </span>
                    )}
                    <button
                      id={`remove-word-${item.id}-button`}
                      onClick={() => onRemoveWord(item.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-0.5 rounded cursor-pointer opacity-70 group-hover:opacity-100"
                      title="Remove this word from sentence"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Helper Notice for Signer */}
            {!isComplete && (
              <p className="text-xs text-slate-400 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                Perform another single sign within <strong className="text-indigo-300 font-semibold">{remainingSecs}s</strong> to append it to this sentence, or tap <span className="text-slate-200 font-semibold">Finish</span> to conclude.
              </p>
            )}
          </div>
        ) : (
          /* Empty Waiting State */
          <div
            id="active-sentence-empty-state"
            className="py-5 px-4 text-center border border-dashed border-slate-800 rounded-xl space-y-1.5 bg-slate-950/30"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800/60 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <MessageSquareText className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-300">
              No active sentence assembling
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
              When you perform sequential single-word signs within {timeWindowMs / 1000} seconds of each other (e.g., <code className="text-indigo-300 font-mono">HELLO</code> → <code className="text-indigo-300 font-mono">FRIEND</code>), they will automatically group here into a complete sentence.
            </p>
          </div>
        )}

        {/* Action Controls Bar */}
        {hasWords && (
          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              {/* Copy Sentence Button */}
              <button
                id="copy-active-sentence-button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-200 border border-slate-700/80 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Copy Active Sentence"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {/* Speak Sentence Button */}
              <button
                id="speak-active-sentence-button"
                onClick={() => onSpeakSentence(sentenceText)}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-200 border border-slate-700/80 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Speak Sentence Aloud"
              >
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Speak</span>
              </button>

              {/* Complete Manually Button */}
              {!isComplete && (
                <button
                  id="complete-active-sentence-button"
                  onClick={onCompleteSentence}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Finalize Active Sentence Immediately"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Finish</span>
                </button>
              )}
            </div>

            {/* Clear Active Sentence Button */}
            <button
              id="clear-active-sentence-button"
              onClick={onClearSentence}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
              title="Clear Active Sentence"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
