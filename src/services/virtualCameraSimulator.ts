/**
 * Virtual Camera Simulator
 * Provides a synthetic video stream rendering animated sign language gestures
 * on an HTML5 canvas. Used when camera access is denied, unavailable, or when
 * testing in sandboxed iframes without physical webcam hardware.
 */

export interface SimulationSignGesture {
  gloss: string;
  label: string;
  durationMs: number;
  description: string;
}

export const SIMULATION_SIGNS: SimulationSignGesture[] = [
  { gloss: 'HELLO', label: 'Hello (Open Hand Wave)', durationMs: 2200, description: 'Open hand touches temple and moves forward-right' },
  { gloss: 'THANK-YOU', label: 'Thank You (Chin to Outward)', durationMs: 2000, description: 'Flat hand touches chin and extends outward' },
  { gloss: 'ME', label: 'Me / I (Chest Point)', durationMs: 1800, description: 'Index finger touches upper center chest' },
  { gloss: 'YOU', label: 'You (Forward Point)', durationMs: 1800, description: 'Index finger points forward toward interlocutor' },
  { gloss: 'WANT', label: 'Want (Two-Hand Pull)', durationMs: 2400, description: 'Both hands claw and pull inward toward body' },
  { gloss: 'WATER', label: 'Water (W-Hand Chin Tap)', durationMs: 2000, description: 'W-handshape index finger taps chin twice' },
  { gloss: 'PLEASE', label: 'Please (Chest Circle)', durationMs: 2400, description: 'Flat hand rubs circular clockwise motion on chest' },
  { gloss: 'GO', label: 'Go (Rolling Forward)', durationMs: 2000, description: 'Both index fingers arc forward and down' },
  { gloss: 'SCHOOL', label: 'School (Double Clap)', durationMs: 2200, description: 'Dominant open hand claps across base open hand' },
];

