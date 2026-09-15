import {
  ASLRecognitionResult,
  CandidateSign,
  CNNFeatureTensor,
  HandFeatureTelemetry,
  SentenceSpeedMode,
  SentenceStreamResult,
  SignLanguage,
  SigningMode,
} from '../types';
import { languageContextEngine } from './languageContextEngine';

export const RECOGNITION_COOLDOWN = 1500; // 1.5 second recognition lock
export const DUPLICATE_SIMILARITY_THRESHOLD = 0.90; // 90% similarity threshold to prevent duplicate output

export interface HandDetectionCheck {
  hasHand: boolean;
  isStationary: boolean;
  isBlurry: boolean;
  isTooFar: boolean;
  multipleHands: boolean;
  motionAmount: number;
  similarityToPreviousRecognized: number;
  isSameGestureHeld: boolean;
  statusMessage?: string;
}

export function getApiBaseUrl(): string {
  // 1. Build-time or deployment environment variable
  const envUrl = (import.meta as any)?.env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  // 2. User-configured custom backend URL in Diagnostics (for testing standalone serverless backends)
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('asl_backend_api_url');
    if (customUrl && customUrl.trim() !== '') {
      return customUrl.trim().replace(/\/+$/, '');
    }
  }
  // 3. Fallback to same-origin relative path (for local dev or fullstack deployment)
  return '';
}

class ASLRecognitionService {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private motionCanvas: HTMLCanvasElement;
  private motionCtx: CanvasRenderingContext2D | null;
  private isProcessing: boolean = false;
  private lastRecognizedSign: string = '';
  private lastRecognitionTime: number = 0;
  private previousMotionSample: Uint8ClampedArray | null = null;
  private lastRecognizedFingerprint: Uint8Array | null = null;
  private quotaCooldownUntil: number = 0;
  private consecutiveEmptyHandFrames: number = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.motionCanvas = document.createElement('canvas');
    this.motionCanvas.width = 64;
    this.motionCanvas.height = 48;
    this.motionCtx = this.motionCanvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Evaluates if AI Quota Cooldown is active
   */
  public isQuotaCoolingDown(): boolean {
    return Date.now() < this.quotaCooldownUntil;
  }

  public getQuotaCooldownRemainingMs(): number {
    const diff = this.quotaCooldownUntil - Date.now();
    return diff > 0 ? diff : 0;
  }

  public getQuotaCooldownSeconds(): number {
    const diff = this.quotaCooldownUntil - Date.now();
    return diff > 0 ? Math.ceil(diff / 1000) : 0;
  }

  public setQuotaCooldown(seconds: number) {
    this.quotaCooldownUntil = Date.now() + Math.max(5, seconds) * 1000;
  }

  /**
   * Evaluates if Recognition Lock (1500ms cooldown) is active
   */
  public isLocked(): boolean {
    return Date.now() - this.lastRecognitionTime < RECOGNITION_COOLDOWN;
  }

  public getRemainingCooldownMs(): number {
    const diff = RECOGNITION_COOLDOWN - (Date.now() - this.lastRecognitionTime);
    return diff > 0 ? diff : 0;
  }

  public getLastRecognizedSign(): string {
    return this.lastRecognizedSign;
  }

  /**
   * Captures a 32x24 grayscale fingerprint of the hand region for gesture comparison
   */
  public extractFingerprint(video: HTMLVideoElement): Uint8Array | null {
    if (!video || video.readyState < 2 || !this.motionCtx) return null;
    try {
      this.motionCtx.drawImage(video, 0, 0, 32, 24);
      const data = this.motionCtx.getImageData(0, 0, 32, 24).data;
      const gray = new Uint8Array(32 * 24);
      for (let i = 0; i < gray.length; i++) {
        const idx = i * 4;
        gray[i] = Math.round((data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114));
      }
      return gray;
    } catch {
      return null;
    }
  }

