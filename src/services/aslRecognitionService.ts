import { ASLRecognitionResult } from '../types';

class ASLRecognitionService {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private isProcessing: boolean = false;
  private lastRecognizedSign: string = '';
  private lastRecognitionTime: number = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * Captures a single video frame as a compressed base64 JPEG string
   */
  public captureFrame(video: HTMLVideoElement, maxWidth = 640): string | null {
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
    return this.canvas.toDataURL('image/jpeg', 0.82);
  }

  /**
   * Captures a short sequence of temporal frames (e.g. 2 frames spaced by delayMs)
   * to capture ASL movement dynamics
   */
  public async captureTemporalSequence(
    video: HTMLVideoElement,
    frameCount = 2,
    delayMs = 260
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
   * Translates captured video frames into English via the backend Gemini endpoint
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
      // Return a skipped result gracefully rather than throwing an exception
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
    }, 8000);

    try {
      const response = await fetch('/api/translate-asl', {
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

      clearTimeout(timeoutId);
      let data: any = null;
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch {
        // Response was not JSON (e.g. 404 HTML on static GitHub Pages)
        return {
          recognized_sign: 'NONE',
          recognized_signs: [],
          english_translation: 'AI translation service unavailable on static host.',
          confidence: 0,
          is_reliable: false,
          uncertainty_reason: 'Backend server endpoint is required for AI translation processing.'
        };
      }

      if (!response.ok || !data) {
        return {
          recognized_sign: 'NONE',
          recognized_signs: [],
          english_translation: data?.english_translation || data?.error || 'Translation service unavailable',
          confidence: 0,
          is_reliable: false,
          uncertainty_reason: data?.details || data?.error || 'Server error occurred during sign processing.'
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
        timestamp: Date.now(),
      };

      // Record last recognition to prevent repetitive bursts
      if (result.is_reliable && result.recognized_sign !== 'NONE') {
        this.lastRecognizedSign = result.recognized_sign;
        this.lastRecognitionTime = Date.now();
      }

      return result;
    } catch (error: any) {
      console.error('ASL translation network or client error:', error);
      return {
        recognized_sign: 'NONE',
        recognized_signs: [],
        english_translation: 'Unable to connect to ASL recognition service.',
        confidence: 0,
        is_reliable: false,
        uncertainty_reason: error.message || 'Network connection error. Please check your internet connection.'
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
