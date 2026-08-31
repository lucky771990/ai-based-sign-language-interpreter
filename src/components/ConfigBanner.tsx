import React from 'react';
import { AlertCircle, Key, ExternalLink, HelpCircle } from 'lucide-react';

interface ConfigBannerProps {
  isConfigured: boolean;
  onOpenHelp?: () => void;
}

export const ConfigBanner: React.FC<ConfigBannerProps> = ({
  isConfigured,
  onOpenHelp,
}) => {
  if (isConfigured) return null;

  return (
    <div className="w-full bg-amber-950/80 border-b border-amber-500/40 px-4 py-2.5 text-xs text-amber-200">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Gemini API Setup:</strong> AI translation requires a valid <code className="bg-amber-900/60 px-1.5 py-0.5 rounded text-amber-100 font-mono">GEMINI_API_KEY</code> configured in your environment or Secrets panel.
          </span>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-[11px] text-amber-300/80">
            UI is fully interactive; camera will run in preview mode.
          </span>
        </div>
      </div>
    </div>
  );
};
