import React from 'react';
import {
  HandFeatureTelemetry,
  CandidateSign,
  ASLRecognitionResult,
  SigningMode,
  SignLanguage,
  CNNFeatureTensor,
} from '../types';
import {
  Activity,
  Sliders,
  Layers,
  Sparkles,
  Terminal,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  Gauge,
  Workflow,
  Cpu,
  X,
} from 'lucide-react';

interface DeveloperDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: HandFeatureTelemetry;
  cnnTelemetry?: CNNFeatureTensor | null;
  currentResult: ASLRecognitionResult | null;
  activeSequenceGlosses: string[];
  grammarSentence: string;
  finalTranslation: string;
  signingMode: SigningMode;
  signLanguage: SignLanguage;
  showDebugOverlay: boolean;
  onToggleDebugOverlay: (enabled: boolean) => void;
  onModeToggle: () => void;
}

export const DeveloperDebugPanel: React.FC<DeveloperDebugPanelProps> = ({
  isOpen,
  onClose,
  telemetry,
  cnnTelemetry,
  currentResult,
  activeSequenceGlosses,
  grammarSentence,
  finalTranslation,
  signingMode,
  signLanguage,
  showDebugOverlay,
  onToggleDebugOverlay,
  onModeToggle,
}) => {
  if (!isOpen) return null;

  const getConfidenceBadgeColor = (conf: number) => {
    if (conf >= 0.8) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (conf >= 0.5) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
  };

  const getStateBadgeColor = (state: string) => {
    switch (state) {
      case 'STROKE':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
      case 'HOLD':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'PREPARATION':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'TRANSITION':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div
      id="developer-debug-panel"
      className="fixed bottom-4 right-4 z-50 w-full max-w-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl text-slate-200 overflow-hidden font-sans text-xs transition-all max-h-[85vh] flex flex-col"
    >
      {/* Header Bar */}
      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-sm text-white tracking-wide">Developer & Pipeline Diagnostics</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
            {signLanguage} · {signingMode.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="toggle-camera-overlay-button"
            onClick={() => onToggleDebugOverlay(!showDebugOverlay)}
            className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              showDebugOverlay
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle landmark bounding boxes overlay on camera feed"
          >
            <Eye className="w-3 h-3" />
            <span>Overlay {showDebugOverlay ? 'ON' : 'OFF'}</span>
          </button>
          <button
            id="close-debug-panel-button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="p-4 space-y-4 overflow-y-auto">
        {/* Real-Time Vision & Segmentation State */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <Activity className="w-3 h-3 text-indigo-400" />
              <span>State Machine</span>
            </div>
            <div
              id="debug-segmentation-state"
              className={`inline-block px-2 py-0.5 rounded font-mono text-[11px] font-bold border ${getStateBadgeColor(
                telemetry.segmentationState
              )}`}
            >
              {telemetry.segmentationState}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <Gauge className="w-3 h-3 text-cyan-400" />
              <span>Motion Velocity</span>
            </div>
            <div className="text-xs font-mono font-bold text-white">
              {telemetry.velocity.toFixed(2)} <span className="text-[10px] text-slate-500 font-normal">({telemetry.movementDirection})</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Hands Tracked</div>
            <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
              <span className={telemetry.leftHandDetected ? 'text-sky-400' : 'text-slate-600'}>L: {telemetry.leftHandDetected ? `${Math.round(telemetry.leftHandOpenness * 100)}%` : 'OFF'}</span>
              <span className="text-slate-600">|</span>
              <span className={telemetry.rightHandDetected ? 'text-purple-400' : 'text-slate-600'}>R: {telemetry.rightHandDetected ? `${Math.round(telemetry.rightHandOpenness * 100)}%` : 'OFF'}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Mode</div>
            <button
              onClick={onModeToggle}
              className="text-[11px] font-bold text-indigo-300 hover:text-indigo-200 underline cursor-pointer"
            >
              {signingMode === 'continuous' ? 'Continuous' : 'Isolated Sign'}
            </button>
          </div>
        </div>

        {/* Current Candidate Signs & Confidence Tiers */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Candidate Recognition</span>
            </span>
            {currentResult && (
              <span
                id="debug-confidence-score"
                className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${getConfidenceBadgeColor(
                  currentResult.confidence
                )}`}
              >
                {Math.round(currentResult.confidence * 100)}% Confidence
              </span>
            )}
          </div>

          {currentResult ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Recognized Gloss:</span>
                  <div className="font-mono font-bold text-sm text-white">{currentResult.recognized_sign}</div>
                </div>
                {currentResult.alternatives && currentResult.alternatives.length > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase">Alternatives:</span>
                    <div className="flex items-center gap-1 font-mono text-[10px] text-amber-300">
                      {currentResult.alternatives.join(', ')}
                    </div>
                  </div>
                )}
              </div>

              {(currentResult.hand_shape_analysis || currentResult.movement_description) && (
                <div className="text-[11px] text-slate-400 space-y-0.5 bg-slate-900/50 p-2 rounded-lg border border-slate-800/80">
                  {currentResult.hand_shape_analysis && (
                    <div>
                      <strong className="text-slate-300">Handshape:</strong> {currentResult.hand_shape_analysis}
                    </div>
                  )}
                  {currentResult.movement_description && (
                    <div>
                      <strong className="text-slate-300">Trajectory:</strong> {currentResult.movement_description}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-500 italic py-2 text-center text-[11px]">
              Awaiting visual sign input from camera...
            </div>
          )}
        </div>

        {/* CNN Spatial-Temporal Telemetry Card */}
        {cnnTelemetry && (
          <div className="p-3 rounded-xl bg-slate-950/60 border border-indigo-500/30 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>CNN Conv2D + Conv1D Tensor</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                {Math.round(cnnTelemetry.apexProbability * 100)}% APEX
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block">Handshape Cluster:</span>
                <span className="text-indigo-300 font-bold">{cnnTelemetry.handshapeCluster}</span>
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block">Cadence Filter:</span>
                <span className="text-emerald-300 font-bold">{cnnTelemetry.receptiveFieldCadence}</span>
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block">Spatial Attention:</span>
                <span className="text-cyan-300 font-bold">{Math.round(cnnTelemetry.spatialAttentionScore * 100)}%</span>
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block">Inference Latency:</span>
                <span className="text-purple-300 font-bold">{cnnTelemetry.temporalLatencyMs} ms</span>
              </div>
            </div>
          </div>
        )}

        {/* 6-Stage Intermediate Representation Pipeline */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
          <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <Workflow className="w-3.5 h-3.5 text-indigo-400" />
            <span>Multi-Stage Pipeline Pipeline Flow</span>
          </div>

          <div className="space-y-2 font-mono text-[11px]">
            {/* Stage 1: Segmentation */}
            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">1. Temporal Segment:</span>
              <span className="text-white font-semibold">{telemetry.segmentationState} ({telemetry.isTwoHandedSign ? '2-Handed' : '1-Handed'})</span>
            </div>

            {/* Stage 2: Raw Glosses */}
            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">2. Live Gloss Sequence:</span>
              <span className="text-indigo-300 font-bold">
                {activeSequenceGlosses.length > 0 ? activeSequenceGlosses.join(' ') : 'NONE'}
              </span>
            </div>

            {/* Stage 3: Grammar Corrected */}
            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">3. Grammar Conversion:</span>
              <span className="text-slate-200">{grammarSentence || 'Awaiting signs...'}</span>
            </div>

            {/* Stage 4: Final Text */}
            <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-emerald-300">
              <span className="font-semibold">4. Final Translation:</span>
              <span className="font-bold">"{finalTranslation || '...'}"</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
