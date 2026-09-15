import React, { useState } from 'react';
import { ASL_REFERENCE_SIGNS } from '../data/aslReferenceData';
import { ASLReferenceSign } from '../types';
import {
  X,
  Search,
  BookOpen,
  Hand,
  Activity,
  Tag,
  Sparkles,
  Info,
  Check
} from 'lucide-react';

interface ASLReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ASLReferenceModal: React.FC<ASLReferenceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSign, setSelectedSign] = useState<ASLReferenceSign | null>(null);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Signs' },
    { id: 'greetings', label: 'Greetings' },
    { id: 'courtesy', label: 'Courtesy' },
    { id: 'questions', label: 'Questions' },
    { id: 'common', label: 'Everyday' },
    { id: 'emergency', label: 'Emergency' },
    { id: 'alphabet', label: 'Alphabet / Fingerspelling' },
  ];

  const filteredSigns = ASL_REFERENCE_SIGNS.filter((item) => {
    const matchesSearch =
      item.sign.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.handshape.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        id="asl-reference-modal"
        className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                ASL Sign Guide & Dictionary
              </h2>
              <p className="text-xs text-slate-400">
                Learn and practice common American Sign Language phrases with your camera
              </p>
            </div>
          </div>

          <button
            id="close-reference-modal-button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Search */}
        <div className="p-4 sm:p-6 bg-slate-900/50 border-b border-slate-800/80 space-y-3">
          {/* Search input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search signs, handshapes, or keywords (e.g., Hello, Thank You, Water)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSigns.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedSign(item)}
              className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                selectedSign?.id === item.id
                  ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                  <Hand className="w-4 h-4 text-indigo-400 transform -rotate-12" />
                  {item.sign}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-800 text-slate-400">
                  {item.category}
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-start gap-1.5">
                  <span className="font-semibold text-indigo-300 shrink-0">Handshape:</span>
                  <span className="text-slate-300">{item.handshape}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="font-semibold text-purple-300 shrink-0">Movement:</span>
                  <span className="text-slate-300">{item.movement}</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed pt-1 border-t border-slate-900">
                {item.description}
              </p>

              <div className="text-[11px] text-slate-400 italic">
                Example: "{item.exampleSentence}"
              </div>
            </div>
          ))}

          {filteredSigns.length === 0 && (
            <div className="col-span-2 py-12 text-center text-slate-500 space-y-2">
              <Search className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-semibold">No ASL signs matched your search query</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="text-xs text-indigo-400 hover:underline cursor-pointer"
              >
                Reset search filters
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Tip: Hold hand signs steadily in frame for the best vision accuracy.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
