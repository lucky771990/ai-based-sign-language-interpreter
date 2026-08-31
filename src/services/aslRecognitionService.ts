import { ASLRecognitionResult } from '../types';

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
   * to conserve Gemini API quota during idle periods
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
   * Translates captured video frames into English via the backend Gemini endpoint,
   * or directly via client-side Gemini SDK if deployed on static GitHub Pages with user key.
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
    }, 9000);

    try {
      // Step 1: Try backend Express API route first
      let response: Response | null = null;
      let data: any = null;
      let isBackendAvailable = true;

      try {
        response = await fetch('/api/translate-asl', {
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

        if (response.ok) {
          const text = await response.text();
          data = JSON.parse(text);
        } else if (response.status === 404) {
          // Backend route not available (e.g. static hosting on GitHub Pages)
          isBackendAvailable = false;
        } else {
          const text = await response.text();
          try {
            data = JSON.parse(text);
          } catch {
            data = { error: `Server error (HTTP ${response.status})` };
          }
        }
      } catch (networkErr) {
        // Fetch failed (network down or static hosting)
        isBackendAvailable = false;
      }

      // Step 2: If static host (no backend server), check for client-side API key
      if (!isBackendAvailable || !data) {
        const clientKey = (typeof window !== 'undefined' ? localStorage.getItem('user_gemini_api_key') : '') ||
          ((import.meta as any)?.env?.VITE_GEMINI_API_KEY as string) ||
          '';

        if (clientKey) {
          try {
            const { GoogleGenAI, Type } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey: clientKey });

            const contents: any[] = [];
            for (const frame of frames) {
              const base64Data = frame.replace(/^data:image\/[a-z]+;base64,/, '');
              contents.push({
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Data,
                },
              });
            }

            contents.push({
              text: `You are an expert American Sign Language (ASL) interpreter and linguistic vision system.
Analyze the video frame(s) and recognize any ASL signs or gestures performed.
Translate into clean English.
Recent recognized sign context: ${recentHistory.slice(-5).join(', ') || 'None'}.
Mode: ${mode}.`
            });

            const models = ['gemini-3.7-flash', 'gemini-3.1-flash-lite'];
            let directResultText = '';

            for (const m of models) {
              try {
                const aiRes = await ai.models.generateContent({
                  model: m,
                  contents,
                  config: {
                    temperature: 0.1,
                    responseMimeType: 'application/json',
                    responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                        recognized_sign: { type: Type.STRING },
                        recognized_signs: { type: Type.ARRAY, items: { type: Type.STRING } },
                        english_translation: { type: Type.STRING },
                        confidence: { type: Type.NUMBER },
                        is_reliable: { type: Type.BOOLEAN },
                        hand_shape_analysis: { type: Type.STRING },
                        movement_description: { type: Type.STRING },
                        uncertainty_reason: { type: Type.STRING },
                      },
                      required: ['recognized_sign', 'english_translation', 'confidence', 'is_reliable'],
                    }
                  }
                });
                directResultText = aiRes.text || '';
                if (directResultText) break;
              } catch (clientModelErr) {
                console.warn(`Direct client model ${m} error:`, clientModelErr);
              }
            }

            if (directResultText) {
              data = JSON.parse(directResultText);
            }
          } catch (directAiErr: any) {
            console.warn('Direct client-side Gemini execution failed:', directAiErr);
            data = {
              recognized_sign: 'NONE',
              english_translation: 'Direct client-side translation failed. Check API key.',
              confidence: 0,
              is_reliable: false,
              uncertainty_reason: directAiErr?.message || 'Client AI error',
            };
          }
        } else {
          // No backend and no client key provided on static host
          clearTimeout(timeoutId);
          return {
            recognized_sign: 'NONE',
            recognized_signs: [],
            english_translation: 'Gemini is not configured for this static deployment.',
            confidence: 0,
            is_reliable: false,
            uncertainty_reason: 'Static host detected without backend proxy. Configure a custom Gemini key in System Diagnostics to enable direct translations.',
            timestamp: Date.now(),
          };
        }
      }

      clearTimeout(timeoutId);

      if (!data) {
        return {
          recognized_sign: 'NONE',
          recognized_signs: [],
          english_translation: "I'm not confident about that sign. Please try again.",
          confidence: 0,
          is_reliable: false,
          uncertainty_reason: 'No response received from translation service.'
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
        timestamp: Date.now(),
      };

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
