import { ASLRecognitionResult } from '../types';

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
   * Optimized at 480px width & 0.75 quality for rapid network transfer & AI inference
   */
  public captureFrame(video: HTMLVideoElement, maxWidth = 480): string | null {
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
    return this.canvas.toDataURL('image/jpeg', 0.75);
  }

  /**
   * Captures a short sequence of temporal frames spaced 110ms apart
   * to capture ASL movement dynamics rapidly
   */
  public async captureTemporalSequence(
    video: HTMLVideoElement,
    frameCount = 2,
    delayMs = 110
  ): Promise<string[]> {
    const frames: string[] = [];

    const frame1 = this.captureFrame(video);
    if (frame1) frames.push(frame1);

    if (frameCount > 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const frame2 = this.captureFrame(video);
      if (frame2) frames.push(frame2);
    }

    if (frameCount > 2) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const frame3 = this.captureFrame(video);
      if (frame3) frames.push(frame3);
    }

    return frames;
  }

  /**
   * Translates captured video frames into English via the secure backend API endpoint.
   * The backend authenticates with Gemini using the server-side GEMINI_API_KEY secret.
   */
  public async translateFrames(
    frames: string[],
    recentHistory: string[] = [],
    mode: 'continuous' | 'single_sign' = 'continuous'
  ): Promise<ASLRecognitionResult> {
    if (frames.length === 0) {
      return {
        recognized_sign: 'NONE',
        recognized_signs: [],
        english_translation: "I'm not confident about that sign. Please try again.",
        confidence: 0,
        is_reliable: false,
        uncertainty_reason: 'No camera frames were captured.'
      };
    }

    if (this.isProcessing) {
      return {
        recognized_sign: 'NONE',
        recognized_signs: [],
        english_translation: '',
        confidence: 0,
        is_reliable: false,
        uncertainty_reason: 'Analysis in progress'
      };
    }

    this.isProcessing = true;

    // Safety timeout to ensure isProcessing resets even on network disconnects
    const timeoutId = setTimeout(() => {
      this.isProcessing = false;
    }, 10000);

    try {
      const baseUrl = getApiBaseUrl();
      const endpoint = `${baseUrl}/api/translate-asl`;

      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            frames,
            recentHistory,
            mode,
          }),
        });
      } catch (networkError: any) {
        clearTimeout(timeoutId);
        return {
          recognized_sign: 'NONE',
          recognized_signs: [],
          english_translation: 'Unable to connect to the translation service. Please check the API configuration and try again.',
          confidence: 0,
          is_reliable: false,
          is_connection_error: true,
          uncertainty_reason: networkError?.message || 'Network connection to translation server failed.',
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
          english_translation: response.status === 404
            ? 'Backend API endpoint not found. Ensure the translation server is running with VITE_API_BASE_URL.'
            : `Server returned non-JSON response (HTTP ${response.status}).`,
          confidence: 0,
          is_reliable: false,
          is_connection_error: true,
          uncertainty_reason: `HTTP ${response.status} response from ${endpoint}`,
          timestamp: Date.now(),
        };
      }

      // Check if backend reported missing Gemini configuration
      if (response.status === 503 || data?.code === 'MISSING_API_KEY' || data?.is_not_configured) {
        return {
          recognized_sign: 'NONE',
          recognized_signs: [],
          english_translation: 'Gemini is not configured on the translation server yet.',
          confidence: 0,
          is_reliable: false,
          is_not_configured: true,
          uncertainty_reason: data?.uncertainty_reason || data?.details || 'Missing GEMINI_API_KEY on the backend server.',
          timestamp: Date.now(),
        };
      }

      if (!response.ok || !data) {
        return {
          recognized_sign: 'NONE',
          recognized_signs: [],
          english_translation: data?.english_translation || data?.error || 'Unable to connect to the translation service. Please check the API configuration and try again.',
          confidence: 0,
          is_reliable: false,
          is_connection_error: true,
          uncertainty_reason: data?.details || data?.error || `HTTP ${response.status}`,
          timestamp: Date.now(),
        };
      }

      // Temporal smoothing: Check if confidence meets threshold
      const isReliable = Boolean(data.is_reliable && data.confidence >= 0.65);

      const result: ASLRecognitionResult = {
        recognized_sign: data.recognized_sign || 'NONE',
        recognized_signs: Array.isArray(data.recognized_signs) ? data.recognized_signs : [data.recognized_sign || 'NONE'],
        english_translation: data.english_translation || (isReliable ? '' : "I'm not confident about that sign. Please try again."),
        confidence: typeof data.confidence === 'number' ? data.confidence : 0,
        is_reliable: isReliable,
        hand_shape_analysis: data.hand_shape_analysis || undefined,
        movement_description: data.movement_description || undefined,
        detected_non_manual_markers: data.detected_non_manual_markers || undefined,
        uncertainty_reason: data.uncertainty_reason || undefined,
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
      console.error('ASL translation processing error:', error);
      return {
        recognized_sign: 'NONE',
        recognized_signs: [],
        english_translation: 'Unable to connect to the translation service. Please check the API configuration and try again.',
        confidence: 0,
        is_reliable: false,
        is_connection_error: true,
        uncertainty_reason: error.message || 'Network communication error.'
      };
    } finally {
      this.isProcessing = false;
    }
  }

  public shouldDebounceSign(sign: string, cooldownMs = 2500): boolean {
    if (!sign || sign === 'NONE') return false;
    const now = Date.now();
    if (sign === this.lastRecognizedSign && now - this.lastRecognitionTime < cooldownMs) {
      return true; // Already recognized very recently
    }
    return false;
  }

  public getIsProcessing(): boolean {
    return this.isProcessing;
  }
}

export const aslRecognitionService = new ASLRecognitionService();