  /**
   * Client-side event-based detection:
   * Checks hand presence, motion/blurriness, distance, and compares current frame
   * with previously recognized gesture to skip duplicate API calls.
   */
  public checkHandAndGestureState(video: HTMLVideoElement): HandDetectionCheck {
    if (!video || video.readyState < 2 || !this.motionCtx) {
      return {
        hasHand: false,
        isStationary: true,
        isBlurry: false,
        isTooFar: false,
        multipleHands: false,
        motionAmount: 0,
        similarityToPreviousRecognized: 0,
        isSameGestureHeld: false,
        statusMessage: 'Camera not ready',
      };
    }

    try {
      const W = 64;
      const H = 48;
      this.motionCtx.drawImage(video, 0, 0, W, H);
      const imgData = this.motionCtx.getImageData(0, 0, W, H).data;

      // 1. Pixel differencing for motion
      let diffPixels = 0;
      if (this.previousMotionSample) {
        for (let i = 0; i < imgData.length; i += 4) {
          const dr = Math.abs(imgData[i] - this.previousMotionSample[i]);
          const dg = Math.abs(imgData[i + 1] - this.previousMotionSample[i + 1]);
          const db = Math.abs(imgData[i + 2] - this.previousMotionSample[i + 2]);
          if ((dr + dg + db) / 3 > 20) diffPixels++;
        }
      }
      const totalPixels = W * H;
      const motionAmount = diffPixels / totalPixels;

      if (!this.previousMotionSample) {
        this.previousMotionSample = new Uint8ClampedArray(imgData);
      } else {
        this.previousMotionSample.set(imgData);
      }

      // 2. Skin / hand chrominance detection
      let handPixels = 0;
      let leftCount = 0;
      let rightCount = 0;
      let minX = W, maxX = 0, minY = H, maxY = 0;

      for (let y = 0; y < H; y++) {
        // Exclude upper 30% center (face zone)
        for (let x = 0; x < W; x++) {
          const isFaceZone = y < H * 0.32 && x > W * 0.28 && x < W * 0.72;
          if (isFaceZone) continue;

          const idx = (y * W + x) * 4;
          const r = imgData[idx];
          const g = imgData[idx + 1];
          const b = imgData[idx + 2];

          const isSkin =
            r > 45 && g > 30 && b > 20 &&
            r > g && r > b &&
            Math.abs(r - g) > 10 &&
            (r - g >= 12 || (r > 100 && g > 75 && b > 60));

          if (isSkin) {
            handPixels++;
            if (x < W / 2) leftCount++;
            else rightCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      const hasHand = handPixels >= 32;
      if (!hasHand) {
        this.consecutiveEmptyHandFrames++;
        if (this.consecutiveEmptyHandFrames > 3) {
          // Hand disappeared -> clear previous gesture lock so a new gesture can be recognized
          this.lastRecognizedFingerprint = null;
        }
        return {
          hasHand: false,
          isStationary: true,
          isBlurry: false,
          isTooFar: false,
          multipleHands: false,
          motionAmount,
          similarityToPreviousRecognized: 0,
          isSameGestureHeld: false,
          statusMessage: 'Waiting for hand gesture...',
        };
      }

      this.consecutiveEmptyHandFrames = 0;

      // Check distance: if bounding box area is too small
      const boxArea = (maxX - minX + 1) * (maxY - minY + 1);
      const isTooFar = handPixels < 45 || boxArea < totalPixels * 0.035;

      // Check blurriness / excessive motion
      const isBlurry = motionAmount > 0.38;
      const isStationary = motionAmount < 0.08;

      // Check multiple disjoint hands
      const multipleHands = leftCount > 80 && rightCount > 80 && Math.abs(leftCount - rightCount) < 30;

      // 3. Compute Similarity with last recognized gesture frame
      let similarity = 0;
      let isSameGestureHeld = false;

      const currentFingerprint = this.extractFingerprint(video);
      if (currentFingerprint && this.lastRecognizedFingerprint) {
        let absDiffSum = 0;
        for (let i = 0; i < currentFingerprint.length; i++) {
          absDiffSum += Math.abs(currentFingerprint[i] - this.lastRecognizedFingerprint[i]);
        }
        const avgDiff = absDiffSum / currentFingerprint.length;
        similarity = Math.max(0, 1 - avgDiff / 255);

        // If similarity is >= DUPLICATE_SIMILARITY_THRESHOLD (90%), the user is still holding the same sign!
        if (similarity >= DUPLICATE_SIMILARITY_THRESHOLD) {
          isSameGestureHeld = true;
        } else if (similarity < 0.82 || motionAmount > 0.22) {
          // Gesture changed significantly -> release same gesture lock
          this.lastRecognizedFingerprint = null;
        }
      }

      let statusMessage = '';
      if (isBlurry) {
        statusMessage = 'Please hold your hand steady.';
      } else if (isTooFar) {
        statusMessage = 'Please move your hand closer.';
      } else if (isSameGestureHeld) {
        statusMessage = `Holding sign: "${this.lastRecognizedSign}" (waiting for gesture change)`;
      } else if (this.isLocked()) {
        statusMessage = 'Sign recognized (1.5s lock active)';
      } else {
        statusMessage = 'Hand detected — ready to recognize';
      }

      return {
        hasHand: true,
        isStationary,
        isBlurry,
        isTooFar,
        multipleHands,
        motionAmount,
        similarityToPreviousRecognized: similarity,
        isSameGestureHeld,
        statusMessage,
      };
    } catch {
      return {
        hasHand: true,
        isStationary: true,
        isBlurry: false,
        isTooFar: false,
        multipleHands: false,
        motionAmount: 0,
        similarityToPreviousRecognized: 0,
        isSameGestureHeld: false,
      };
    }
  }

  /**
   * Records a successful sign recognition, saving its visual fingerprint
   * and locking further calls for RECOGNITION_COOLDOWN (1500ms).
   */
  public recordRecognizedSign(sign: string, videoOrFingerprint?: HTMLVideoElement | Uint8Array | null) {
    if (!sign || sign === 'NONE' || sign.toLowerCase().includes('unclear')) return;
    this.lastRecognizedSign = sign;
    this.lastRecognitionTime = Date.now();
    if (videoOrFingerprint) {
      if (videoOrFingerprint instanceof Uint8Array) {
        this.lastRecognizedFingerprint = videoOrFingerprint;
      } else {
        this.lastRecognizedFingerprint = this.extractFingerprint(videoOrFingerprint);
      }
    }
  }

  public clearRecognizedSign() {
    this.lastRecognizedSign = '';
    this.lastRecognitionTime = 0;
    this.lastRecognizedFingerprint = null;
  }

  /**
   * Evaluates if there is active motion/gesture in the camera feed
   */
  public detectMotion(video: HTMLVideoElement): number {
    if (!video || video.readyState < 2 || !this.motionCtx) {
      return 1.0;
    }
    try {
      this.motionCtx.drawImage(video, 0, 0, 64, 48);
      const imgData = this.motionCtx.getImageData(0, 0, 64, 48).data;
      if (!this.previousMotionSample) {
        this.previousMotionSample = new Uint8ClampedArray(imgData);
        return 1.0;
      }
      let diffSum = 0;
      const totalPixels = 64 * 48;
      for (let i = 0; i < imgData.length; i += 4) {
        const diffR = Math.abs(imgData[i] - this.previousMotionSample[i]);
        const diffG = Math.abs(imgData[i + 1] - this.previousMotionSample[i + 1]);
        const diffB = Math.abs(imgData[i + 2] - this.previousMotionSample[i + 2]);
        const pixelDiff = (diffR + diffG + diffB) / 3;
        if (pixelDiff > 18) diffSum++;
      }
      this.previousMotionSample.set(imgData);
      return diffSum / totalPixels;
    } catch {
      return 1.0;
    }
  }

  /**
   * Captures a single video frame as a compressed base64 JPEG string
   * Defaulted to 480px width & 0.80 quality (or up to 640px @ 0.85 in precision mode)
   * for sharp hand articulation, clear finger joints, and landmark preservation.
   */
  public captureFrame(video: HTMLVideoElement, maxWidth = 480, quality = 0.80): string | null {
    if (!video || video.readyState < 2 || !this.ctx) {
      return null;
    }

    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    // Scale while preserving aspect ratio
    const scale = Math.min(1, maxWidth / videoWidth);
    const targetWidth = Math.round(videoWidth * scale);
    const targetHeight = Math.round(videoHeight * scale);

    if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;
    }

    this.ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    return this.canvas.toDataURL('image/jpeg', quality);
  }

  /**
   * Captures a rapid sequence of temporal frames spaced 50ms apart
   * for responsive real-time sign language movement analysis
   */
  public async captureTemporalSequence(
    video: HTMLVideoElement,
    frameCount = 1,
    delayMs = 50,
    maxWidth = 480,
    quality = 0.80
  ): Promise<string[]> {
    const frames: string[] = [];

    const frame1 = this.captureFrame(video, maxWidth, quality);
    if (frame1) frames.push(frame1);

    if (frameCount > 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const frame2 = this.captureFrame(video, maxWidth, quality);
      if (frame2) frames.push(frame2);
    }

    if (frameCount > 2) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const frame3 = this.captureFrame(video, maxWidth, quality);
      if (frame3) frames.push(frame3);
    }

    return frames;
  }

  /**
   * Translates captured video frames into English via the secure backend API endpoint.
   * Adheres strictly to the Anti-Hallucination rule:
   * VISUAL EVIDENCE > SIGN RECOGNITION > TEMPORAL CONTEXT > LANGUAGE CONTEXT > GRAMMAR CORRECTION
   */
  public async translateFrames(
    frames: string[],
    recentHistory: string[] = [],
    mode: SigningMode = 'continuous',
    signLanguage: SignLanguage = 'ASL',
    telemetry?: HandFeatureTelemetry
  ): Promise<ASLRecognitionResult> {
    if (frames.length === 0) {
      return {
        recognized_sign: 'NONE',
        recognized_signs: [],
        english_translation: '[uncertain sign]',
        confidence: 0,
        is_reliable: false,
        uncertainty_reason: 'No camera frames were captured.',
      };
    }

    if (this.isProcessing) {
      return {
        recognized_sign: 'NONE',
        recognized_signs: [],
        english_translation: '',
        confidence: 0,
        is_reliable: false,
        uncertainty_reason: 'Analysis in progress',
      };
    }

    this.isProcessing = true;

    const timeoutId = setTimeout(() => {
      this.isProcessing = false;
    }, 10000);

    try {
      const baseUrl = getApiBaseUrl();
      const endpoint = `${baseUrl}/api/translate-asl`;

      let response: Response;
      try {
        const convoHistory = languageContextEngine.getConversationHistory();
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            frames,
            recentHistory,
            mode,
            signLanguage,
            telemetry,
            conversationHistory: convoHistory,
            targetLanguage: 'English',
          }),
        });
      } catch (networkError: any) {
        clearTimeout(timeoutId);
        return {
          recognized_sign: 'NONE',
          recognized_signs: [],
          english_translation: 'Unable to connect to translation server.',
          confidence: 0,
          is_reliable: false,
          is_connection_error: true,
          uncertainty_reason: networkError?.message || 'Network connection failed.',
          timestamp: Date.now(),
        };
      }

      clearTimeout(timeoutId);

      let data: any = null;
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch {
        return {
          recognized_sign: 'NONE',
          recognized_signs: [],
          english_translation: `Server returned non-JSON response (HTTP ${response.status}).`,
          confidence: 0,
          is_reliable: false,
          is_connection_error: true,
          uncertainty_reason: `HTTP ${response.status} from ${endpoint}`,
          timestamp: Date.now(),
        };
      }

      // Handle missing key
      if (response.status === 503 || data?.code === 'MISSING_API_KEY' || data?.is_not_configured) {
        return {
          recognized_sign: 'NONE',
          recognized_signs: [],
          english_translation: 'Gemini is not configured on the translation server yet.',
          confidence: 0,
          is_reliable: false,
          is_not_configured: true,
          uncertainty_reason: data?.uncertainty_reason || 'Missing GEMINI_API_KEY.',
          timestamp: Date.now(),
        };
      }

      if (!response.ok || !data) {
        return {
          recognized_sign: 'NONE',
          recognized_signs: [],
          english_translation: data?.english_translation || '[uncertain sign]',
          confidence: 0,
          is_reliable: false,
          is_connection_error: true,
          uncertainty_reason: data?.uncertainty_reason || `HTTP ${response.status}`,
          timestamp: Date.now(),
        };
      }

      // Extract raw prediction
      const rawSign = data.recognized_sign || 'NONE';
      const rawConfidence = typeof data.confidence === 'number' ? data.confidence : 0;
      const alternatives: string[] = Array.isArray(data.alternatives) ? data.alternatives : [];

      // Construct CandidateSign
      const candidate: CandidateSign = {
        sign: rawSign,
        confidence: rawConfidence,
        timestamp: Date.now(),
        duration: data.duration,
        alternatives,
        hand_shape: data.hand_shape_analysis,
        movement: data.movement_description,
        is_two_handed: Boolean(data.is_two_handed),
        status: rawConfidence >= 0.80 ? 'high' : rawConfidence >= 0.50 ? 'medium' : 'low',
      };

      // Resolve candidate through context engine (disambiguation, user session corrections, confidence gating)
      const resolved = languageContextEngine.resolveCandidateSign(candidate, {
        previousSigns: recentHistory,
        followingSigns: [],
        signLanguage,
        conversationHistory: languageContextEngine.getConversationHistory(),
      });

      const isReliable = !resolved.isUncertain && resolved.confidence >= 0.60;
      const confLevel: 'High' | 'Medium' | 'Low' =
        data.confidence_level || (resolved.confidence >= 0.75 ? 'High' : resolved.confidence >= 0.50 ? 'Medium' : 'Low');

      // Determine sign_type
      let signType: 'Alphabet' | 'Fingerspelling' | 'Word' | 'Phrase' | 'Sentence' | 'Unknown' = data.sign_type;
      const signUpper = (resolved.resolvedSign || '').trim().toUpperCase();
      const trans = (resolved.resolvedWord || '').trim();

      if (!signType || !['Alphabet', 'Fingerspelling', 'Word', 'Phrase', 'Sentence', 'Unknown'].includes(signType)) {
        if (
          signUpper === 'NONE' ||
          signUpper.includes('NO SIGN') ||
          signUpper.includes('UNCLEAR') ||
          confLevel === 'Low' ||
          !isReliable
        ) {
          signType = 'Unknown';
        } else if (signUpper.length === 1 && /^[A-Z0-9]$/.test(signUpper)) {
          signType = 'Alphabet';
        } else if (data.is_sentence || trans.includes('.') || trans.includes('?') || trans.includes('!')) {
          signType = 'Sentence';
        } else if (trans.split(/\s+/).length > 1) {
          signType = 'Phrase';
        } else if (/^[A-Z]{2,6}$/.test(signUpper) && (signUpper === trans.toUpperCase() || data.is_fingerspelling)) {
          signType = 'Fingerspelling';
        } else {
          signType = 'Word';
        }
      }

      let formattedOutput = data.formatted_output;
      if (!formattedOutput || !formattedOutput.includes('TYPE:')) {
        if (signUpper === 'NONE' || signUpper === 'NO SIGN DETECTED' || signUpper.includes('NO SIGN')) {
          formattedOutput = 'SIGN: No sign detected';
        } else if (!isReliable || confLevel === 'Low' || signUpper.includes('UNCLEAR')) {
          formattedOutput = 'SIGN: Unclear\nTYPE: Unknown\nCONFIDENCE: Low';
        } else {
          let displaySign = trans || resolved.resolvedSign;
          if (signType === 'Alphabet') {
            displaySign = signUpper.slice(0, 1);
          } else if (signType === 'Fingerspelling') {
            displaySign = trans.toUpperCase() || signUpper;
          }
          formattedOutput = `SIGN: ${displaySign}\nTYPE: ${signType}\nCONFIDENCE: ${confLevel}`;
        }
      }

      if (data.is_rate_limited) {
        this.setQuotaCooldown(data.retry_after_seconds || 20);
      }

      const result: ASLRecognitionResult = {
        recognized_sign: resolved.resolvedSign,
        recognized_signs: [resolved.resolvedSign],
        english_translation: resolved.resolvedWord,
        sign_type: signType,
        confidence: resolved.confidence,
        confidence_level: confLevel,
        formatted_output: formattedOutput,
        is_reliable: isReliable,
        duration: data.duration,
        alternatives,
        candidate_signs: [candidate],
        raw_sequence: data.raw_sequence || [resolved.resolvedSign],
        grammar_corrected_sentence: data.grammar_corrected_sentence,
        hand_shape_analysis: data.hand_shape_analysis,
        movement_description: data.movement_description,
        detected_non_manual_markers: data.detected_non_manual_markers,
        is_two_handed: Boolean(data.is_two_handed),
        is_sentence: Boolean(data.is_sentence),
        language: signLanguage,
        mode,
        uncertainty_reason: resolved.uncertaintyLabel || data.uncertainty_reason,
        is_rate_limited: Boolean(data.is_rate_limited),
        retry_after_seconds: data.retry_after_seconds,
        is_not_configured: Boolean(data.is_not_configured),
        timestamp: Date.now(),
      };

      if (result.is_reliable && result.recognized_sign !== 'NONE') {
        this.lastRecognizedSign = result.recognized_sign;
        this.lastRecognitionTime = Date.now();
      }

      return result;
    } catch (error: any) {
      console.error('Sign translation processing error:', error);
      return {
        recognized_sign: 'NONE',
        recognized_signs: [],
        english_translation: 'Sign unclear — please repeat.',
        confidence: 0,
        confidence_level: 'Low',
        formatted_output: 'SIGN: Unclear\nCONFIDENCE: Low',
        is_reliable: false,
        is_connection_error: true,
        uncertainty_reason: error.message || 'Communication error.',
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * High-speed, continuous sentence stream translation.
   * Leverages server-side zero-budget Gemini Flash-Lite with integrated syntactic synthesis
   * and local predictive fallback for near-instant (<350ms) sentence formation.
   */
  public async translateSentenceStream(
    frames: string[],
    existingGlosses: string[] = [],
    signLanguage: SignLanguage = 'ASL',
    telemetry?: HandFeatureTelemetry,
    speedMode: SentenceSpeedMode = 'turbo',
    cnnFeatures?: CNNFeatureTensor,
    conversationHistory?: string[],
    targetLanguage: string = 'English'
  ): Promise<SentenceStreamResult> {
    if (frames.length === 0) {
      return {
        new_gloss: 'NONE',
        is_holding_previous: false,
        raw_gloss_sequence: existingGlosses,
        synthesized_sentence: existingGlosses.length > 0 ? `${existingGlosses.join(' ')}.` : '',
        confidence: 0,
        cadence_state: 'rest',
        cnn_features: cnnFeatures,
        latency_ms: 0,
      };
    }

    const startTime = Date.now();
    try {
      const baseUrl = getApiBaseUrl();
      const endpoint = `${baseUrl}/api/translate-sentence`;
      const convo = conversationHistory || languageContextEngine.getConversationHistory();

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames,
          existingGlosses,
          signLanguage,
          telemetry,
          speedMode,
          cnnFeatures,
          conversationHistory: convo,
          targetLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data: SentenceStreamResult = await response.json();
      data.latency_ms = Date.now() - startTime;
      return data;
    } catch (err: any) {
      // Local zero-latency fallback using rule-based languageContextEngine
      const grammarRes = languageContextEngine.synthesizeGrammarSentence(
        existingGlosses.map((g) => ({
          id: `f-${Math.random()}`,
          word: g,
          gloss: g,
          timestamp: Date.now(),
        })),
        signLanguage
      );

      return {
        new_gloss: 'NONE',
        is_holding_previous: false,
        raw_gloss_sequence: existingGlosses,
        synthesized_sentence: grammarRes.finalTranslation || (existingGlosses.length > 0 ? `${existingGlosses.join(' ')}.` : ''),
        confidence: 0.72,
        cadence_state: 'signing',
        latency_ms: Date.now() - startTime,
        error: err.message,
      };
    }
  }

  public shouldDebounceSign(sign: string, cooldownMs = 2000): boolean {
    if (!sign || sign === 'NONE') return false;
    const now = Date.now();
    if (sign === this.lastRecognizedSign && now - this.lastRecognitionTime < cooldownMs) {
      return true;
    }
    return false;
  }

  public getIsProcessing(): boolean {
    return this.isProcessing;
  }
}

export const aslRecognitionService = new ASLRecognitionService();
