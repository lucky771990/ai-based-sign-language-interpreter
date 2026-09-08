export type AppState =
  | 'READY'
  | 'REQUESTING_CAMERA'
  | 'CAMERA_ACTIVE'
  | 'TRANSLATING'
  | 'CAMERA_DENIED'
  | 'CAMERA_ERROR'
  | 'AI_ERROR'
  | 'CONFIGURATION_ERROR';

export type CameraPermissionState =
  | 'unrequested'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unavailable';

export type RecognitionStatus =
  | 'idle'
  | 'capturing'
  | 'analyzing'
  | 'segmenting'
  | 'success'
  | 'low_confidence'
  | 'rate_limited'
  | 'error';

export type SignLanguage = 'ASL' | 'BSL' | 'ISL';
export type SigningMode = 'continuous' | 'isolated';

export interface CandidateSign {
  sign: string;
  confidence: number;
  timestamp: number;
  duration?: number | string;
  alternatives: string[];
  hand_shape?: string;
  movement?: string;
  is_two_handed?: boolean;
  status: 'high' | 'medium' | 'low';
}

export interface HandFeatureTelemetry {
  leftHandDetected: boolean;
  rightHandDetected: boolean;
  dominantHand: 'right' | 'left' | 'none';
  leftHandOpenness: number; // 0 (fist) to 1 (fully spread)
  rightHandOpenness: number;
  leftHandPos: { x: number; y: number; width: number; height: number };
  rightHandPos: { x: number; y: number; width: number; height: number };
  faceAnchor?: { x: number; y: number; width: number; height: number };
  velocity: number;
  movementDirection: 'up' | 'down' | 'left' | 'right' | 'forward' | 'circular' | 'stationary';
  relativeHandDistance: number; // distance between left and right hands
  isTwoHandedSign: boolean;
  segmentationState: 'IDLE' | 'PREPARATION' | 'STROKE' | 'HOLD' | 'TRANSITION';
  nonManualExpression?: string;
}

export interface SessionCorrection {
  id: string;
  originalSign: string;
  correctedSign: string;
  contextNotes?: string;
  timestamp: number;
}

export type HandshapeCluster =
  | 'OPEN_SPREAD_5'
  | 'FLAT_PALM_B'
  | 'INDEX_POINT_1'
  | 'FIST_A_S'
  | 'CUP_PINCH_C_O'
  | 'V_PEACE_K'
  | 'CLAW_5'
  | 'UNKNOWN';

export type CNNCadenceState =
  | 'LEXICAL_APEX'
  | 'TRANSITION_EPENTHESIS'
  | 'SUSTAINED_HOLD'
  | 'NEUTRAL_REST';

export interface CNNFeatureTensor {
  apexProbability: number;
  isApex: boolean;
  boundaryProbability: number;
  isBoundary: boolean;
  handshapeCluster: HandshapeCluster;
  spatialAttentionScore: number;
  receptiveFieldCadence: CNNCadenceState;
  convolutionActivations: number[]; // Channel intensities [verticalEdge, horizontalEdge, spatialGabor, saliency]
  temporalLatencyMs: number;
}

export type SentenceSpeedMode = 'turbo' | 'balanced' | 'precision';

export interface SentenceStreamResult {
  new_gloss: string;
  is_holding_previous: boolean;
  english_word?: string;
  raw_gloss_sequence: string[];
  synthesized_sentence: string;
  confidence: number;
  is_question?: boolean;
  cadence_state?: 'signing' | 'hold' | 'rest' | 'transition';
  cnn_features?: CNNFeatureTensor;
  latency_ms?: number;
  is_not_configured?: boolean;
  error?: string;
}

export interface PipelineStageData {
  liveRecognitionSequence: CandidateSign[];
  candidateSigns: CandidateSign[];
  intermediateWords: string[];
  rawSequenceText: string;
  grammarCorrected: string;
  finalTranslation: string;
  latencyMs: number;
  currentTelemetry?: HandFeatureTelemetry;
}

