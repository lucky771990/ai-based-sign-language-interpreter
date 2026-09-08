import React from 'react';
import { COMMON_CONVERSATIONAL_SENTENCES, CommonSentenceItem } from '../data/commonSentences';
import {
  Sparkles,
  Zap,
  Wand2,
  Volume2,
  Plus,
  Printer
} from 'lucide-react';

interface QuickSentencesBarProps {
  autoTranslateWeirdSigns: boolean;
  onToggleAutoTranslateWeirdSigns: () => void;
  fastMode: boolean;
  onToggleFastMode: () => void;
  onSelectSentence: (sentence: string, gloss: string) => void;
  onPhysicalPrint?: () => void;
  onSpeakText?: (text: string) => void;
  lastAutoTranslatedText?: string | null;
}

export const QuickSentencesBar: React.FC<QuickSentencesBarProps> = ({
  autoTranslateWeirdSigns,
  onToggleAutoTranslateWeirdSigns,
  fastMode,
  onToggleFastMode,
  onSelectSentence,
  onPhysicalPrint,
  onSpeakText,
  lastAutoTranslatedText,
}) => {
  return (
    <div
      id="quick-sentences-bar"
      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3"
    >
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Wand2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>Conversational Sentences & Quick Translation</span>
              {autoTranslateWeirdSigns && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  AUTO-MAP ON
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Instant one-click translation sentences and smart conversational auto-mapping.
            </p>
          </div>
        </div>

        {/* Action & Feature Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Physical Browser Print Dialog Button */}
          {onPhysicalPrint && (
            <button
              type="button"
              id="physical-print-btn"
              onClick={onPhysicalPrint}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-slate-950 text-slate-300 border border-slate-800 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
              title="Print formatted translation session to paper / PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Print to Paper/PDF</span>
            </button>
          )}

          {/* Fast Mode Toggle */}
          <button
            type="button"
            id="toggle-fast-mode-btn"
            onClick={onToggleFastMode}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              fastMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle Ultra-Fast Mode for sub-second translations"
          >
            <Zap className={`w-3.5 h-3.5 ${fastMode ? 'text-amber-400 fill-amber-400/30' : 'text-slate-500'}`} />
            <span>{fastMode ? 'Ultra-Fast (0.5s)' : 'Fast Mode'}</span>
          </button>

          {/* Auto Translate Weird Signs Toggle */}
          <button
            type="button"
            id="toggle-auto-translate-weird-btn"
            onClick={onToggleAutoTranslateWeirdSigns}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              autoTranslateWeirdSigns
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Auto-translate approximate or weird signs into common conversational sentences"
          >
            <Sparkles className={`w-3.5 h-3.5 ${autoTranslateWeirdSigns ? 'text-purple-400' : 'text-slate-500'}`} />
            <span>Auto-Translate Weird</span>
          </button>
        </div>
      </div>

      {/* Preset Sentence Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {COMMON_CONVERSATIONAL_SENTENCES.map((item: CommonSentenceItem) => {
          const isRecentlyMatched =
            lastAutoTranslatedText &&
            lastAutoTranslatedText.toLowerCase().includes(item.sentence.toLowerCase().slice(0, 10));

          return (
            <div
              key={item.id}
              id={`quick-sentence-chip-${item.id}`}
              onClick={() => onSelectSentence(item.sentence, item.gloss)}
              className={`group p-2.5 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden flex flex-col justify-between ${
                isRecentlyMatched
                  ? 'bg-purple-500/15 border-purple-500/50 shadow-md ring-1 ring-purple-500/30'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-850/80'
              }`}
            >
              <div className="flex items-start justify-between gap-1 mb-1">
                <span className="text-base leading-none">{item.emoji}</span>
                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  {onSpeakText && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSpeakText(item.sentence);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800"
                      title="Speak sentence"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  )}
                  <span className="text-[10px] text-indigo-400 font-bold group-hover:translate-x-0.5 transition-transform">
                    <Plus className="w-3 h-3" />
                  </span>
                </div>
              </div>

              <div className="font-semibold text-xs text-slate-200 line-clamp-1 group-hover:text-white">
                {item.sentence}
              </div>
              <div className="text-[10px] text-slate-500 font-mono tracking-tight mt-0.5">
                ASL: {item.gloss}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
