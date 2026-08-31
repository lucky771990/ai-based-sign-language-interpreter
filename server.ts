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

// Increase JSON payload limit for base64 camera frames
app.use(express.json({ limit: '20mb' }));

// Health and Configuration status check
app.get('/api/health', (req, res) => {
  const isConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  res.json({
    status: 'ok',
    geminiConfigured: isConfigured,
    model: 'gemini-3.7-flash',
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

// ASL Translation Endpoint
app.post('/api/translate-asl', async (req, res) => {
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
        error: 'Gemini API is not configured',
        code: 'MISSING_API_KEY',
        details: err.message,
        recognized_sign: 'NONE',
        recognized_signs: [],
        english_translation: 'AI translation is not configured yet. Please configure the GEMINI_API_KEY.',
        confidence: 0,
        is_reliable: false,
        uncertainty_reason: 'Missing API key configuration.'
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

    const modelsToTry = ['gemini-3.7-flash', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];
    let lastError: any = null;
    let responseText: string | null = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [...imageParts, { text: promptText }],
          },
          config: {
            systemInstruction,
            temperature: 0.2,
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
        console.warn(`Model ${modelName} encountered error (${status}): ${errMsg}. Attempting fallback...`);
        // Small delay before trying fallback model
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    if (!responseText) {
      console.error('All model attempts failed:', lastError);
      // Return a graceful non-crashing payload so frontend stays responsive
      return res.json({
        recognized_sign: 'NONE',
        recognized_signs: [],
        english_translation: "AI recognition server is busy. Retrying in a moment...",
        confidence: 0,
        is_reliable: false,
        uncertainty_reason: 'Temporary API high demand. Automatic retry in progress.',
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
});

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