export interface ASLRecognitionResult {
  recognized_sign: string;
  recognized_signs: string[];
  english_translation: string;
  confidence: number;
  is_reliable: boolean;
  duration?: string | number;
  alternatives?: string[];
  candidate_signs?: CandidateSign[];
  raw_sequence?: string[];
  grammar_corrected_sentence?: string;
  hand_shape_analysis?: string;
  movement_description?: string;
  detected_non_manual_markers?: string;
  is_two_handed?: boolean;
  is_sentence?: boolean;
  is_auto_translated?: boolean;
  language?: SignLanguage;
  mode?: SigningMode;
  uncertainty_reason?: string;
  is_rate_limited?: boolean;
  retry_after_seconds?: number;
  is_not_configured?: boolean;
  is_connection_error?: boolean;
  timestamp?: number;
}

export interface TranslationHistoryItem {
  id: string;
  timestamp: number;
  formattedTime: string;
  recognized_signs: string[];
  english_translation: string;
  confidence: number;
  is_reliable: boolean;
  duration?: string | number;
  alternatives?: string[];
  language?: SignLanguage;
  mode?: SigningMode;
  hand_shape_analysis?: string;
  movement_description?: string;
  is_sentence?: boolean;
  is_auto_translated?: boolean;
  isUserCorrected?: boolean;
  originalTranslation?: string;
}

export interface ActiveSentenceWord {
  id: string;
  word: string;
  gloss?: string;
  confidence?: number;
  isUncertain?: boolean;
  timestamp: number;
}

export interface ActiveSentence {
  words: ActiveSentenceWord[];
  sentenceText: string;
  rawSequenceText?: string;
  grammarCorrectedText?: string;
  lastWordTimestamp: number | null;
  isComplete: boolean;
}

export interface ASLReferenceSign {
  id: string;
  sign: string;
  category: 'greetings' | 'courtesy' | 'questions' | 'common' | 'emergency' | 'alphabet';
  handshape: string;
  movement: string;
  description: string;
  exampleSentence: string;
}

export interface CameraSettings {
  mirrored: boolean;
  deviceId: string;
  autoSpeak: boolean;
  continuousMode: boolean;
  signingMode: SigningMode;
  signLanguage: SignLanguage;
  sampleIntervalMs: number;
  confidenceThreshold: number;
  developerMode: boolean;
  showDebugOverlay: boolean;
  fastMode?: boolean;
}

export interface ServerHealthStatus {
  status: string;
  geminiConfigured: boolean;
  model: string;
  error?: string;
}

export interface EvaluationTestCase {
  id: string;
  title: string;
  category:
    | 'single_sign'
    | 'repeated_signs'
    | 'similar_looking'
    | 'two_handed'
    | 'fast_signing'
    | 'slow_signing'
    | 'continuous_sentence'
    | 'questions'
    | 'negation'
    | 'numbers'
    | 'fingerspelling'
    | 'lighting_variation'
    | 'partial_occlusion';
  description: string;
  inputGlosses: string[];
  expectedRawSequence: string;
  expectedFinalTranslation: string;
  expectedPunctuation: string;
  isTwoHanded: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  simulatedFramesDescription: string;
}

export interface SignSegmentEvent {
  id: string;
  keyframes: string[];
  telemetry: HandFeatureTelemetry;
  durationMs: number;
  timestamp: number;
  isTwoHanded: boolean;
  apexFrame: string;
  phase?: 'IDLE' | 'PREPARATION' | 'STROKE' | 'HOLD' | 'TRANSITION';
}

export interface EvaluationReportMetrics {
  totalTests: number;
  passedTests: number;
  signRecognitionAccuracy: number; // e.g. 96.4%
  wordAccuracy: number; // e.g. 94.8%
  sentenceAccuracy: number; // e.g. 92.5%
  duplicateDetectionRate: number; // e.g. 98.2%
  missedSignRate: number; // e.g. 2.1%
  averageConfidence: number; // e.g. 91.3%
  averageLatencyMs: number; // e.g. 410ms
  testResults: {
    testId: string;
    passed: boolean;
    recognizedGlosses: string[];
    generatedTranslation: string;
    confidence: number;
    latencyMs: number;
    notes?: string;
  }[];
}
