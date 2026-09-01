import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Enable CORS for frontend clients (including GitHub Pages)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Increase JSON payload limit for base64 camera frames
app.use(express.json({ limit: '20mb' }));

// Health and Configuration status check
app.get('/api/health', (req, res) => {
  const isConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  res.json({
    status: 'ok',
    geminiConfigured: isConfigured,
    model: 'gemini-3.1-flash-lite',
    timestamp: new Date().toISOString()
  });
});

// Lazy-initialized Gemini client
let genAIClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Cache for temporarily unavailable / rate-limited models to skip redundant 503/429 retries
const modelCooldownUntil: Record<string, number> = {};

function isModelAvailable(modelName: string): boolean {
  const cooldown = modelCooldownUntil[modelName];
  if (!cooldown) return true;
  if (Date.now() > cooldown) {
    delete modelCooldownUntil[modelName];
    return true;
  }
  return false;
}

function markModelCooldown(modelName: string, durationSeconds: number) {
  modelCooldownUntil[modelName] = Date.now() + durationSeconds * 1000;
}

// ASL Translation Endpoint Handler
const handleTranslationRequest = async (req: express.Request, res: express.Response) => {
  try {
    const { frames, recentHistory, mode = 'continuous' } = req.body;

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return res.status(400).json({
        error: 'No image frames provided for analysis',
        code: 'MISSING_FRAMES'
      });
    }

    let ai: GoogleGenAI;
    try {
      ai = getGeminiClient();
    } catch (err: any) {
      return res.status(503).json({
        error: 'AI_NOT_CONFIGURED',
        code: 'MISSING_API_KEY',
        details: err.message,
        recognized_sign: 'NONE',
        recognized_signs: [],
        english_translation: 'Gemini is not configured on the translation server yet.',
        confidence: 0,
        is_reliable: false,
        is_not_configured: true,
        uncertainty_reason: 'Missing GEMINI_API_KEY on the backend server.'
      });
    }

    // Format inline image parts (handling up to 3 sequential temporal frames)
    const imageParts = frames.slice(0, 3).map((base64Data: string) => {
      // Clean base64 header if present
      const cleanBase64 = base64Data.replace(/^data:image\/(png|jpeg|webp);base64,/, '');
      return {
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      };
    });

    const contextPrompt = recentHistory && recentHistory.length > 0
      ? `Recent session translation history for conversational context: ${JSON.stringify(recentHistory.slice(-4))}`
      : 'No prior session context yet.';

    const systemInstruction = `You are a certified American Sign Language (ASL) interpreter and computer vision sign linguistics expert.
Your task is to analyze the provided sequential camera frame(s) of a person signing in American Sign Language (ASL) and produce an accurate English translation.

Linguistic Assessment Criteria:
1. Handshape & Palm Orientation: Inspect dominant and non-dominant hand configurations (e.g., flat hand / B-shape, fist / A-shape, 1/index, 5-open, C-shape, V-shape, ILY sign, fingerspelling letters A-Z).
2. Location: Check anatomical anchor points (forehead, temple, chin, chest, neutral torso space, non-dominant hand base).
3. Movement Dynamics: Temporal motion trajectory across the sequential frames (outward arc, tapping, crossing, circular, waving, directional movement).
4. Non-Manual Markers (NMM): Facial expression, head tilt, eyebrow posture (e.g. furrowed for wh-questions, raised for yes/no questions, smile for pleasant greetings).
5. Grounding & Anti-Hallucination:
   - If the person's hands are at rest, in lap, making casual fidgeting motions, or not performing recognizable ASL, you MUST output recognized_sign: "NONE", confidence: < 0.40, is_reliable: false, and english_translation: "I'm not confident about that sign. Please try again."
   - Do NOT fabricate a translation when visual evidence is insufficient or hands are blurry/obscured.
   - Only set is_reliable to true if confidence is >= 0.75 and visual evidence clearly corresponds to a real ASL sign or fingerspelled sequence.
   - Convert ASL grammar/gloss into fluent, natural English sentences.`;

    const promptText = `Analyze these sequential camera frames captured from the live video stream.
Mode: ${mode}.
${contextPrompt}

Identify the ASL sign(s) or fingerspelling performed. Return structured JSON adhering to the specified schema.`;

    // Supported active models in order of preferred speed and latency
    const allModels = ['gemini-3.1-flash-lite', 'gemini-3.7-flash', 'gemini-flash-latest'];
    
    // Sort available models first (filter out models currently under active 503/429 cooldown, unless all are on cooldown)
    let modelsToTry = allModels.filter(isModelAvailable);
    if (modelsToTry.length === 0) {
      modelsToTry = allModels; // Fallback to all if all are on cooldown
    }

    let lastError: any = null;
    let responseText: string | null = null;
    let isRateLimited = false;
    let retryAfterSeconds = 15;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [...imageParts, { text: promptText }],
          },
          config: {
            systemInstruction,
            temperature: 0.1,
            maxOutputTokens: 250,
            thinkingConfig: {
              thinkingBudget: 0,
            },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                recognized_sign: {
                  type: Type.STRING,
                  description: 'Primary ASL sign gloss in uppercase, e.g. "HELLO", "THANK YOU", "PLEASE", "HELP", "YES", "NO", "WATER", "I LOVE YOU", "A", "B", or "NONE".',
                },
                recognized_signs: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'List of individual signs or letters recognized in the sequence.',
                },
                english_translation: {
                  type: Type.STRING,
                  description: 'Direct, natural English translation of the recognized ASL.',
                },
                confidence: {
                  type: Type.NUMBER,
                  description: 'Confidence score from 0.00 to 1.00.',
                },
                is_reliable: {
                  type: Type.BOOLEAN,
                  description: 'True if confident >= 0.70 and visual evidence represents recognizable ASL.',
                },
                hand_shape_analysis: {
                  type: Type.STRING,
                  description: 'Concise description of the observed hand shape.',
                },
                movement_description: {
                  type: Type.STRING,
                  description: 'Description of the motion trajectory observed between frames.',
                },
                detected_non_manual_markers: {
                  type: Type.STRING,
                  description: 'Facial expression or head movements observed.',
                },
                uncertainty_reason: {
                  type: Type.STRING,
                  description: 'Reason if not confident.',
                },
              },
              required: [
                'recognized_sign',
                'recognized_signs',
                'english_translation',
                'confidence',
                'is_reliable'
              ],
            },
          },
        });

        if (response.text) {
          responseText = response.text.trim();
          break; // Succeeded!
        }
      } catch (modelErr: any) {
        lastError = modelErr;
        const status = modelErr?.status || modelErr?.error?.code || modelErr?.code;
        const errMsg = modelErr?.message || '';
        
        // Handle 429 (quota limit) or 503 (high demand / service unavailable)
        const is503Unavailable = status === 503 || errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand');
        const is429Exhausted = status === 429 || errMsg.includes('429') || errMsg.includes('Quota exceeded') || errMsg.includes('RESOURCE_EXHAUSTED');

        if (is503Unavailable) {
          // Temporarily cool down this model for 25s so next requests immediately use the alternative model
          markModelCooldown(modelName, 25);
        } else if (is429Exhausted) {
          isRateLimited = true;
          markModelCooldown(modelName, 30);
          const match = errMsg.match(/retry in ([0-9.]+)\s*s/i) || errMsg.match(/retryDelay["']?:\s*["']?([0-9]+)/i);
          if (match && match[1]) {
            retryAfterSeconds = Math.min(60, Math.max(5, Math.ceil(parseFloat(match[1]))));
          }
        }

        // Brief delay before attempting next fallback model
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    if (!responseText) {
      if (isRateLimited) {
        return res.json({
          recognized_sign: 'NONE',
          recognized_signs: [],
          english_translation: `AI recognition service quota in cooldown. Resuming shortly...`,
          confidence: 0,
          is_reliable: false,
          is_rate_limited: true,
          retry_after_seconds: retryAfterSeconds,
          uncertainty_reason: 'API rate limit cooldown in effect.',
        });
      }

      // Return a graceful non-crashing payload so frontend stays responsive
      return res.json({
        recognized_sign: 'NONE',
        recognized_signs: [],
        english_translation: "I'm not confident about that sign. Please try again.",
        confidence: 0,
        is_reliable: false,
        uncertainty_reason: 'Temporary server demand. Retrying on next gesture frame.',
      });
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse Gemini response as JSON:', responseText);
      return res.json({
        recognized_sign: 'NONE',
        recognized_signs: [],
        english_translation: "Unable to parse sign recognition result.",
        confidence: 0,
        is_reliable: false,
        uncertainty_reason: 'Response parsing anomaly',
      });
    }

    return res.json(parsedResult);
  } catch (err: any) {
    console.error('Error during ASL recognition:', err);
    return res.json({
      recognized_sign: 'NONE',
      recognized_signs: [],
      english_translation: 'Recognition service temporarily busy. Please hold sign steady.',
      confidence: 0,
      is_reliable: false,
      uncertainty_reason: err.message || 'Temporary service interruption',
    });
  }
};

app.post('/api/translate-asl', handleTranslationRequest);
app.post('/api/translate', handleTranslationRequest);

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ASL Translate server running on http://localhost:${PORT}`);
  });
}

startServer();
