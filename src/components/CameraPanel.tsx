import React, { useRef, useEffect, useState } from 'react';
import {
  CameraPermissionState,
  CameraSettings,
  RecognitionStatus
} from '../types';
import {
  Camera,
  CameraOff,
  FlipHorizontal,
  Play,
  Square,
  RefreshCw,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Maximize2,
  Minimize2,
  Zap,
  Layers,
  ExternalLink
} from 'lucide-react';

interface CameraPanelProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraPermission: CameraPermissionState;
  permissionError: string | null;
  isTranslating: boolean;
  recognitionStatus: RecognitionStatus;
  rateLimitCooldownSeconds?: number;
  settings: CameraSettings;
  availableDevices: MediaDeviceInfo[];
  onStartCameraAndTranslation: () => void;
  onStopCameraAndTranslation: () => void;
  onToggleTranslation: () => void;
  onToggleMirror: () => void;
  onSwitchDevice: (deviceId: string) => void;
  onManualSnap: () => void;
  onOpenPermissionGuide: () => void;
  visualFlash: boolean;
}

export const CameraPanel: React.FC<CameraPanelProps> = ({
  videoRef,
  cameraPermission,
  permissionError,
  isTranslating,
  recognitionStatus,
  rateLimitCooldownSeconds = 0,
  settings,
  availableDevices,
  onStartCameraAndTranslation,
  onStopCameraAndTranslation,
  onToggleTranslation,
  onToggleMirror,
  onSwitchDevice,
  onManualSnap,
  onOpenPermissionGuide,
  visualFlash,
}) => {
  const [showGuidelines, setShowGuidelines] = useState(true);

  return (
    <div
      id="camera-panel-container"
      className="flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
    >
      {/* Top Panel Bar */}
      <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Camera className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">Camera Feed</span>

          {cameraPermission === 'granted' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              ACTIVE
            </span>
          )}
        </div>

        {/* Quick View Controls */}
        {cameraPermission === 'granted' && (
          <div className="flex items-center gap-1.5">
            {/* Mirror Toggle */}
            <button
              id="toggle-mirror-button"
              onClick={onToggleMirror}
              title={settings.mirrored ? 'Disable Mirror' : 'Enable Mirror'}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 cursor-pointer ${
                settings.mirrored
                  ? 'bg-indigo-950/80 border-indigo-500/40 text-indigo-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mirror</span>
            </button>

            {/* Guidelines Toggle */}
            <button
              id="toggle-guidelines-button"
              onClick={() => setShowGuidelines(!showGuidelines)}
              title="Toggle Signing Frame Guide"
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 cursor-pointer ${
                showGuidelines
                  ? 'bg-purple-950/80 border-purple-500/40 text-purple-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Signing Box</span>
            </button>

            {/* Camera Switcher (if multiple cameras exist) */}
            {availableDevices.length > 1 && (
              <select
                id="camera-device-select"
                value={settings.deviceId}
                onChange={(e) => onSwitchDevice(e.target.value)}
                className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {availableDevices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Video Viewport Area */}
      <div className="relative aspect-[4/3] sm:aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
        {/* Actual Video Feed */}
        <video
          ref={videoRef as React.RefObject<HTMLVideoElement>}
          autoPlay
          playsInline
          muted
          id="asl-camera-video"
          className={`w-full h-full object-cover transition-transform duration-200 ${
            settings.mirrored ? 'scale-x-[-1]' : 'scale-x-100'
          } ${cameraPermission === 'granted' ? 'block' : 'hidden'}`}
        />

        {/* Visual Flash Effect on New Sign Capture (Accessibility for Deaf/HOH) */}
        {visualFlash && (
          <div className="absolute inset-0 bg-indigo-400/25 border-4 border-indigo-400 pointer-events-none transition-opacity duration-300 z-20" />
        )}

        {/* Signing Guidelines Overlay */}
        {cameraPermission === 'granted' && showGuidelines && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 z-10">
            <div className="w-[85%] h-[82%] border-2 border-dashed border-indigo-400/40 rounded-3xl relative flex flex-col justify-between p-3 bg-indigo-950/5">
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-indigo-400" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-indigo-400" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-indigo-400" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-indigo-400" />

              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-900/80 text-indigo-300 backdrop-blur-sm border border-indigo-500/30">
                  Head & Face Zone
                </span>
                <span className="text-[10px] text-indigo-300/80 bg-slate-950/70 px-2 py-0.5 rounded">
                  ASL Signing Frame
                </span>
              </div>

              {/* Center Chest signing target */}
              <div className="text-center self-center py-2 px-3 rounded-xl bg-slate-950/70 backdrop-blur-sm border border-indigo-500/20 text-indigo-200 text-xs font-medium max-w-[240px]">
                Position hands clearly inside this frame
              </div>

              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-900/80 text-indigo-300 backdrop-blur-sm border border-indigo-500/30">
                  Dominant Hand Zone
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-900/80 text-indigo-300 backdrop-blur-sm border border-indigo-500/30">
                  Non-Dominant Hand Zone
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Live Processing Indicator Badge inside Video */}
        {cameraPermission === 'granted' && isTranslating && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/80 shadow-lg">
            {recognitionStatus === 'rate_limited' || rateLimitCooldownSeconds > 0 ? (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="text-xs font-semibold text-amber-300">
                  {rateLimitCooldownSeconds > 0
                    ? `Quota Cooldown (${rateLimitCooldownSeconds}s)...`
                    : 'Quota Cooldown...'}
                </span>
              </>
            ) : recognitionStatus === 'analyzing' ? (
              <>
                <span className="animate-spin h-2.5 w-2.5 border-2 border-indigo-400 border-t-transparent rounded-full"></span>
                <span className="text-xs font-semibold text-indigo-300">Analyzing ASL Signs...</span>
              </>
            ) : recognitionStatus === 'capturing' ? (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-purple-400 animate-pulse"></span>
                <span className="text-xs font-semibold text-purple-300">Sampling Frames...</span>
              </>
            ) : (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-semibold text-emerald-300">Listening to Gestures</span>
              </>
            )}
          </div>
        )}

        {/* State: Camera Off or Unrequested */}
        {cameraPermission === 'unrequested' && (
          <div className="text-center p-6 max-w-md space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <CameraOff className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Camera is Off</h3>
              <p className="text-xs text-slate-400 mt-1">
                Camera access is strictly required to recognize ASL signs and translate them to English.
              </p>
            </div>
            <button
              id="camera-prompt-start-button"
              onClick={onStartCameraAndTranslation}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Enable Camera & Start</span>
            </button>
          </div>
        )}

        {/* State: Requesting Camera Permission */}
        {cameraPermission === 'requesting' && (
          <div className="text-center p-6 max-w-md space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <span className="animate-spin h-8 w-8 border-3 border-amber-400 border-t-transparent rounded-full"></span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Waiting for Browser Permission...</h3>
              <p className="text-xs text-amber-200/80 mt-1">
                Please click <strong className="text-white">"Allow"</strong> on the browser's camera permission prompt to proceed.
              </p>
            </div>
          </div>
        )}

        {/* State: Permission Denied or Blocked */}
        {(cameraPermission === 'denied' || cameraPermission === 'blocked') && (
          <div className="text-center p-6 max-w-md space-y-4 bg-rose-950/30 border border-rose-500/30 rounded-2xl m-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-950 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Camera Access Denied</h3>
              <p className="text-xs text-rose-200 leading-relaxed">
                {permissionError ||
                  'Camera access is required to translate ASL. Please allow camera access in your browser settings and try again.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                id="camera-try-again-button"
                onClick={onStartCameraAndTranslation}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
              <button
                id="camera-permission-guide-button"
                onClick={onOpenPermissionGuide}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                <span>How to Unblock</span>
              </button>
              {typeof window !== 'undefined' && window.self !== window.top && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                  <span>Open in New Tab</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* State: Camera Unavailable / Not Found */}
        {cameraPermission === 'unavailable' && (
          <div className="text-center p-6 max-w-md space-y-4 bg-slate-900/90 border border-slate-800 rounded-2xl m-4 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <CameraOff className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Camera Device Not Found</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {permissionError ||
                  'No working video camera was detected on this device. Please connect a webcam or select another video input.'}
              </p>
            </div>

            {/* If there are multiple detected devices, let user pick */}
            {availableDevices.length > 0 && (
              <div className="space-y-1.5 text-left bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <label className="text-[11px] font-semibold text-slate-400">Select Available Camera:</label>
                <select
                  value={settings.deviceId}
                  onChange={(e) => onSwitchDevice(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Default System Camera</option>
                  {availableDevices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                id="camera-retry-detection-button"
                onClick={onStartCameraAndTranslation}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Detection</span>
              </button>
              <button
                id="camera-unavailable-guide-button"
                onClick={onOpenPermissionGuide}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                <span>Camera Guide</span>
              </button>
              {typeof window !== 'undefined' && window.self !== window.top && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                  <span>Open in New Tab</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Panel Controls Bar */}
      <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-400 flex items-center gap-2 w-full sm:w-auto">
          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
          <span>Position hands within frame and sign steadily.</span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {cameraPermission === 'granted' ? (
            <>
              {/* Manual Snap Single Sign analysis button */}
              <button
                id="manual-snap-sign-button"
                onClick={onManualSnap}
                disabled={recognitionStatus === 'analyzing'}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700/80 text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Capture & Translate Current Sign"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Snap Sign Now</span>
              </button>

              {/* Start / Stop Real-Time Translation */}
              <button
                id="toggle-translation-button"
                onClick={onToggleTranslation}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                  isTranslating
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/20'
                }`}
              >
                {isTranslating ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Pause Translation</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume Translation</span>
                  </>
                )}
              </button>

              {/* Turn Off Camera & Stop All Tracks */}
              <button
                id="stop-camera-button"
                onClick={onStopCameraAndTranslation}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-300 transition-colors"
                title="Stop Camera completely"
              >
                <CameraOff className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              id="bottom-start-camera-button"
              onClick={onStartCameraAndTranslation}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Start Camera & Translate</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
