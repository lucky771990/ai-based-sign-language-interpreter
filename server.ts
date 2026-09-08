import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
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

// Resilient JSON parser for model outputs that handles markdown code fences and incomplete stream buffers
function safeParseGeminiJson<T>(rawText: string | undefined | null, fallback: T): T {
  if (!rawText || typeof rawText !== 'string') return fallback;
  let cleaned = rawText.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  }
  cleaned = cleaned.trim();

  // Find boundaries of JSON object
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) {
    return fallback;
  }

  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  } else {
    cleaned = cleaned.substring(firstBrace);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Attempt lenient recovery for slightly truncated JSON
    try {
      let healed = cleaned;
      const quotes = healed.match(/(?<!\\)"/g) || [];
      if (quotes.length % 2 !== 0) {
        healed += '"';
      }
      const openBraces = (healed.match(/\{/g) || []).length;
      const closeBraces = (healed.match(/\}/g) || []).length;
      for (let i = 0; i < openBraces - closeBraces; i++) {
        healed += '}';
      }
      return JSON.parse(healed) as T;
    } catch {
      return fallback;
    }
  }
}

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
    const {
      frames,
      recentHistory,
      mode = 'continuous',
      signLanguage = 'ASL',
      telemetry,
    } = req.body;

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return res.status(400).json({
        error: 'No image frames provided for analysis',
        code: 'MISSING_FRAMES',
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
        uncertainty_reason: 'Missing GEMINI_API_KEY on the backend server.',
      });
    }

    // Format inline image parts (handling sequential temporal keyframes)
    const imageParts = frames.slice(0, 3).map((base64Data: string) => {
      const cleanBase64 = base64Data.replace(/^data:image\/(png|jpeg|webp);base64,/, '');
      return {
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      };
    });

    const contextPrompt = recentHistory && recentHistory.length > 0
      ? `Recent conversational signs context: ${JSON.stringify(recentHistory.slice(-4))}`
      : 'No prior context.';

    const telemetryInfo = telemetry
      ? `Vision telemetry: Dominant hand: ${telemetry.dominantHand || 'unknown'}, Two-handed: ${telemetry.isTwoHandedSign ? 'YES' : 'NO'}, Movement: ${telemetry.movementDirection || 'stationary'}, Velocity: ${telemetry.velocity || 0}, Segmentation state: ${telemetry.segmentationState || 'UNKNOWN'}.`
      : '';

    const systemInstruction = `You are a certified, master-level sign language vision interpreter specializing in ${signLanguage} (${
      signLanguage === 'BSL'
        ? 'British Sign Language, recognizing two-handed manual alphabet and UK grammar conventions'
        : signLanguage === 'ISL'
        ? 'International/Indian Sign Language'
        : 'American Sign Language'
    }).

CORE ACCURACY & DISAMBIGUATION RULES:
1. FIVE PARAMETERS OF SIGN IDENTIFICATION:
   - Handshape: Differentiate exact finger configurations (e.g., A vs S vs T vs M; 1 vs D; B vs 4; V vs K; open-5 vs claw-5).
   - Location: Identify landmark contact or proximity:
     * Chin / Mouth zone: MOTHER (thumb on chin), WATER (W on chin), THANK-YOU (chin forward), EAT/FOOD (flattened O to mouth).
     * Forehead / Brow zone: FATHER (thumb on forehead), KNOW (fingertips to temple), FORGET (swipe across forehead).
     * Chest / Torso zone: PLEASE (open palm clockwise circle on chest), SORRY (A-fist circle on chest), FINE (open-5 thumb on chest), LIKE (open-8 pulling from chest), TIRED (bent hands drooping at chest).
     * Neutral space: WANT (claw hands pulling inward), NEED/MUST (X-finger hooked down), MEET (index fingers coming together), HELP (thumbs up on flat palm lifting).
   - Movement: Note stroke direction, repetition, and velocity. Single firm stroke vs double-tap vs circular rub.
   - Palm Orientation: Inward toward signer, forward toward camera, upward, or downward.
   - Non-Manual Markers (NMM):
     * Eyebrows furrowed + slight head forward: WH-questions (WHO, WHAT, WHERE, WHEN, WHY, HOW).
     * Eyebrows raised + head forward: Yes/No questions or conditional topic.
     * Head shake: Negation (NOT, DON'T-WANT, CAN'T).
     * Head nod: Affirmation (YES, WILL, UNDERSTAND).

2. ANTI-HALLUCINATION & HONEST UNCERTAINTY:
   - VISUAL EVIDENCE ALWAYS PREVAILS. Never invent words or signs merely to form a complete English phrase.
   - If signer is resting or hands are out of signing frame, output recognized_sign: "NONE", confidence: 0, is_reliable: false.
   - If movement is ambiguous, provide plausible alternative glosses and set is_reliable: false.
   - For high confidence (>= 0.75), return the exact standard sign gloss and natural English translation.`;

    const promptText = `Analyze sequential video frame(s) for ${signLanguage}. Mode: ${mode}.
${telemetryInfo}
${contextPrompt}
Return the verified sign recognition and candidate alternatives.`;

    // In single_sign or isolated mode, prioritize gemini-3.8-flash for maximum visual accuracy
    const allModels = mode === 'single_sign' || mode === 'isolated'
      ? ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest']
      : ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let modelsToTry = allModels.filter(isModelAvailable);
    if (modelsToTry.length === 0) {
      modelsToTry = allModels;
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
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.MINIMAL,
            },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                recognized_sign: {
                  type: Type.STRING,
                  description: 'Primary sign gloss in uppercase, e.g. "HELLO", "THANK-YOU", "WATER", "NONE"',
                },
                recognized_signs: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Individual signs recognized in sequence.',
                },
                english_translation: {
                  type: Type.STRING,
                  description: 'Direct natural English translation. For low confidence, use "[uncertain sign]" or "Possible sign: X".',
                },
                confidence: {
                  type: Type.NUMBER,
                  description: 'Confidence score from 0.00 to 1.00 strictly matching visual evidence.',
                },
                is_reliable: {
                  type: Type.BOOLEAN,
                  description: 'True ONLY if visual evidence confidence is >= 0.70.',
                },
                alternatives: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Other visually plausible candidate signs if ambiguous (e.g. ["BENCH"] for "BANK").',
                },
                is_two_handed: {
                  type: Type.BOOLEAN,
                  description: 'True if both hands are actively engaged in signing.',
                },
                hand_shape_analysis: {
                  type: Type.STRING,
                  description: 'Brief description of hand configuration.',
                },
                movement_description: {
                  type: Type.STRING,
                  description: 'Brief description of movement trajectory.',
                },
                detected_non_manual_markers: {
                  type: Type.STRING,
                  description: 'Facial expression or head tilt if observed.',
                },
                raw_sequence: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Raw sequential glosses detected.',
                },
                grammar_corrected_sentence: {
                  type: Type.STRING,
                  description: 'English sentence with appropriate grammar and punctuation.',
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
                'is_reliable',
              ],
            },
          },
        });

        if (response.text) {
          responseText = response.text.trim();
          break;
        }
      } catch (modelErr: any) {
        lastError = modelErr;
        const status = modelErr?.status || modelErr?.error?.code || modelErr?.code;
        const errMsg = modelErr?.message || '';

        const is503Unavailable =
          status === 503 ||
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand');
        const is429Exhausted =
          status === 429 ||
          errMsg.includes('429') ||
          errMsg.includes('Quota exceeded') ||
          errMsg.includes('RESOURCE_EXHAUSTED');

        if (is503Unavailable) {
          markModelCooldown(modelName, 25);
        } else if (is429Exhausted) {
          isRateLimited = true;
          markModelCooldown(modelName, 30);
          const match =
            errMsg.match(/retry in ([0-9.]+)\s*s/i) || errMsg.match(/retryDelay["']?:\s*["']?([0-9]+)/i);
          if (match && match[1]) {
            retryAfterSeconds = Math.min(60, Math.max(5, Math.ceil(parseFloat(match[1]))));
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    if (!responseText) {
      if (isRateLimited) {
        return res.json({
          recognized_sign: 'NONE',
          recognized_signs: [],
          english_translation: `Recognition service quota cooling down (${retryAfterSeconds}s). Resuming shortly...`,
          confidence: 0,
          is_reliable: false,
          is_rate_limited: true,
          retry_after_seconds: retryAfterSeconds,
          uncertainty_reason: 'API rate limit cooldown in effect.',
        });
      }

      return res.json({
        recognized_sign: 'NONE',
        recognized_signs: [],
        english_translation: '[uncertain sign]',
        confidence: 0,
        is_reliable: false,
        uncertainty_reason: 'Awaiting clearer visual gesture.',
      });
    }

    const fallbackResult = {
      recognized_sign: 'NONE',
      recognized_signs: [],
      english_translation: '[uncertain sign]',
      confidence: 0.35,
      is_reliable: false,
      uncertainty_reason: 'Awaiting clearer visual gesture.',
      language: signLanguage,
      mode,
    };

    const parsedResult = safeParseGeminiJson(responseText, fallbackResult);
    parsedResult.language = signLanguage;
    parsedResult.mode = mode;
    return res.json(parsedResult);
  } catch (err: any) {
    console.error('Error during ASL recognition:', err);
    return res.json({
      recognized_sign: 'NONE',
      recognized_signs: [],
      english_translation: '[uncertain sign]',
      confidence: 0,
      is_reliable: false,
      uncertainty_reason: err.message || 'Service interruption',
    });
  }
};

// Fast Continuous Sentence Translation Endpoint
app.post('/api/translate-sentence', async (req, res) => {
  const startTime = Date.now();
  try {
    const {
      frames,
      existingGlosses = [],
      signLanguage = 'ASL',
      telemetry,
      speedMode = 'turbo',
      cnnFeatures,
    } = req.body;

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return res.status(400).json({
        error: 'No frames provided',
        code: 'MISSING_FRAMES',
      });
    }

    let ai: GoogleGenAI;
    try {
      ai = getGeminiClient();
    } catch {
      // Local grammar assembly fallback when API key is missing
      const joined = existingGlosses.join(' ');
      return res.json({
        new_gloss: 'NONE',
        is_holding_previous: false,
        raw_gloss_sequence: existingGlosses,
        synthesized_sentence: joined ? `${joined}.` : '',
        is_question: false,
        confidence: 0.75,
        cadence_state: 'signing',
        cnn_features: cnnFeatures,
        latency_ms: Date.now() - startTime,
        is_not_configured: true,
      });
    }

    // Limit frames to 1-2 in turbo mode for lowest latency (~200ms)
    const maxFrames = speedMode === 'precision' ? 3 : speedMode === 'balanced' ? 2 : 1;
    const imageParts = frames.slice(0, maxFrames).map((base64Data: string) => {
      const cleanBase64 = base64Data.replace(/^data:image\/(png|jpeg|webp);base64,/, '');
      return {
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      };
    });

    const telemetryPrompt = telemetry
      ? `Telemetry: Velocity=${telemetry.velocity || 0}, State=${telemetry.segmentationState || 'UNKNOWN'}, 2-Handed=${telemetry.isTwoHandedSign ? 'YES' : 'NO'}, Dir=${telemetry.movementDirection || 'stationary'}.`
      : '';

    const cnnPrompt = cnnFeatures
      ? `CNN CONVOLUTIONAL TENSOR FEATURES:
- Spatial Attention Score: ${(cnnFeatures.spatialAttentionScore * 100).toFixed(1)}%
- Predicted Handshape Cluster: ${cnnFeatures.handshapeCluster}
- Temporal Receptive Cadence: ${cnnFeatures.receptiveFieldCadence} (Apex Prob: ${(cnnFeatures.apexProbability * 100).toFixed(1)}%, IsApex: ${cnnFeatures.isApex ? 'YES' : 'NO'}, Boundary Prob: ${(cnnFeatures.boundaryProbability * 100).toFixed(1)}%)
- Spatial Conv Channels: [V-Edge=${cnnFeatures.convolutionActivations?.[0] || 0}, H-Edge=${cnnFeatures.convolutionActivations?.[1] || 0}, Gabor=${cnnFeatures.convolutionActivations?.[2] || 0}, Saliency=${cnnFeatures.convolutionActivations?.[3] || 0}]
- CNN ACCURACY CONSTRAINTS:
  * If Receptive Cadence is 'TRANSITION_EPENTHESIS' and IsApex is NO, hands are in movement epenthesis. Output new_gloss: "NONE" to prevent transition noise from corrupting the ongoing sentence.
  * If Receptive Cadence is 'SUSTAINED_HOLD', signer is pausing on the current sign. Output new_gloss: "NONE", is_holding_previous: true, and cadence_state: "hold".
  * If Receptive Cadence is 'LEXICAL_APEX' or IsApex is YES, verify articulation against handshape cluster "${cnnFeatures.handshapeCluster}".`
      : '';

    const existingContext = existingGlosses.length > 0
      ? `Active sentence glosses signed so far: [${existingGlosses.join(', ')}]`
      : 'Sentence start: No signs performed yet. If no new sign is actively being formed, output new_gloss: "NONE" and synthesized_sentence: "".';

    const systemInstruction = `You are a certified, master-level sign language interpreter specializing in ${signLanguage} continuous sentence translation with real-time CNN feature augmentation.
Your task is to analyze sequential video keyframe(s) and convolutional feature telemetry to accurately transcribe and update the ongoing sentence.

CRITICAL ANTI-REPETITION & ANTI-HALLUCINATION RULES:
1. NO REPETITION OF RECENT GLOSSES:
   - Inspect existingGlosses. If the current frame shows the same sign as the last item in existingGlosses, the signer is merely holding or finishing that sign. You MUST output new_gloss: "NONE", is_holding_previous: true, and cadence_state: "hold".
   - NEVER emit the same sign twice consecutively unless the signer clearly retracted their hands to neutral rest and articulated a completely separate second stroke.
2. NO HALLUCINATING ON REST OR IDLE:
   - If hands are resting below the chest, stationary, adjusting the camera, or in neutral transition, output new_gloss: "NONE" and cadence_state: "rest".
   - CRITICAL: If existingGlosses is empty AND new_gloss is "NONE", synthesized_sentence MUST BE "" (empty string). NEVER invent greetings or sentences when no signs are performed!
3. STRICT VISUAL ARTICULATION & ACCURACY:
   - Only emit a new_gloss when you clearly observe the hands executing a recognized ${signLanguage} sign at its stroke apex.
   - Core sign vocabulary reference:
     * HELLO / HI: Open B palm saluting outward from temple or forehead.
     * THANK-YOU: Open flat palm touching chin/lips and extending outward toward the camera.
     * PLEASE: Open flat palm rubbing clockwise in a circle over the chest.
     * SORRY: Closed A-fist rubbing in a circle over the chest.
     * HELP: Thumbs-up fist resting on flat palm of other hand, lifted upward.
     * YOU: Index finger pointing directly forward toward the camera.
     * ME / I: Index finger pointing to own chest.
     * MY / MINE: Flat open hand placed on own chest.
     * WHAT: Both hands palms up shaking gently side to side, or index finger slicing down non-dominant palm.
     * WHERE: Index finger upright wagging side-to-side.
     * HOW: Both curved hands with backs touching, rolling forward.
     * NAME: H-fingers of both hands tapping across each other perpendicularly twice.
     * NICE: Flat dominant hand sliding smoothly forward across flat non-dominant palm.
     * MEET: Both index fingers upright, brought together face-to-face like two people meeting.
     * WANT: Both claw hands pulling toward body with palms facing upward.
     * LIKE: Middle finger and thumb pulling outward from chest while closing together.
     * GOOD: Flat hand from chin moving down into flat non-dominant palm.
     * COFFEE: Two fists stacked, top fist rotating in a grinding motion.
     * WATER: W-handshape (index, middle, ring fingers up) tapping chin twice.
     * YES: S-fist nodding like a head.
     * NO: Index and middle fingers closing down onto thumb like a bird beak.
4. ACCURATE GRAMMAR SYNTHESIS:
   - Synthesize the accumulated gloss chain (existingGlosses plus new_gloss if not NONE) into fluent, natural English.
   - Example gloss mappings:
     * [NICE, MEET, YOU] -> "Nice to meet you."
     * [NAME, YOU, WHAT] -> "What is your name?"
     * [HOW, YOU] -> "How are you?"
     * [I, WANT, COFFEE] -> "I want coffee."
     * [I, WANT, HELP, YOU] -> "I want to help you."
     * [THANK-YOU] -> "Thank you."
     * [PLEASE, HELP, ME] -> "Please help me."
   - If eyebrows are raised/furrowed with head tilt, format with terminal '?'.
   - Do NOT append prior unrelated sentences or repeat sentences.`;

    const promptText = `Analyze frame(s) for ${signLanguage} sentence translation.
${existingContext}
${telemetryPrompt}
${cnnPrompt}
Speed mode: ${speedMode}.
Return JSON strictly conforming to schema.`;

    // Prioritize gemini-3.8-flash for superior visual understanding and gesture recognition
    const modelCandidates = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

    const availableCandidates = modelCandidates.filter(isModelAvailable);
    const modelName = availableCandidates[0] || 'gemini-3.8-flash';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [...imageParts, { text: promptText }],
      },
      config: {
        systemInstruction,
        temperature: 0.1,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.MINIMAL,
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            new_gloss: {
              type: Type.STRING,
              description: 'Newly completed sign gloss in uppercase, or "NONE" if holding/resting',
            },
            is_holding_previous: {
              type: Type.BOOLEAN,
              description: 'True if continuing to hold the previous sign',
            },
            english_word: {
              type: Type.STRING,
              description: 'English equivalent of new gloss, or empty if NONE',
            },
            synthesized_sentence: {
              type: Type.STRING,
              description: 'Full cumulative grammatically synthesized English sentence, or empty string if no signs',
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Confidence between 0.00 and 1.00',
            },
            is_question: {
              type: Type.BOOLEAN,
              description: 'True if question markers (eyebrows, WH-sign) detected',
            },
            cadence_state: {
              type: Type.STRING,
              description: 'One of: signing, hold, rest, transition',
            },
          },
          required: [
            'new_gloss',
            'is_holding_previous',
            'synthesized_sentence',
            'confidence',
          ],
        },
      },
    });

    const fallbackSentence: Record<string, any> = {
      new_gloss: 'NONE',
      is_holding_previous: false,
      raw_gloss_sequence: existingGlosses,
      synthesized_sentence: existingGlosses.length > 0 ? `${existingGlosses.join(' ')}.` : '',
      is_question: false,
      confidence: 0.72,
      cadence_state: 'rest',
      latency_ms: Date.now() - startTime,
    };

    const data: Record<string, any> = safeParseGeminiJson(response.text, fallbackSentence);
    data.latency_ms = Date.now() - startTime;
    if (cnnFeatures) {
      data.cnn_features = cnnFeatures;
    }
    return res.json(data);
  } catch (err: any) {
    const existingGlosses = req.body?.existingGlosses || [];
    const joined = existingGlosses.join(' ');
    return res.json({
      new_gloss: 'NONE',
      is_holding_previous: false,
      raw_gloss_sequence: existingGlosses,
      synthesized_sentence: joined ? `${joined}.` : '',
      is_question: false,
      confidence: 0.7,
      cadence_state: 'signing',
      latency_ms: Date.now() - startTime,
      error: err.message,
    });
  }
});

