import React from 'react';
import {
  Camera,
  Hand,
  Sparkles,
  ShieldCheck,
  Eye,
  MessageSquare,
  ArrowRight,
  BookOpen,
  Info,
  CheckCircle2
} from 'lucide-react';
import { ASL_REFERENCE_SIGNS } from '../data/aslReferenceData';

interface LandingHeroProps {
  onStartCamera: () => void;
  onOpenReference: () => void;
  onOpenHowItWorks: () => void;
  isRequesting: boolean;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onStartCamera,
  onOpenReference,
  onOpenHowItWorks,
  isRequesting,
}) => {
  const previewSigns = ASL_REFERENCE_SIGNS.slice(0, 6);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-12">
      {/* Hero Banner Section */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500/30 text-indigo-300 text-xs font-semibold shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Multimodal Vision & Sign Linguistics Powered by Gemini</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
          Turn American Sign Language into{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
            English with AI
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          Allow camera access, sign naturally, and see your signs translated into clear English text in real time.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            id="landing-start-camera-button"
            onClick={onStartCamera}
            disabled={isRequesting}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-base shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transform active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer group disabled:opacity-75"
          >
            {isRequesting ? (
              <>
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                <span>Requesting Camera...</span>
              </>
            ) : (
              <>
                <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Start Camera & Translate</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <button
            id="landing-how-it-works-button"
            onClick={onOpenHowItWorks}
            className="w-full sm:w-auto px-6 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-semibold text-base transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Info className="w-4 h-4 text-purple-400" />
            <span>How It Works</span>
          </button>
        </div>

        {/* Privacy badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>
            Strict Privacy: Your camera stream stays strictly ephemeral. No video recordings are saved or uploaded permanently.
          </span>
        </div>
      </div>

      {/* 3 Step "How It Works" Section */}
      <div id="how-it-works-section" className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            How It Works in 3 Simple Steps
          </h2>
          <p className="text-sm text-slate-400">
            Designed for intuitive, fluid two-way communication and ASL practice.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Step 1 */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-indigo-500/40 transition-colors shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-indigo-950 border border-indigo-500/30 flex items-center justify-center mb-4 text-indigo-400">
              <Camera className="w-6 h-6" />
            </div>
            <div className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
              STEP 1
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Allow Camera</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Click the start button to trigger the browser's native camera permission prompt. The camera operates only with your explicit consent.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-purple-500/40 transition-colors shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-purple-950 border border-purple-500/30 flex items-center justify-center mb-4 text-purple-400">
              <Hand className="w-6 h-6 transform -rotate-12" />
            </div>
            <div className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-2">
              STEP 2
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Sign Naturally</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Position your hands and upper torso inside the camera frame. Perform standard ASL signs, conversational gestures, or fingerspelling.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-pink-500/40 transition-colors shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-pink-950 border border-pink-500/30 flex items-center justify-center mb-4 text-pink-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20 mb-2">
              STEP 3
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Read English Translation</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Gemini vision analyzes handshape, movement trajectory, and orientation, outputting clean English text and optional voice speech.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Sign Reference & Practice Preview */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Try Signing These Common ASL Phrases
            </h3>
            <p className="text-xs text-slate-400">
              Click any sign to view instructions or open the full sign reference guide.
            </p>
          </div>
          <button
            onClick={onOpenReference}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>View Full ASL Dictionary ({ASL_REFERENCE_SIGNS.length}+ Signs)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {previewSigns.map((item) => (
            <div
              key={item.id}
              onClick={onOpenReference}
              className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-850 transition-all cursor-pointer group text-left space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 group-hover:text-indigo-200">
                  {item.sign}
                </span>
                <span className="text-[10px] uppercase font-semibold text-slate-400">
                  {item.category}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-tight">
                {item.movement}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Accessibility & Disclaimer Banner */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-2">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-300">Assistive Technology Disclaimer: </span>
            AI-generated translations may contain mistakes. This tool is intended as an assistive technology and educational aid, and should not replace a qualified human ASL interpreter when accuracy is critical (e.g. legal or medical settings).
          </div>
        </div>
      </div>
    </div>
  );
};
