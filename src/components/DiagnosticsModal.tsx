import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Key,
  Shield,
  Video,
  Volume2,
  Globe,
  RefreshCw,
  X,
  Copy,
  Check
} from 'lucide-react';
import { AppState, ServerHealthStatus } from '../types';
import { aslRecognitionService } from '../services/aslRecognitionService';
import { speechService } from '../services/speechService';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  serverHealth: ServerHealthStatus;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  appState,
  serverHealth,
}) => {
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('user_gemini_api_key') || '';
  });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const isSecure = typeof window !== 'undefined' ? window.isSecureContext : false;
  const hasCameraApi = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
  const hasSpeechApi = speechService.isSupported();
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const isStaticHost = !serverHealth.status.includes('online') && serverHealth.status !== 'ready_backend';

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('user_gemini_api_key', apiKey.trim());
      setSaveStatus('API key saved for client-side translations.');
    } else {
      localStorage.removeItem('user_gemini_api_key');
      setSaveStatus('Cleared custom API key.');
    }
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const diagnosticReport = `ASL Translate Diagnostics Report
----------------------------------------
Timestamp: ${new Date().toISOString()}
Application Loaded: YES
Application State: ${appState}
Secure Context (HTTPS): ${isSecure ? 'YES' : 'NO (Camera requires HTTPS or localhost)'}
Camera API Supported: ${hasCameraApi ? 'YES' : 'NO'}
Speech Synthesis Supported: ${hasSpeechApi ? 'YES' : 'NO'}
Environment Mode: ${isStaticHost ? 'Static Host (GitHub Pages / Client-side)' : 'Full-stack (Cloud Run / Express Proxy)'}
Gemini Configured: ${serverHealth.geminiConfigured || Boolean(apiKey) ? 'YES' : 'NO'}
Active AI Model: ${serverHealth.model || 'gemini-3.7-flash'}
Current URL: ${currentUrl}
User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'}
----------------------------------------`;

  const handleCopyReport = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(diagnosticReport);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (e) {
      console.warn('Clipboard write error:', e);
    }
  };

  return (
    <div
      id="diagnostics-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="diagnostics-modal-dialog"
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-950 border border-indigo-500/30 text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                System Diagnostics & Settings
              </h2>
              <p className="text-xs text-slate-400">
                Runtime environment health and configuration status
              </p>
            </div>
          </div>
          <button
            id="close-diagnostics-button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Health Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* App State */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span className="text-xs text-slate-300">App State</span>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                {appState}
              </span>
            </div>

            {/* Secure Context */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-300">Secure Context (HTTPS)</span>
              </div>
              {isSecure ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> YES
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-rose-400 font-semibold">
                  <XCircle className="w-3.5 h-3.5" /> NO
                </span>
              )}
            </div>

            {/* Camera API */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Video className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-slate-300">Camera Media API</span>
              </div>
              {hasCameraApi ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Supported
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-rose-400 font-semibold">
                  <XCircle className="w-3.5 h-3.5" /> Unsupported
                </span>
              )}
            </div>

            {/* Speech Synthesis */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-slate-300">Speech Synthesis</span>
              </div>
              {hasSpeechApi ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Supported
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-slate-400 font-semibold">
                  Unavailable
                </span>
              )}
            </div>

            {/* Environment Host */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between sm:col-span-2">
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-sky-400" />
                <span className="text-xs text-slate-300">Deployment Target</span>
              </div>
              <span className="text-xs font-mono text-slate-300">
                {isStaticHost ? 'GitHub Pages (Static Client-Side)' : 'Full-Stack Express Proxy'}
              </span>
            </div>
          </div>

          {/* Optional Client-Side Gemini Key for GitHub Pages */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Key className="w-4 h-4 text-amber-400" />
              <span>Optional Client-Side Gemini API Key</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              When hosted statically on GitHub Pages without a backend server, you can optionally provide your Gemini API key directly to enable AI vision recognition in your browser. Stored only in your local browser storage.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="gemini-api-key-input"
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Save Key
              </button>
            </div>
            {saveStatus && (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {saveStatus}
              </p>
            )}
          </div>

          {/* Diagnostic Raw Report */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Raw Diagnostic Report
              </span>
              <button
                onClick={handleCopyReport}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Report</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
              {diagnosticReport}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
