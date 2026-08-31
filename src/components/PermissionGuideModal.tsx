import React, { useState } from 'react';
import {
  X,
  Camera,
  ShieldAlert,
  Globe,
  Smartphone,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface PermissionGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
}

export const PermissionGuideModal: React.FC<PermissionGuideModalProps> = ({
  isOpen,
  onClose,
  onRetry,
}) => {
  const [activeTab, setActiveTab] = useState<'desktop' | 'mobile'>('desktop');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        id="permission-guide-modal"
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Camera Permission Guide
              </h2>
              <p className="text-xs text-slate-400">
                How to enable camera access in your browser settings
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selector */}
        <div className="px-6 pt-4 pb-2 bg-slate-900 border-b border-slate-800 flex gap-2">
          <button
            onClick={() => setActiveTab('desktop')}
            className={`px-4 py-2 rounded-xl font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'desktop'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Desktop Browsers (Chrome, Safari, Edge, Firefox)</span>
          </button>
          <button
            onClick={() => setActiveTab('mobile')}
            className={`px-4 py-2 rounded-xl font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'mobile'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Mobile (iOS / Android)</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {activeTab === 'desktop' ? (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">1</span>
                  Google Chrome & Microsoft Edge
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
                  <li>Click the <strong>Tune / Padlock icon</strong> on the left side of the address bar.</li>
                  <li>Find <strong>Camera</strong> in the permissions menu.</li>
                  <li>Change the dropdown setting from <em>"Blocked"</em> to <strong>"Allow"</strong>.</li>
                  <li>Click the <strong>"Try Again"</strong> button below or refresh the page.</li>
                </ol>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">2</span>
                  Apple Safari (macOS)
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
                  <li>In the top menu bar, click <strong>Safari &gt; Settings... (or Preferences)</strong>.</li>
                  <li>Select the <strong>Websites</strong> tab at the top.</li>
                  <li>Click <strong>Camera</strong> in the left sidebar.</li>
                  <li>Locate this website and change permission to <strong>"Allow"</strong>.</li>
                </ol>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">3</span>
                  Mozilla Firefox
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
                  <li>Click the <strong>Camera / Padlock icon</strong> on the left side of the address bar.</li>
                  <li>Click the <strong>"X"</strong> next to <em>Blocked Temporarily</em> to clear the block.</li>
                  <li>Refresh the page and choose <strong>"Allow"</strong> when prompted.</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <h4 className="font-bold text-white text-sm">iPhone / iPad (iOS Safari)</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
                  <li>Open <strong>Settings</strong> on your iPhone or iPad.</li>
                  <li>Scroll down and tap <strong>Safari</strong>.</li>
                  <li>Under <em>Settings for Websites</em>, tap <strong>Camera</strong>.</li>
                  <li>Set to <strong>Ask</strong> or <strong>Allow</strong>.</li>
                  <li>Also verify <strong>Settings &gt; Privacy & Security &gt; Camera &gt; Safari</strong> is enabled.</li>
                </ol>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <h4 className="font-bold text-white text-sm">Android (Chrome / Samsung Internet)</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
                  <li>Tap the <strong>three dots (⋮)</strong> menu &gt; <strong>Settings</strong>.</li>
                  <li>Tap <strong>Site Settings &gt; Camera</strong>.</li>
                  <li>Ensure Camera access is toggled on and this site is in the Allowed list.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            id="guide-retry-camera-button"
            onClick={() => {
              onClose();
              onRetry();
            }}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Requesting Camera Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};
