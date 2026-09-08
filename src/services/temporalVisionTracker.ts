import { HandFeatureTelemetry, SignSegmentEvent } from '../types';

export type { SignSegmentEvent };
export type SignSegmentCallback = (event: SignSegmentEvent) => void;
export type TelemetryCallback = (telemetry: HandFeatureTelemetry) => void;

class TemporalVisionTracker {
  private analysisCanvas: HTMLCanvasElement;
  private analysisCtx: CanvasRenderingContext2D | null;
  private captureCanvas: HTMLCanvasElement;
  private captureCtx: CanvasRenderingContext2D | null;

  private prevFrameData: Uint8ClampedArray | null = null;
  private isTracking: boolean = false;
  private animFrameId: number | null = null;

  // Telemetry state
  private currentTelemetry: HandFeatureTelemetry = {
    leftHandDetected: false,
    rightHandDetected: false,
    dominantHand: 'none',
    leftHandOpenness: 0.5,
    rightHandOpenness: 0.5,
    leftHandPos: { x: 0.25, y: 0.5, width: 0.15, height: 0.15 },
    rightHandPos: { x: 0.75, y: 0.5, width: 0.15, height: 0.15 },
    faceAnchor: { x: 0.5, y: 0.22, width: 0.2, height: 0.25 },
    velocity: 0,
    movementDirection: 'stationary',
    relativeHandDistance: 0.5,
    isTwoHandedSign: false,
    segmentationState: 'IDLE',
  };

  // State Machine Timers & Thresholds
  private stateStartTime: number = Date.now();
  private strokeStartTime: number = 0;
  private holdStartTime: number = 0;
  private lastSignEmitTime: number = 0;
  private trajectoryHistory: { x: number; y: number; t: number }[] = [];
  private capturedKeyframes: { frame: string; t: number; velocity: number }[] = [];

  // Callbacks
  private onSegmentListeners: SignSegmentCallback[] = [];
  private onTelemetryListeners: TelemetryCallback[] = [];

  constructor() {
    this.analysisCanvas = document.createElement('canvas');
    this.analysisCanvas.width = 160;
    this.analysisCanvas.height = 120;
    this.analysisCtx = this.analysisCanvas.getContext('2d', { willReadFrequently: true });

    this.captureCanvas = document.createElement('canvas');
    this.captureCanvas.width = 380;
    this.captureCanvas.height = 285;
    this.captureCtx = this.captureCanvas.getContext('2d', { willReadFrequently: true });
  }

  public onSignSegment(cb: SignSegmentCallback) {
    this.onSegmentListeners.push(cb);
  }

  public offSignSegment(cb: SignSegmentCallback) {
    this.onSegmentListeners = this.onSegmentListeners.filter((l) => l !== cb);
  }

  public onTelemetry(cb: TelemetryCallback) {
    this.onTelemetryListeners.push(cb);
  }

  public offTelemetry(cb: TelemetryCallback) {
    this.onTelemetryListeners = this.onTelemetryListeners.filter((l) => l !== cb);
  }

  public getTelemetry(): HandFeatureTelemetry {
    return { ...this.currentTelemetry };
  }

  /**
   * Starts real-time computer vision frame analysis on the video element
   */
  public start(
    video: HTMLVideoElement,
    onTelemetry?: TelemetryCallback,
    onSegment?: SignSegmentCallback
  ) {
    if (onTelemetry) {
      this.onTelemetry(onTelemetry);
    }
    if (onSegment) {
      this.onSignSegment(onSegment);
    }
    this.startTracking(video);
  }

  public stop() {
    this.stopTracking();
  }

  public startTracking(video: HTMLVideoElement) {
    if (this.isTracking) return;
    this.isTracking = true;

    let lastTick = 0;
    const processLoop = (timestamp: number) => {
      if (!this.isTracking) return;

      // Throttle analysis to ~24-30 fps to maximize efficiency
      if (timestamp - lastTick >= 33) {
        lastTick = timestamp;
        this.analyzeFrame(video);
      }

      this.animFrameId = requestAnimationFrame(processLoop);
    };

    this.animFrameId = requestAnimationFrame(processLoop);
  }

