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

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.motionCanvas = document.createElement('canvas');
    this.motionCanvas.width = 64;
    this.motionCanvas.height = 48;
    this.motionCtx = this.motionCanvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Evaluates if there is active motion/gesture in the camera feed
   * to conserve backend API calls during idle periods
   */
  public detectMotion(video: HTMLVideoElement): number {
    if (!video || video.readyState < 2 || !this.motionCtx) {
      return 1.0; // Default to allowing if unable to sample
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
        if (pixelDiff > 18) {
          diffSum++;
        }
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

      const result: ASLRecognitionResult = {
        recognized_sign: resolved.resolvedSign,
        recognized_signs: [resolved.resolvedSign],
        english_translation: resolved.resolvedWord,
        confidence: resolved.confidence,
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
        english_translation: '[uncertain sign]',
        confidence: 0,
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