class VirtualCameraSimulator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private stream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private isRunning: boolean = false;
  private currentSignIndex: number = 0;
  private signStartTime: number = 0;
  private autoCycle: boolean = true;
  private onSignChangeCallback: ((gloss: string) => void) | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 480;
    this.ctx = this.canvas.getContext('2d');
  }

  public start(onSignChange?: (gloss: string) => void): MediaStream {
    this.stop();
    this.isRunning = true;
    this.signStartTime = Date.now();
    this.onSignChangeCallback = onSignChange || null;

    if (onSignChange) {
      onSignChange(SIMULATION_SIGNS[this.currentSignIndex].gloss);
    }

    this.renderLoop();

    try {
      if (this.canvas.captureStream) {
        this.stream = this.canvas.captureStream(30);
      } else {
        // Fallback for older browsers
        const fallbackStream = (this.canvas as any).mozCaptureStream?.(30);
        this.stream = fallbackStream || null;
      }
    } catch (e) {
      console.warn('Canvas captureStream error:', e);
      this.stream = null;
    }

    return this.stream as MediaStream;
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }

  public isSimulating(): boolean {
    return this.isRunning;
  }

  public setSign(gloss: string) {
    const idx = SIMULATION_SIGNS.findIndex((s) => s.gloss.toUpperCase() === gloss.toUpperCase());
    if (idx !== -1) {
      this.currentSignIndex = idx;
      this.signStartTime = Date.now();
      if (this.onSignChangeCallback) {
        this.onSignChangeCallback(SIMULATION_SIGNS[this.currentSignIndex].gloss);
      }
    }
  }

  public setAutoCycle(enabled: boolean) {
    this.autoCycle = enabled;
  }

  public getCurrentSign(): SimulationSignGesture {
    return SIMULATION_SIGNS[this.currentSignIndex];
  }

  private renderLoop = () => {
    if (!this.isRunning || !this.ctx) return;

    const now = Date.now();
    const currentSign = SIMULATION_SIGNS[this.currentSignIndex];
    let elapsed = now - this.signStartTime;

    if (elapsed > currentSign.durationMs) {
      if (this.autoCycle) {
        this.currentSignIndex = (this.currentSignIndex + 1) % SIMULATION_SIGNS.length;
        this.signStartTime = now;
        elapsed = 0;
        if (this.onSignChangeCallback) {
          this.onSignChangeCallback(SIMULATION_SIGNS[this.currentSignIndex].gloss);
        }
      } else {
        // Loop current sign
        this.signStartTime = now;
        elapsed = 0;
      }
    }

    const progress = Math.min(1, Math.max(0, elapsed / currentSign.durationMs));

    this.drawFrame(currentSign.gloss, progress);

    this.animFrameId = requestAnimationFrame(this.renderLoop);
  };

  private drawFrame(gloss: string, progress: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. Studio backdrop
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, 380);
    bgGrad.addColorStop(0, '#1e1b4b'); // Deep indigo
    bgGrad.addColorStop(0.6, '#0f172a'); // Slate 900
    bgGrad.addColorStop(1, '#020617'); // Slate 950
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle grid/studio lines
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 40; x < w; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 40; y < h; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 2. Head & Torso Silhouette
    const centerX = w / 2;
    const faceY = 130;
    const shoulderY = 240;

    // Torso / Shoulders
    ctx.fillStyle = '#1e293b'; // Slate 800
    ctx.beginPath();
    ctx.moveTo(centerX - 120, h);
    ctx.quadraticCurveTo(centerX - 100, shoulderY + 40, centerX - 60, shoulderY);
    ctx.quadraticCurveTo(centerX, shoulderY + 20, centerX + 60, shoulderY);
    ctx.quadraticCurveTo(centerX + 100, shoulderY + 40, centerX + 120, h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Neck
    ctx.fillStyle = '#fbcfe8'; // Skin tone base
    ctx.fillRect(centerX - 18, faceY + 50, 36, 45);

    // Head / Face
    ctx.fillStyle = '#fde047'; // Stylized golden facial tone
    ctx.beginPath();
    ctx.ellipse(centerX, faceY, 44, 56, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(centerX - 15, faceY - 5, 4, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(centerX + 15, faceY - 5, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows (animated question vs neutral)
    const isQuestion = gloss === 'WHAT' || gloss === 'WHERE' || gloss === 'YOU';
    const browOffset = isQuestion ? Math.sin(progress * Math.PI) * 4 : 0;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(centerX - 24, faceY - 14 - browOffset);
    ctx.lineTo(centerX - 8, faceY - 12 - browOffset);
    ctx.moveTo(centerX + 8, faceY - 12 - browOffset);
    ctx.lineTo(centerX + 24, faceY - 14 - browOffset);
    ctx.stroke();

    // Mouth / Expression
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, faceY + 18, 10, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    // 3. Animated Hands based on current Sign
    this.drawGestureHands(ctx, centerX, faceY, shoulderY, gloss, progress);

    // 4. Overlays & HUD
    // Top banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(16, 16, 260, 48);
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(16, 16, 260, 48);

    // Simulation Badge
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.arc(32, 40, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`SIMULATED SIGN: ${gloss}`, 46, 36);

    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Virtual Vision Simulator (No Webcam Req)', 46, 50);

    // Progress bar
    ctx.fillStyle = '#312e81';
    ctx.fillRect(16, 62, 260, 4);
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(16, 62, 260 * progress, 4);
  }

  private drawGestureHands(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    faceY: number,
    shoulderY: number,
    gloss: string,
    p: number
  ) {
    // Phase sine wave for smooth natural hand oscillation
    const sine = Math.sin(p * Math.PI);
    const doubleCycle = Math.sin(p * Math.PI * 2);

    let rightX = centerX + 80;
    let rightY = shoulderY + 80;
    let rightOpenness = 0.8;
    let rightRotation = 0;

    let leftX = centerX - 80;
    let leftY = shoulderY + 80;
    let leftOpenness = 0.8;
    let isTwoHanded = false;

    switch (gloss) {
      case 'HELLO': {
        // Right hand touches temple and moves right-outward with slight wave
        const stroke = p < 0.3 ? p / 0.3 : (p - 0.3) / 0.7;
        if (p < 0.3) {
          rightX = centerX + 40 + stroke * 15;
          rightY = faceY - 10 + stroke * 5;
        } else {
          rightX = centerX + 55 + stroke * 70;
          rightY = faceY - 5 + Math.sin(stroke * Math.PI * 3) * 10;
        }
        rightOpenness = 0.95;
        rightRotation = 0.2 + sine * 0.15;
        break;
      }
      case 'THANK-YOU': {
        // Right flat hand touches chin then moves down and forward
        if (p < 0.4) {
          rightX = centerX;
          rightY = faceY + 25;
        } else {
          const t = (p - 0.4) / 0.6;
          rightX = centerX + t * 40;
          rightY = faceY + 25 + t * 65;
        }
        rightOpenness = 1.0;
        rightRotation = -0.3 * sine;
        break;
      }
      case 'ME': {
        // Right index finger points to center of chest
        rightX = centerX + 10 - sine * 15;
        rightY = shoulderY + 25 + doubleCycle * 5;
        rightOpenness = 0.2; // Pointing index
        rightRotation = -0.8;
        break;
      }
      case 'YOU': {
        // Right index points straight toward camera
        rightX = centerX + 30 + sine * 40;
        rightY = shoulderY + 20 - sine * 10;
        rightOpenness = 0.2; // Pointing forward
        rightRotation = 0;
        break;
      }
      case 'WANT': {
        // Two hands pull inward toward body
        isTwoHanded = true;
        const pull = (1 - p) * 50;
        rightX = centerX + 60 + pull;
        rightY = shoulderY + 60 - sine * 15;
        leftX = centerX - 60 - pull;
        leftY = shoulderY + 60 - sine * 15;
        rightOpenness = 0.6; // Clawed hand
        leftOpenness = 0.6;
        break;
      }
      case 'WATER': {
        // W-handshape index taps chin twice
        rightX = centerX + 8;
        rightY = faceY + 25 + Math.abs(doubleCycle) * 10;
        rightOpenness = 0.7; // 3 fingers (W)
        rightRotation = 0.1;
        break;
      }
      case 'PLEASE': {
        // Flat hand circular clockwise rubbing motion on chest
        const angle = p * Math.PI * 4;
        rightX = centerX + Math.cos(angle) * 25;
        rightY = shoulderY + 30 + Math.sin(angle) * 20;
        rightOpenness = 0.95;
        rightRotation = 0.3;
        break;
      }
      case 'GO': {
        // Both hands arc forward
        isTwoHanded = true;
        rightX = centerX + 40 + p * 60;
        rightY = shoulderY + 40 + Math.sin(p * Math.PI) * -30;
        leftX = centerX - 40 + p * 60;
        leftY = shoulderY + 40 + Math.sin(p * Math.PI) * -30;
        rightOpenness = 0.2;
        leftOpenness = 0.2;
        break;
      }
      case 'SCHOOL': {
        // Clapping dominant hand down onto flat base hand
        isTwoHanded = true;
        leftX = centerX - 15;
        leftY = shoulderY + 50;
        leftOpenness = 0.9;
        rightX = centerX + 10;
        rightY = leftY - 30 + Math.abs(doubleCycle) * 30;
        rightOpenness = 0.9;
        break;
      }
      default: {
        rightX = centerX + 70 + sine * 20;
        rightY = shoulderY + 40;
        break;
      }
    }

    // Draw Left Hand if two handed
    if (isTwoHanded) {
      this.drawHandIcon(ctx, leftX, leftY, leftOpenness, false, 0);
    }

    // Draw Right Dominant Hand
    this.drawHandIcon(ctx, rightX, rightY, rightOpenness, true, rightRotation);
  }

  private drawHandIcon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    openness: number,
    isRight: boolean,
    rotation: number
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Glowing hand aura
    ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();

    // Palm
    ctx.fillStyle = '#fde047'; // Stylized hand color
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 5, 18, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Fingers
    const numFingers = 4;
    const fingerSpacing = 7;
    const fingerLen = 14 + openness * 14;

    for (let i = 0; i < numFingers; i++) {
      const fx = (i - 1.5) * fingerSpacing;
      const isCurled = openness < 0.4 && i > 0;
      const curLen = isCurled ? 6 : fingerLen;

      ctx.beginPath();
      ctx.moveTo(fx, -5);
      ctx.lineTo(fx, -curLen);
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#fde047';
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#f59e0b';
      ctx.stroke();
    }

    // Thumb
    const thumbDir = isRight ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(thumbDir * 14, 8);
    ctx.lineTo(thumbDir * 24, 2);
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#fde047';
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    ctx.restore();
  }
}

export const virtualCameraSimulator = new VirtualCameraSimulator();
