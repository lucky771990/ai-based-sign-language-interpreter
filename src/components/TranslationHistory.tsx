import React, { useState } from 'react';
import { TranslationHistoryItem } from '../types';
import {
  History,
  Trash2,
  Copy,
  Check,
  Volume2,
  Clock,
  Download,
  Share2,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface TranslationHistoryProps {
  history: TranslationHistoryItem[];
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
  onSpeakItem: (text: string) => void;
}

export const TranslationHistory: React.FC<TranslationHistoryProps> = ({
  history,
  onClearHistory,
  onDeleteItem,
  onSpeakItem,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [transcriptCopied, setTranscriptCopied] = useState(false);

  const handleCopyItem = (id: string, text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch((e) => console.warn(e));
      }
    } catch (e) {
      console.warn('Clipboard write error:', e);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleCopyTranscript = () => {
    if (history.length === 0) return;
    const transcript = history
      .map((item) => `${item.formattedTime} — "${item.english_translation}" (ASL: ${item.recognized_signs.join(', ')})`)
      .join('\n');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(transcript).catch((e) => console.warn(e));
      }
    } catch (e) {
      console.warn('Clipboard write error:', e);
    }
    setTranscriptCopied(true);
    setTimeout(() => setTranscriptCopied(false), 2000);
  };

  const handleExportTextFile = () => {
    if (history.length === 0) return;
    const transcript = history
      .map((item) => `${item.formattedTime} — "${item.english_translation}" (ASL: ${item.recognized_signs.join(', ')})`)
      .join('\n');
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asl-translate-session-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="translation-history-card"
      className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
    >
      {/* History Header */}
      <div className="px-5 py-3.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Session History</h2>
            <p className="text-[11px] text-slate-400">
              {history.length} {history.length === 1 ? 'phrase' : 'phrases'} recorded in this session
            </p>
          </div>
        </div>

        {/* Header Actions */}
        {history.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              id="copy-transcript-button"
              onClick={handleCopyTranscript}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
              title="Copy Full Session Transcript"
            >
              {transcriptCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy All</span>
                </>
              )}
            </button>

            <button
              id="export-transcript-button"
              onClick={handleExportTextFile}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 text-slate-300 hover:text-white transition-colors"
              title="Download Transcript as TXT"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              id="clear-history-button"
              onClick={onClearHistory}
              className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950/80 border border-rose-500/30 text-xs font-semibold text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
              title="Clear Entire Session History"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        )}
      </div>

      {/* History Items List */}
      <div className="p-4 sm:p-5">
        {history.length > 0 ? (
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {history.map((item) => (
              <div
                key={item.id}
                id={`history-item-${item.id}`}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono font-medium text-indigo-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {item.formattedTime}
                    </span>

                    {item.recognized_signs && item.recognized_signs.length > 0 && (
                      <span className="text-[11px] font-bold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        ASL: {item.recognized_signs.join(' • ')}
                      </span>
                    )}

                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/20">
                      {Math.round(item.confidence * 100)}%
                    </span>
                  </div>

                  <div className="text-base font-bold text-white tracking-tight">
                    "{item.english_translation}"
                  </div>
                </div>

                {/* Item Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-center opacity-90 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onSpeakItem(item.english_translation)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-indigo-400 transition-colors"
                    title="Speak Aloud"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleCopyItem(item.id, item.english_translation)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
                    title="Copy Text"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Delete this entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center mx-auto text-slate-500">
              <History className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-300">No Translations Yet</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Your recognized ASL signs will be chronologically logged here throughout your session.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
