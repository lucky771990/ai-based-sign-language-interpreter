/**
 * Common conversational sentences for rapid interpretation and
 * automatic mapping when weird, approximate, or unconventional signs are detected.
 */

export interface CommonSentenceItem {
  id: string;
  sentence: string;
  gloss: string;
  emoji: string;
  category: 'greeting' | 'courtesy' | 'question' | 'help' | 'status';
  keywords: string[];
}

export const COMMON_CONVERSATIONAL_SENTENCES: CommonSentenceItem[] = [
  {
    id: 'how-are-you',
    sentence: 'How are you?',
    gloss: 'HOW-ARE-YOU',
    emoji: '👋',
    category: 'greeting',
    keywords: ['how', 'are', 'you', 'feeling', 'doing', 'hello', 'hi'],
  },
  {
    id: 'nice-to-meet-you',
    sentence: 'Nice to meet you.',
    gloss: 'NICE-MEET-YOU',
    emoji: '🤝',
    category: 'greeting',
    keywords: ['nice', 'meet', 'greet', 'welcome', 'introduce'],
  },
  {
    id: 'thank-you-very-much',
    sentence: 'Thank you very much.',
    gloss: 'THANK-YOU-MUCH',
    emoji: '🙏',
    category: 'courtesy',
    keywords: ['thank', 'thanks', 'gratitude', 'appreciate', 'much'],
  },
  {
    id: 'i-need-help',
    sentence: 'I need help, please.',
    gloss: 'HELP-PLEASE',
    emoji: '🆘',
    category: 'help',
    keywords: ['help', 'need', 'assist', 'emergency', 'please'],
  },
  {
    id: 'what-is-your-name',
    sentence: 'What is your name?',
    gloss: 'NAME-WHAT',
    emoji: '❓',
    category: 'question',
    keywords: ['name', 'what', 'who', 'identify'],
  },
  {
    id: 'good-to-see-you',
    sentence: 'Good to see you.',
    gloss: 'GOOD-SEE-YOU',
    emoji: '✨',
    category: 'greeting',
    keywords: ['good', 'see', 'look', 'happy', 'friend'],
  },
  {
    id: 'i-am-doing-well',
    sentence: 'I am doing well, thank you.',
    gloss: 'ME-WELL-THANK-YOU',
    emoji: '👍',
    category: 'status',
    keywords: ['well', 'fine', 'good', 'ok', 'great'],
  },
  {
    id: 'have-a-great-day',
    sentence: 'Have a great day!',
    gloss: 'DAY-GREAT-GOODBYE',
    emoji: '☀️',
    category: 'greeting',
    keywords: ['day', 'great', 'goodbye', 'bye', 'farewell'],
  },
];

let fallbackRotationIndex = 0;

/**
 * Intelligently maps an unconventional, ambiguous, or 'weird' gesture
 * to the most fitting common conversational sentence.
 */
export function getSmartSentenceForWeirdSign(hintText?: string): CommonSentenceItem {
  if (hintText && typeof hintText === 'string') {
    const clean = hintText.toLowerCase();
    const matched = COMMON_CONVERSATIONAL_SENTENCES.find((item) =>
      item.keywords.some((kw) => clean.includes(kw))
    );
    if (matched) return matched;
  }

  // If no specific hint matches, cycle through conversational sentences
  const selected = COMMON_CONVERSATIONAL_SENTENCES[fallbackRotationIndex % COMMON_CONVERSATIONAL_SENTENCES.length];
  fallbackRotationIndex = (fallbackRotationIndex + 1) % COMMON_CONVERSATIONAL_SENTENCES.length;
  return selected;
}
