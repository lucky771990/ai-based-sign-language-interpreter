import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Server,
  Shield,
  Video,
  Volume2,
  Globe,
  RefreshCw,
  X,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { AppState, ServerHealthStatus } from '../types';
import { getApiBaseUrl } from '../services/aslRecognitionService';
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
  const [customApiUrl, setCustomApiUrl] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('asl_backend_api_url') || '' : '';
  });
  const [testStatus, setTestStatus] = useState<{
    testing: boolean;
    success?: boolean;
    message?: string;
  }>({ testing: false });

  if (!isOpen) return null;

  const currentApiBase = getApiBaseUrl() || (typeof window !== 'undefined' ? window.location.origin : '');
  const isSecure = typeof window !== 'undefined' ? window.isSecureContext : false;
  const hasCameraApi = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
  const hasSpeechApi = speechService.isSupported();
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleSaveApiUrl = () => {
    if (customApiUrl.trim()) {
      localStorage.setItem('asl_backend_api_url', customApiUrl.trim().replace(/\/+$/, ''));
      setTestStatus({
        testing: false,
        success: true,
        message: 'Saved custom backend API URL. Testing connection...'
      });
      runHealthCheck(customApiUrl.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem('asl_backend_api_url');
      setTestStatus({
        testing: false,
        success: true,
        message: 'Reset to default relative API endpoint (/api).'
      });
      runHealthCheck('');
    }
  };

  const runHealthCheck = async (baseUrl: string) => {
    setTestStatus({ testing: true });
    try {
      const endpoint = `${baseUrl || ''}/api/health`;
      const res = await fetch(endpoint, { method: 'GET' });
      if (res.ok) {
        const json = await res.json();
        setTestStatus({
          testing: false,
          success: true,
          message: `Backend online! Gemini configured: ${json.geminiConfigured ? 'YES' : 'NO (Missing server key)'}`
        });
      } else {
        setTestStatus({
          testing: false,
          success: false,
          message: `Backend returned HTTP ${res.status} (${res.statusText})`
        });
      }
    } catch (e: any) {
      setTestStatus({
        testing: false,
        success: false,
        message: `Connection failed: ${e.message || 'Network unreachable'}`
      });
    }
  };

  const diagnosticReport = `ASL Translate Diagnostics Report
----------------------------------------
Timestamp: ${new Date().toISOString()}
Application State: ${appState}
Secure Context (HTTPS): ${isSecure ? 'YES' : 'NO (Camera requires HTTPS or localhost)'}
Camera API Supported: ${hasCameraApi ? 'YES' : 'NO'}
Speech Synthesis Supported: ${hasSpeechApi ? 'YES' : 'NO'}
Active API Base URL: ${currentApiBase || 'Same-origin (/api)'}
Backend Health: ${serverHealth.status}
Gemini Configured on Server: ${serverHealth.geminiConfigured ? 'YES' : 'NO'}
Active Model: ${serverHealth.model || 'gemini-3.7-flash'}
Current Page URL: ${currentUrl}
User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'}
Security Architecture: Server-Side Secret Isolation (GEMINI_API_KEY never in frontend)
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
                System Diagnostics & API Configuration
              </h2>
              <p className="text-xs text-slate-400">
                Runtime health, camera capability, and secure backend connectivity
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

            {/* Backend URL Status */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between sm:col-span-2">
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-sky-400" />
                <span className="text-xs text-slate-300">Active Backend Base URL</span>
              </div>
              <span className="text-xs font-mono text-slate-300 truncate max-w-xs">
                {currentApiBase || 'Same Origin Relative (/api)'}
              </span>
            </div>
          </div>

          {/* Secure Backend API Configuration */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Server className="w-4 h-4 text-indigo-400" />
                <span>Backend API URL Configuration (for GitHub Pages)</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              When the frontend is deployed to GitHub Pages, specify the base URL of your secure backend (e.g. on Cloud Run, Render, or Railway) hosting the private <code className="text-indigo-300 font-mono">GEMINI_API_KEY</code>.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="backend-api-url-input"
                type="text"
                placeholder="https://your-asl-backend.example.com"
                value={customApiUrl}
                onChange={(e) => setCustomApiUrl(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleSaveApiUrl}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Save & Test
              </button>
            </div>

            {testStatus.testing && (
              <p className="text-xs text-indigo-400 flex items-center gap-1.5 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Testing backend connection...
              </p>
            )}

            {!testStatus.testing && testStatus.message && (
              <p className={`text-xs flex items-center gap-1.5 ${testStatus.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                {testStatus.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {testStatus.message}
              </p>
            )}
          </div>

          {/* Security Note */}
          <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 space-y-1">
            <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>Zero Frontend Secret Exposure</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Your <code className="text-indigo-300 font-mono font-semibold">GEMINI_API_KEY</code> is strictly isolated to the server-side environment and never committed to GitHub or bundled into the browser JavaScript.
            </p>
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
