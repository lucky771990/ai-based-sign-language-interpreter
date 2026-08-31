/**
 * Web Speech API helper for deaf/hard-of-hearing assistive speech synthesis
 */

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoice();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoice();
      }
    }
  }

  private initVoice() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Prefer natural English voices
    this.voice =
      voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Premium'))
      ) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0] ||
      null;
  }

  public isSupported(): boolean {
    return Boolean(this.synth);
  }

  public speak(text: string, onEnd?: () => void) {
    if (!this.synth || !text || text.trim() === '' || text.includes('not confident')) {
      return;
    }

    try {
      this.synth.cancel(); // Stop any pending utterances
      const utterance = new SpeechSynthesisUtterance(text);
      if (this.voice) {
        utterance.voice = this.voice;
      }
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      if (onEnd) {
        utterance.onend = onEnd;
        utterance.onerror = onEnd;
      }
      this.synth.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis failed:', e);
    }
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const speechService = new SpeechService();