// Grammar Synthesis & Disambiguation Endpoint
app.post('/api/grammar-synthesize', async (req, res) => {
  try {
    const { signs, language = 'ASL', userCorrections = {} } = req.body;
    if (!signs || !Array.isArray(signs) || signs.length === 0) {
      return res.json({
        raw_sequence: [],
        raw_sequence_text: '',
        grammar_corrected_sentence: '',
        final_translation: '',
        confidence: 0.9,
      });
    }

    let ai: GoogleGenAI;
    try {
      ai = getGeminiClient();
    } catch {
      // Return simple fallback if no API key
      const joined = signs.join(' ');
      return res.json({
        raw_sequence: signs,
        raw_sequence_text: joined,
        grammar_corrected_sentence: `${joined}.`,
        final_translation: `${joined}.`,
        confidence: 0.85,
      });
    }

    const systemInstruction = `You are a linguist specializing in ${language} syntax conversion to natural English.
CRITICAL RULE: Never invent new facts or add unexpressed information. Preserve the speaker's original meaning.
Translate the sign gloss sequence (Topic-Comment/Time-First order) into natural English with proper tense and punctuation (?, ., !).`;

    const promptText = `Convert this ${language} sign sequence to natural English:
Glosses: ${JSON.stringify(signs)}
Active session user corrections: ${JSON.stringify(userCorrections)}
Return JSON with { "raw_sequence_text": string, "grammar_corrected_sentence": string, "final_translation": string, "confidence": number }`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: promptText,
      config: {
        systemInstruction,
        temperature: 0.1,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.MINIMAL,
        },
        responseMimeType: 'application/json',
      },
    });

    const fallbackGrammar = {
      raw_sequence: signs,
      raw_sequence_text: signs.join(' '),
      grammar_corrected_sentence: `${signs.join(' ')}.`,
      final_translation: `${signs.join(' ')}.`,
      confidence: 0.85,
    };

    const data = safeParseGeminiJson(response.text, fallbackGrammar);
    return res.json(data);
  } catch (err: any) {
    const signs = req.body?.signs || [];
    const joined = signs.join(' ');
    return res.json({
      raw_sequence: signs,
      raw_sequence_text: joined,
      grammar_corrected_sentence: `${joined}.`,
      final_translation: `${joined}.`,
      confidence: 0.8,
    });
  }
});

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
