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
  | 'success'
  | 'low_confidence'
  | 'rate_limited'
  | 'error';

export interface ASLRecognitionResult {
  recognized_sign: string;
  recognized_signs: string[];
  english_translation: string;
  confidence: number;
  is_reliable: boolean;
  hand_shape_analysis?: string;
  movement_description?: string;
  detected_non_manual_markers?: string;
  is_sentence?: boolean;
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
  hand_shape_analysis?: string;
  movement_description?: string;
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
  sampleIntervalMs: number;
  confidenceThreshold: number;
}

export interface ServerHealthStatus {
  status: string;
  geminiConfigured: boolean;
  model: string;
  error?: string;
}
