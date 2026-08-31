import React from 'react';
import { AlertCircle, Activity, HelpCircle } from 'lucide-react';

interface ConfigBannerProps {
  isConfigured: boolean;
  onOpenHelp?: () => void;
  onOpenDiagnostics?: () => void;
}

export const ConfigBanner: React.FC<ConfigBannerProps> = ({
  isConfigured,
  onOpenHelp,
  onOpenDiagnostics,
}) => {
  if (isConfigured) return null;

  return (
    <div className="w-full bg-amber-950/90 border-b border-amber-500/40 px-4 py-2.5 text-xs text-amber-200 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>AI Translation Server Setup:</strong> Real-time ASL recognition connects to your secure backend API configured with <code className="bg-amber-900/60 px-1.5 py-0.5 rounded text-amber-100 font-mono">GEMINI_API_KEY</code>.
          </span>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-900/80 hover:bg-amber-850 text-amber-200 border border-amber-500/40 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <Activity className="w-3 h-3 text-amber-300" />
              <span>Configure Backend URL</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