  public stopTracking() {
    this.isTracking = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.prevFrameData = null;
    this.capturedKeyframes = [];
    this.currentTelemetry.segmentationState = 'IDLE';
  }

  /**
   * Core frame analysis: multi-hand detection, velocity, orientation,
   * two-handed spatial relation, and temporal sign segmentation.
   */
  private analyzeFrame(video: HTMLVideoElement) {
    if (!video || video.readyState < 2 || !this.analysisCtx) return;

    const W = this.analysisCanvas.width;
    const H = this.analysisCanvas.height;

    // 1. Draw downscaled frame
    this.analysisCtx.drawImage(video, 0, 0, W, H);
    let imgData: ImageData;
    try {
      imgData = this.analysisCtx.getImageData(0, 0, W, H);
    } catch {
      return;
    }

    const data = imgData.data;
    const now = Date.now();

    // 2. Identify motion and skin-chrominance pixels
    let totalMotionPixels = 0;
    let motionCenterX = 0;
    let motionCenterY = 0;

    let leftHandPixels = 0;
    let leftHandSumX = 0;
    let leftHandSumY = 0;
    let leftMinX = W, leftMaxX = 0, leftMinY = H, leftMaxY = 0;

    let rightHandPixels = 0;
    let rightHandSumX = 0;
    let rightHandSumY = 0;
    let rightMinX = W, rightMaxX = 0, rightMinY = H, rightMaxY = 0;

    let facePixels = 0;
    let faceSumX = 0;
    let faceSumY = 0;

    const prevData = this.prevFrameData;
    const midX = W / 2;
    const faceBottom = H * 0.38;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Adaptive skin chrominance test in YCbCr & RGB space
        const isSkin =
          r > 45 && g > 30 && b > 20 &&
          r > g && r > b &&
          Math.abs(r - g) > 10 &&
          (r - g >= 12 || (r > 100 && g > 75 && b > 60));

        // Motion differencing
        let isMotion = false;
        if (prevData) {
          const diff = Math.abs(r - prevData[idx]) + Math.abs(g - prevData[idx + 1]) + Math.abs(b - prevData[idx + 2]);
          if (diff > 35) {
            isMotion = true;
            totalMotionPixels++;
            motionCenterX += x;
            motionCenterY += y;
          }
        }

        if (isSkin) {
          if (y < faceBottom && x > W * 0.25 && x < W * 0.75) {
            // Face zone
            facePixels++;
            faceSumX += x;
            faceSumY += y;
          } else {
            // Hand zone: split into Left Hand (left side of frame) and Right Hand (right side)
            if (x < midX) {
              leftHandPixels++;
              leftHandSumX += x;
              leftHandSumY += y;
              if (x < leftMinX) leftMinX = x;
              if (x > leftMaxX) leftMaxX = x;
              if (y < leftMinY) leftMinY = y;
              if (y > leftMaxY) leftMaxY = y;
            } else {
              rightHandPixels++;
              rightHandSumX += x;
              rightHandSumY += y;
              if (x < rightMinX) rightMinX = x;
              if (x > rightMaxX) rightMaxX = x;
              if (y < rightMinY) rightMinY = y;
              if (y > rightMaxY) rightMaxY = y;
            }
          }
        }
      }
    }

    // Save current frame for next diff
    if (!this.prevFrameData) {
      this.prevFrameData = new Uint8ClampedArray(data);
    } else {
      this.prevFrameData.set(data);
    }

    // Normalize centroids
    const leftDetected = leftHandPixels > 45;
    const rightDetected = rightHandPixels > 45;

    const leftNormX = leftDetected ? leftHandSumX / leftHandPixels / W : 0.3;
    const leftNormY = leftDetected ? leftHandSumY / leftHandPixels / H : 0.6;
    const leftWidth = leftDetected ? Math.max(0.1, (leftMaxX - leftMinX) / W) : 0.12;
    const leftHeight = leftDetected ? Math.max(0.1, (leftMaxY - leftMinY) / H) : 0.12;

    const rightNormX = rightDetected ? rightHandSumX / rightHandPixels / W : 0.7;
    const rightNormY = rightDetected ? rightHandSumY / rightHandPixels / H : 0.6;
    const rightWidth = rightDetected ? Math.max(0.1, (rightMaxX - rightMinX) / W) : 0.12;
    const rightHeight = rightDetected ? Math.max(0.1, (rightMaxY - rightMinY) / H) : 0.12;

    // Hand Openness (density of skin pixels inside bounding box)
    const leftBoxArea = (leftMaxX - leftMinX + 1) * (leftMaxY - leftMinY + 1);
    const rightBoxArea = (rightMaxX - rightMinX + 1) * (rightMaxY - rightMinY + 1);
    const leftOpenness = leftDetected && leftBoxArea > 0 ? Math.min(1, Math.max(0, leftHandPixels / (leftBoxArea * 0.75))) : 0.5;
    const rightOpenness = rightDetected && rightBoxArea > 0 ? Math.min(1, Math.max(0, rightHandPixels / (rightBoxArea * 0.75))) : 0.5;

    // Dominant Hand Estimation & Primary Active Centroid
    let primaryX = 0.5;
    let primaryY = 0.6;
    let dominant: 'right' | 'left' | 'none' = 'none';

    if (rightDetected && !leftDetected) {
      dominant = 'right';
      primaryX = rightNormX;
      primaryY = rightNormY;
    } else if (leftDetected && !rightDetected) {
      dominant = 'left';
      primaryX = leftNormX;
      primaryY = leftNormY;
    } else if (leftDetected && rightDetected) {
      // Both detected - determine which has more motion/size
      dominant = rightHandPixels >= leftHandPixels ? 'right' : 'left';
      primaryX = (leftNormX + rightNormX) / 2;
      primaryY = (leftNormY + rightNormY) / 2;
    }

    // Relative distance between both hands
    const handDist = leftDetected && rightDetected
      ? Math.sqrt(Math.pow(rightNormX - leftNormX, 2) + Math.pow(rightNormY - leftNormY, 2))
      : 1.0;
    const isTwoHanded = leftDetected && rightDetected && handDist < 0.45;

    // Velocity & Trajectory calculation
    let velocity = 0;
    let movementDirection: HandFeatureTelemetry['movementDirection'] = 'stationary';

    if (this.trajectoryHistory.length > 0) {
      const last = this.trajectoryHistory[this.trajectoryHistory.length - 1];
      const dt = (now - last.t) / 1000;
      if (dt > 0.01) {
        const dx = primaryX - last.x;
        const dy = primaryY - last.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        velocity = Math.min(2.5, dist / dt);

        if (dist > 0.03) {
          if (Math.abs(dy) > Math.abs(dx) * 1.3) {
            movementDirection = dy < 0 ? 'up' : 'down';
          } else if (Math.abs(dx) > Math.abs(dy) * 1.3) {
            movementDirection = dx < 0 ? 'left' : 'right';
          } else {
            movementDirection = 'circular';
          }
        }
      }
    }

    // Keep trajectory queue (last 10 samples)
    this.trajectoryHistory.push({ x: primaryX, y: primaryY, t: now });
    if (this.trajectoryHistory.length > 10) {
      this.trajectoryHistory.shift();
    }

    // Face Anchor
    const faceAnchor = facePixels > 30
      ? {
          x: faceSumX / facePixels / W,
          y: faceSumY / facePixels / H,
          width: 0.22,
          height: 0.26,
        }
      : { x: 0.5, y: 0.22, width: 0.22, height: 0.26 };

    // 3. Temporal Sign Segmentation State Machine:
    // IDLE -> PREPARATION -> STROKE -> HOLD -> TRANSITION
    const prevState = this.currentTelemetry.segmentationState;
    let nextState = prevState;

    const handsActive = leftDetected || rightDetected;
    const isHighVelocity = velocity > 0.28;
    const isStationary = velocity < 0.12;

    switch (prevState) {
      case 'IDLE':
        if (handsActive && (isHighVelocity || primaryY < 0.72)) {
          nextState = 'PREPARATION';
          this.stateStartTime = now;
        }
        break;

      case 'PREPARATION':
        if (!handsActive) {
          nextState = 'IDLE';
        } else if (isHighVelocity) {
          nextState = 'STROKE';
          this.strokeStartTime = now;
          this.stateStartTime = now;
          this.capturedKeyframes = [];
          this.captureCurrentKeyframe(video, velocity);
        } else if (now - this.stateStartTime > 1200) {
          nextState = 'IDLE';
        }
        break;

      case 'STROKE':
        this.captureCurrentKeyframe(video, velocity);
        if (!handsActive) {
          nextState = 'IDLE';
        } else if (isStationary && now - this.strokeStartTime > 160) {
          nextState = 'HOLD';
          this.holdStartTime = now;
          this.stateStartTime = now;
          this.captureCurrentKeyframe(video, velocity);
        } else if (now - this.strokeStartTime > 1800) {
          // Stroke prolonged -> complete sign
          nextState = 'TRANSITION';
          this.stateStartTime = now;
        }
        break;

      case 'HOLD':
        if (!handsActive || isHighVelocity) {
          nextState = 'TRANSITION';
          this.stateStartTime = now;
        } else if (now - this.holdStartTime > 220) {
          // Hold completed! The sign is complete
          nextState = 'TRANSITION';
          this.stateStartTime = now;
        }
        break;

      case 'TRANSITION':
        // Trigger sign segment event if not triggered recently
        if (now - this.lastSignEmitTime > 400 && this.capturedKeyframes.length > 0) {
          this.emitSignSegment(now);
        }
        if (isStationary || !handsActive) {
          nextState = 'IDLE';
        } else if (isHighVelocity) {
          nextState = 'PREPARATION';
          this.stateStartTime = now;
        }
        break;
    }

    // Update telemetry state
    this.currentTelemetry = {
      leftHandDetected: leftDetected,
      rightHandDetected: rightDetected,
      dominantHand: dominant,
      leftHandOpenness: leftOpenness,
      rightHandOpenness: rightOpenness,
      leftHandPos: { x: leftNormX, y: leftNormY, width: leftWidth, height: leftHeight },
      rightHandPos: { x: rightNormX, y: rightNormY, width: rightWidth, height: rightHeight },
      faceAnchor,
      velocity: parseFloat(velocity.toFixed(2)),
      movementDirection,
      relativeHandDistance: parseFloat(handDist.toFixed(2)),
      isTwoHandedSign: isTwoHanded,
      segmentationState: nextState,
      nonManualExpression: isTwoHanded ? 'Engaged bilateral focus' : undefined,
    };

    // Notify telemetry listeners
    for (const listener of this.onTelemetryListeners) {
      try {
        listener(this.currentTelemetry);
      } catch (e) {
        console.warn('Telemetry listener error:', e);
      }
    }
  }

  /**
   * Captures a keyframe during stroke/hold
   */
  private captureCurrentKeyframe(video: HTMLVideoElement, velocity: number) {
    if (!video || video.readyState < 2 || !this.captureCtx) return;
    try {
      const W = this.captureCanvas.width;
      const H = this.captureCanvas.height;
      this.captureCtx.drawImage(video, 0, 0, W, H);
      const frame = this.captureCanvas.toDataURL('image/jpeg', 0.65);
      this.capturedKeyframes.push({ frame, t: Date.now(), velocity });

      // Keep at most 6 keyframes in buffer
      if (this.capturedKeyframes.length > 6) {
        this.capturedKeyframes.shift();
      }
    } catch {
      // Ignored
    }
  }

  /**
   * Dispatches a completed sign segment to listeners
   */
  private emitSignSegment(now: number) {
    if (this.capturedKeyframes.length === 0) return;

    this.lastSignEmitTime = now;
    const durationMs = this.strokeStartTime > 0 ? now - this.strokeStartTime : 400;

    // Pick onset, apex (peak velocity), and hold frame
    const frames = this.capturedKeyframes.map((k) => k.frame);
    let apexFrame = frames[Math.floor(frames.length / 2)] || frames[0];

    // Find frame with highest velocity as apex
    let maxVel = -1;
    for (const k of this.capturedKeyframes) {
      if (k.velocity > maxVel) {
        maxVel = k.velocity;
        apexFrame = k.frame;
      }
    }

    const event: SignSegmentEvent = {
      id: `seg-${now}-${Math.random().toString(36).slice(2, 6)}`,
      keyframes: frames.slice(0, 3),
      telemetry: { ...this.currentTelemetry },
      durationMs,
      timestamp: now,
      isTwoHanded: this.currentTelemetry.isTwoHandedSign,
      apexFrame,
    };

    this.capturedKeyframes = [];

    for (const listener of this.onSegmentListeners) {
      try {
        listener(event);
      } catch (err) {
        console.warn('Sign segment listener error:', err);
      }
    }
  }

  /**
   * Renders visual landmark overlays on an external canvas (for debug / preview)
   */
  public renderOverlay(
    canvas: HTMLCanvasElement,
    telemetry: HandFeatureTelemetry = this.currentTelemetry,
    mirrored = false
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const transformX = (normX: number) => {
      return (mirrored ? 1 - normX : normX) * w;
    };

    // Draw Face Zone Anchor
    if (telemetry.faceAnchor) {
      const fx = transformX(telemetry.faceAnchor.x);
      const fy = telemetry.faceAnchor.y * h;
      const fw = telemetry.faceAnchor.width * w;
      const fh = telemetry.faceAnchor.height * h;

      ctx.save();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(fx - fw / 2, fy - fh / 2, fw, fh);
      ctx.fillStyle = 'rgba(99, 102, 241, 0.8)';
      ctx.font = '10px monospace';
      ctx.fillText('FACE / NMM ZONE', fx - fw / 2, fy - fh / 2 - 4);
      ctx.restore();
    }

    // Draw Left Hand Box
    if (telemetry.leftHandDetected) {
      const lx = transformX(telemetry.leftHandPos.x);
      const ly = telemetry.leftHandPos.y * h;
      const lw = telemetry.leftHandPos.width * w;
      const lh = telemetry.leftHandPos.height * h;

      ctx.save();
      ctx.strokeStyle = '#38bdf8'; // Sky blue
      ctx.lineWidth = 2;
      ctx.strokeRect(lx - lw / 2, ly - lh / 2, lw, lh);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `L-HAND (${Math.round(telemetry.leftHandOpenness * 100)}%)`,
        lx - lw / 2,
        ly - lh / 2 - 4
      );
      ctx.restore();
    }

    // Draw Right Hand Box
    if (telemetry.rightHandDetected) {
      const rx = transformX(telemetry.rightHandPos.x);
      const ry = telemetry.rightHandPos.y * h;
      const rw = telemetry.rightHandPos.width * w;
      const rh = telemetry.rightHandPos.height * h;

      ctx.save();
      ctx.strokeStyle = '#a855f7'; // Purple
      ctx.lineWidth = 2;
      ctx.strokeRect(rx - rw / 2, ry - rh / 2, rw, rh);
      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `R-HAND (${Math.round(telemetry.rightHandOpenness * 100)}%)`,
        rx - rw / 2,
        ry - rh / 2 - 4
      );
      ctx.restore();
    }

    // Draw Two-Hand Connection Link if active
    if (telemetry.isTwoHandedSign && telemetry.leftHandDetected && telemetry.rightHandDetected) {
      const lx = transformX(telemetry.leftHandPos.x);
      const ly = telemetry.leftHandPos.y * h;
      const rx = transformX(telemetry.rightHandPos.x);
      const ry = telemetry.rightHandPos.y * h;

      ctx.save();
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.7)'; // Pink
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(rx, ry);
      ctx.stroke();
      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('2-HANDED GESTURE', (lx + rx) / 2 - 40, (ly + ry) / 2 - 6);
      ctx.restore();
    }

    // Draw Segmentation State Badge at bottom right of canvas
    ctx.save();
    const stateColors: Record<string, string> = {
      IDLE: '#64748b',
      PREPARATION: '#f59e0b',
      STROKE: '#ef4444',
      HOLD: '#10b981',
      TRANSITION: '#8b5cf6',
    };
    const color = stateColors[telemetry.segmentationState] || '#64748b';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(w - 150, h - 35, 140, 26);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(w - 150, h - 35, 140, 26);

    ctx.fillStyle = color;
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`STATE: ${telemetry.segmentationState}`, w - 142, h - 18);
    ctx.restore();
  }
}

export const temporalVisionTracker = new TemporalVisionTracker();
