import {
  CandidateSign,
  SignLanguage,
  SessionCorrection,
  ActiveSentenceWord
} from '../types';

export interface DisambiguationContext {
  previousSigns: string[];
  followingSigns: string[];
  topicHint?: string;
  userCorrections?: Record<string, string>;
  signLanguage?: SignLanguage;
  conversationHistory?: string[];
}

export interface GrammarConversionResult {
  rawSequence: string[];
  rawSequenceText: string;
  grammarCorrected: string;
  finalTranslation: string;
  confidence: number;
  hasUncertainSigns: boolean;
  uncertainSignDetails?: string[];
  punctuation: '.' | '?' | '!';
}

class LanguageContextEngine {
  private sessionCorrections: Map<string, SessionCorrection> = new Map();
  private conversationHistory: string[] = [];

  // Common visually similar sign pairs and contextual keyword associations
  private similarSignDisambiguationRules: Record<
    string,
    {
      counterpart: string;
      contextKeywordsA: string[]; // Keywords supporting Sign A
      contextKeywordsB: string[]; // Keywords supporting Sign B
    }
  > = {
    BANK: {
      counterpart: 'BENCH',
      contextKeywordsA: ['MONEY', 'CASH', 'DEPOSIT', 'CHECK', 'PAY', 'WORK', 'SAVE', 'ACCOUNT', 'DOLLAR'],
      contextKeywordsB: ['PARK', 'SIT', 'REST', 'OUTSIDE', 'TIRED', 'WALK', 'TREE', 'GARDEN'],
    },
    BENCH: {
      counterpart: 'BANK',
      contextKeywordsA: ['PARK', 'SIT', 'REST', 'OUTSIDE', 'TIRED', 'WALK', 'TREE', 'GARDEN'],
      contextKeywordsB: ['MONEY', 'CASH', 'DEPOSIT', 'CHECK', 'PAY', 'WORK', 'SAVE', 'ACCOUNT', 'DOLLAR'],
    },
    COFFEE: {
      counterpart: 'TEA',
      contextKeywordsA: ['MORNING', 'BEANS', 'HOT', 'CAFFEINE', 'MUG', 'BREAKFAST', 'ESPRESSO'],
      contextKeywordsB: ['BAG', 'LEAVES', 'HERBAL', 'GREEN', 'AFTERNOON', 'POT'],
    },
    TEA: {
      counterpart: 'COFFEE',
      contextKeywordsA: ['BAG', 'LEAVES', 'HERBAL', 'GREEN', 'AFTERNOON', 'POT'],
      contextKeywordsB: ['MORNING', 'BEANS', 'HOT', 'CAFFEINE', 'MUG', 'BREAKFAST', 'ESPRESSO'],
    },
    PLEASE: {
      counterpart: 'SORRY',
      contextKeywordsA: ['HELP', 'WANT', 'GIVE', 'ASK', 'THANK-YOU', 'WELCOME'],
      contextKeywordsB: ['MISTAKE', 'ACCIDENT', 'FORGIVE', 'LATE', 'BAD', 'WRONG'],
    },
    SORRY: {
      counterpart: 'PLEASE',
      contextKeywordsA: ['MISTAKE', 'ACCIDENT', 'FORGIVE', 'LATE', 'BAD', 'WRONG'],
      contextKeywordsB: ['HELP', 'WANT', 'GIVE', 'ASK', 'THANK-YOU', 'WELCOME'],
    },
    CHURCH: {
      counterpart: 'CHOCOLATE',
      contextKeywordsA: ['SUNDAY', 'PRAY', 'RELIGION', 'WORSHIP', 'BIBLE', 'CROSS', 'GOD'],
      contextKeywordsB: ['SWEET', 'CANDY', 'EAT', 'CAKE', 'DESSERT', 'DARK', 'BAR'],
    },
    CHOCOLATE: {
      counterpart: 'CHURCH',
      contextKeywordsA: ['SWEET', 'CANDY', 'EAT', 'CAKE', 'DESSERT', 'DARK', 'BAR'],
      contextKeywordsB: ['SUNDAY', 'PRAY', 'RELIGION', 'WORSHIP', 'BIBLE', 'CROSS', 'GOD'],
    },
    DOCTOR: {
      counterpart: 'TEACHER',
      contextKeywordsA: ['HOSPITAL', 'MEDICINE', 'EXAM', 'SICK', 'SURGERY', 'CLINIC', 'PHYSICIAN', 'HURT', 'PAIN', 'EMERGENCY', 'NURSE'],
      contextKeywordsB: ['SCHOOL', 'CLASS', 'STUDENT', 'LEARN', 'TEACH', 'HOMEWORK', 'BOOK', 'STUDY', 'EDUCATION', 'COLLEGE'],
    },
    TEACHER: {
      counterpart: 'DOCTOR',
      contextKeywordsA: ['SCHOOL', 'CLASS', 'STUDENT', 'LEARN', 'TEACH', 'HOMEWORK', 'BOOK', 'STUDY', 'EDUCATION', 'COLLEGE'],
      contextKeywordsB: ['HOSPITAL', 'MEDICINE', 'EXAM', 'SICK', 'SURGERY', 'CLINIC', 'PHYSICIAN', 'HURT', 'PAIN', 'EMERGENCY', 'NURSE'],
    },
    HOME: {
      counterpart: 'HOSPITAL',
      contextKeywordsA: ['BED', 'SLEEP', 'RELAX', 'FAMILY', 'DINNER', 'EAT', 'HOUSE', 'NIGHT', 'REST', 'MOM', 'DAD'],
      contextKeywordsB: ['SICK', 'HURT', 'DOCTOR', 'EMERGENCY', 'PAIN', 'AMBULANCE', 'MEDICINE', 'INJURY', 'NURSE'],
    },
    HOSPITAL: {
      counterpart: 'HOME',
      contextKeywordsA: ['SICK', 'HURT', 'DOCTOR', 'EMERGENCY', 'PAIN', 'AMBULANCE', 'MEDICINE', 'INJURY', 'NURSE'],
      contextKeywordsB: ['BED', 'SLEEP', 'RELAX', 'FAMILY', 'DINNER', 'EAT', 'HOUSE', 'NIGHT', 'REST', 'MOM', 'DAD'],
    },
    WATER: {
      counterpart: 'WINE',
      contextKeywordsA: ['THIRSTY', 'DRINK', 'GLASS', 'BOTTLE', 'HYDRATE', 'COLD', 'ICE'],
      contextKeywordsB: ['DINNER', 'PARTY', 'ALCOHOL', 'CELEBRATE', 'GLASS', 'RED', 'WHITE'],
    },
    WINE: {
      counterpart: 'WATER',
      contextKeywordsA: ['DINNER', 'PARTY', 'ALCOHOL', 'CELEBRATE', 'GLASS', 'RED', 'WHITE'],
      contextKeywordsB: ['THIRSTY', 'DRINK', 'GLASS', 'BOTTLE', 'HYDRATE', 'COLD', 'ICE'],
    },
    SUMMER: {
      counterpart: 'DRY',
      contextKeywordsA: ['HOT', 'SUN', 'BEACH', 'SEASON', 'WEATHER', 'VACATION'],
      contextKeywordsB: ['THIRST', 'WATER', 'WIPE', 'TOWEL', 'RAIN', 'DESERT'],
    },
    DRY: {
      counterpart: 'SUMMER',
      contextKeywordsA: ['THIRST', 'WATER', 'WIPE', 'TOWEL', 'RAIN', 'DESERT'],
      contextKeywordsB: ['HOT', 'SUN', 'BEACH', 'SEASON', 'WEATHER', 'VACATION'],
    },
    LIKE: {
      counterpart: 'WHITE',
      contextKeywordsA: ['WANT', 'LOVE', 'PREFER', 'FAVORITE', 'FEEL', 'ENJOY'],
      contextKeywordsB: ['COLOR', 'SHIRT', 'SNOW', 'PAPER', 'BLACK', 'PAINT'],
    },
    WHITE: {
      counterpart: 'LIKE',
      contextKeywordsA: ['COLOR', 'SHIRT', 'SNOW', 'PAPER', 'BLACK', 'PAINT'],
      contextKeywordsB: ['WANT', 'LOVE', 'PREFER', 'FAVORITE', 'FEEL', 'ENJOY'],
    },
    MOTHER: {
      counterpart: 'FATHER',
      contextKeywordsA: ['WOMAN', 'FEMALE', 'MOM', 'SISTER', 'DAUGHTER', 'AUNT', 'FAMILY'],
      contextKeywordsB: ['MAN', 'MALE', 'DAD', 'BROTHER', 'SON', 'UNCLE', 'FAMILY'],
    },
    FATHER: {
      counterpart: 'MOTHER',
      contextKeywordsA: ['MAN', 'MALE', 'DAD', 'BROTHER', 'SON', 'UNCLE', 'FAMILY'],
      contextKeywordsB: ['WOMAN', 'FEMALE', 'MOM', 'SISTER', 'DAUGHTER', 'AUNT', 'FAMILY'],
    },
    'THANK-YOU': {
      counterpart: 'GOOD',
      contextKeywordsA: ['WELCOME', 'APPRECIATE', 'HELP', 'PLEASE', 'GIFT', 'KIND'],
      contextKeywordsB: ['MORNING', 'JOB', 'FINE', 'GREAT', 'WELL', 'NICE'],
    },
    GOOD: {
      counterpart: 'THANK-YOU',
      contextKeywordsA: ['MORNING', 'JOB', 'FINE', 'GREAT', 'WELL', 'NICE'],
      contextKeywordsB: ['WELCOME', 'APPRECIATE', 'HELP', 'PLEASE', 'GIFT', 'KIND'],
    },
    WANT: {
      counterpart: 'NEED',
      contextKeywordsA: ['LIKE', 'WISH', 'HOPE', 'COFFEE', 'WATER', 'FOOD'],
      contextKeywordsB: ['MUST', 'IMPORTANT', 'URGENT', 'HAVE-TO', 'DOCTOR', 'HELP'],
    },
    NEED: {
      counterpart: 'WANT',
      contextKeywordsA: ['MUST', 'IMPORTANT', 'URGENT', 'HAVE-TO', 'DOCTOR', 'HELP'],
      contextKeywordsB: ['LIKE', 'WISH', 'HOPE', 'COFFEE', 'WATER', 'FOOD'],
    },
    WHERE: {
      counterpart: 'WHAT',
      contextKeywordsA: ['PLACE', 'LOCATION', 'GO', 'BATHROOM', 'STORE', 'ADDRESS', 'ROOM', 'MARKET', 'SCHOOL', 'HOSPITAL'],
      contextKeywordsB: ['THING', 'NAME', 'DO', 'HAPPEN', 'MEAN', 'TIME', 'COLOR', 'FOOD'],
    },
    WHAT: {
      counterpart: 'WHERE',
      contextKeywordsA: ['THING', 'NAME', 'DO', 'HAPPEN', 'MEAN', 'TIME', 'COLOR', 'FOOD'],
      contextKeywordsB: ['PLACE', 'LOCATION', 'GO', 'BATHROOM', 'STORE', 'ADDRESS', 'ROOM', 'MARKET', 'SCHOOL', 'HOSPITAL'],
    },
  };

  /**
   * Conversational context history management
   */
  public addConversationHistory(sentence: string) {
    if (!sentence || typeof sentence !== 'string' || sentence.trim() === '') return;
    this.conversationHistory.push(sentence.trim());
    if (this.conversationHistory.length > 10) {
      this.conversationHistory.shift();
    }
  }

  public getConversationHistory(): string[] {
    return [...this.conversationHistory];
  }

  public clearConversationHistory() {
    this.conversationHistory = [];
  }

  /**
   * Register a user-provided correction during the active session
   */
  public addSessionCorrection(originalSign: string, correctedSign: string, contextNotes?: string) {
    const origClean = originalSign.toUpperCase().trim();
    const corrClean = correctedSign.toUpperCase().trim();
    if (!origClean || !corrClean) return;

    const item: SessionCorrection = {
      id: `corr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      originalSign: origClean,
      correctedSign: corrClean,
      contextNotes,
      timestamp: Date.now(),
    };
    this.sessionCorrections.set(origClean, item);
  }

  public removeSessionCorrection(originalSign: string) {
    this.sessionCorrections.delete(originalSign.toUpperCase().trim());
  }

  public getSessionCorrections(): SessionCorrection[] {
    return Array.from(this.sessionCorrections.values());
  }

  public clearSessionCorrections() {
    this.sessionCorrections.clear();
  }

  /**
   * Resolves intermediate candidate signs, applying confidence gating,
   * surrounding contextual disambiguation, and user session corrections.
   */
  public resolveCandidateSign(
    candidate: CandidateSign,
    context: DisambiguationContext
  ): {
    resolvedSign: string;
    resolvedWord: string;
    confidence: number;
    status: 'high' | 'medium' | 'low';
    isUncertain: boolean;
    uncertaintyLabel?: string;
    isUserCorrected?: boolean;
  } {
    const rawSign = candidate.sign.toUpperCase().trim();

    // 1. Check user session correction first (Hierarchy: user correction directly honors signer)
    if (this.sessionCorrections.has(rawSign)) {
      const correction = this.sessionCorrections.get(rawSign)!;
      return {
        resolvedSign: correction.correctedSign,
        resolvedWord: this.glossToEnglishWord(correction.correctedSign),
        confidence: 0.98,
        status: 'high',
        isUncertain: false,
        isUserCorrected: true,
      };
    }

    // 2. Confidence evaluation (Section 2: High / Medium / Low)
    const conf = candidate.confidence;

    // LOW CONFIDENCE (< 0.50): Never invent or hallucinate words
    if (conf < 0.50 || rawSign === 'NONE' || rawSign === 'UNKNOWN') {
      const topAlt = candidate.alternatives && candidate.alternatives.length > 0
        ? candidate.alternatives[0]
        : null;
      return {
        resolvedSign: rawSign,
        resolvedWord: topAlt ? `[Possible sign: ${topAlt.toLowerCase()} (${Math.round(conf * 100)}%)]` : '[uncertain sign]',
        confidence: conf,
        status: 'low',
        isUncertain: true,
        uncertaintyLabel: `Uncertain visual evidence (${Math.round(conf * 100)}% confidence).`,
      };
    }

    // MEDIUM CONFIDENCE (0.50 - 0.79): Compare surrounding context and alternatives
    if (conf < 0.80) {
      let bestSign = rawSign;
      let disambiguated = false;

      // Check if rawSign or alternatives match disambiguation rules
      const allCandidates = [rawSign, ...(candidate.alternatives || [])];
      for (const cand of allCandidates) {
        const rule = this.similarSignDisambiguationRules[cand];
        if (rule) {
          const convoKeywords = [
            ...(context.conversationHistory || []),
            ...this.conversationHistory,
          ]
            .join(' ')
            .toUpperCase()
            .split(/[^A-Z0-9_-]+/)
            .filter(Boolean);

          const surroundingGlosses = [
            ...context.previousSigns.map((s) => s.toUpperCase()),
            ...context.followingSigns.map((s) => s.toUpperCase()),
            ...convoKeywords,
          ];

          let scoreA = 0;
          let scoreB = 0;
          for (const s of surroundingGlosses) {
            if (rule.contextKeywordsA.includes(s)) scoreA++;
            if (rule.contextKeywordsB.includes(s)) scoreB++;
          }

          if (scoreB > scoreA) {
            bestSign = rule.counterpart;
            disambiguated = true;
          } else if (scoreA > scoreB) {
            bestSign = cand;
            disambiguated = true;
          }
          break;
        }
      }

      return {
        resolvedSign: bestSign,
        resolvedWord: this.glossToEnglishWord(bestSign),
        confidence: disambiguated ? Math.min(0.85, conf + 0.12) : conf,
        status: 'medium',
        isUncertain: false,
      };
    }

    // HIGH CONFIDENCE (>= 0.80): Accept sign directly
    return {
      resolvedSign: rawSign,
      resolvedWord: this.glossToEnglishWord(rawSign),
      confidence: conf,
      status: 'high',
      isUncertain: false,
    };
  }

  /**
   * Converts recognized sign gloss sequence into natural, grammatically meaningful English text
   * while faithfully preserving original meaning without hallucinating unexpressed facts.
   */
  public synthesizeGrammarSentence(
    signs: ActiveSentenceWord[],
    language: SignLanguage = 'ASL'
  ): GrammarConversionResult {
    if (!signs || signs.length === 0) {
      return {
        rawSequence: [],
        rawSequenceText: '',
        grammarCorrected: '',
        finalTranslation: '',
        confidence: 0,
        hasUncertainSigns: false,
        punctuation: '.',
      };
    }

    const rawGlosses = signs.map((s) => s.gloss || s.word.toUpperCase().replace(/[.,!?;:]+$/, ''));
    const rawWords = signs.map((s) => s.word);
    const hasUncertain = signs.some((s) => s.isUncertain);
    const uncertainDetails = signs
      .filter((s) => s.isUncertain)
      .map((s) => s.word);

    // Calculate average confidence
    const confidences = signs.map((s) => s.confidence ?? 0.85);
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

    // Detect Question Pattern & Facial Markers
    const isQuestion = this.detectIsQuestion(rawGlosses);
    const isExclamation = this.detectIsExclamation(rawGlosses);
    const punctuation: '.' | '?' | '!' = isQuestion ? '?' : isExclamation ? '!' : '.';

    // Convert gloss grammar (Topic-Comment / Time-first) to standard English
    const naturalEnglish = this.formatGlossSequenceToEnglish(rawGlosses, rawWords, language, punctuation);

    return {
      rawSequence: rawGlosses,
      rawSequenceText: rawGlosses.join(' '),
      grammarCorrected: naturalEnglish,
      finalTranslation: naturalEnglish,
      confidence: parseFloat(avgConfidence.toFixed(2)),
      hasUncertainSigns: hasUncertain,
      uncertainSignDetails: uncertainDetails,
      punctuation,
    };
  }

  /**
   * Detects if sign sequence represents an interrogation / question
   */
  private detectIsQuestion(glosses: string[]): boolean {
    const questionWords = [
      'WHO',
      'WHAT',
      'WHERE',
      'WHEN',
      'WHY',
      'HOW',
      'WHICH',
      'HOW-MUCH',
      'HOW-MANY',
      'QUESTION',
      'NAME-WHAT',
      'WHERE-GO',
      'WHAT-DO',
    ];

    for (const g of glosses) {
      const clean = g.toUpperCase().trim();
      if (questionWords.includes(clean)) return true;
    }

    // Common 2-word question patterns in ASL/BSL
    if (glosses.length >= 2) {
      const joined = glosses.join(' ').toUpperCase();
      if (
        joined.includes('YOU LIKE') ||
        joined.includes('YOU WANT') ||
        joined.includes('YOU UNDERSTAND') ||
        joined.includes('YOU NEED')
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detects urgency / exclamation markers
   */
  private detectIsExclamation(glosses: string[]): boolean {
    const exclamationSigns = ['HELP', 'EMERGENCY', 'STOP', 'DANGER', 'FIRE', 'HURRY', 'FAST', 'PLEASE-HELP'];
    return glosses.some((g) => exclamationSigns.includes(g.toUpperCase().trim()));
  }

  /**
   * Translates ASL/BSL/ISL grammar structure to natural English
   * E.g.
   * "TOMORROW MARKET I GO" -> "I will go to the market tomorrow."
   * "WHERE YOU GO" -> "Where are you going?"
   * "NAME YOU WHAT" -> "What is your name?"
   * "ME TIRED" -> "I am tired."
   * "I WATER WANT" -> "I want water."
   */
  private formatGlossSequenceToEnglish(
    glosses: string[],
    originalWords: string[],
    language: SignLanguage,
    punctuation: '.' | '?' | '!'
  ): string {
    const upperGlosses = glosses.map((g) => g.toUpperCase().trim());
    const joined = upperGlosses.join(' ');

    // 1. Direct idiomatic translation lookup for common multi-sign phrases
    const idiomaticPhrases: Record<string, string> = {
      'NAME YOU WHAT': 'What is your name',
      'WHAT YOUR NAME': 'What is your name',
      'HOW YOU': 'How are you',
      'NICE MEET YOU': 'Nice to meet you',
      'GOOD SEE YOU': 'Good to see you',
      'ME SCHOOL TOMORROW GO': 'I will go to school tomorrow',
      'TOMORROW SCHOOL ME GO': 'I will go to school tomorrow',
      'TOMORROW ME SCHOOL GO': 'I will go to school tomorrow',
      'I SCHOOL TOMORROW GO': 'I will go to school tomorrow',
      'TOMORROW I SCHOOL GO': 'I will go to school tomorrow',
      'TOMORROW I GO SCHOOL': 'I will go to school tomorrow',
      'YOU FOOD WANT': 'Do you want food',
      'YOU WANT FOOD': 'Do you want food',
      'YOU WATER WANT': 'Do you want water',
      'YOU WANT WATER': 'Do you want water',
      'YOU LIKE TEA': 'Do you like tea',
      'YOU LIKE COFFEE': 'Do you like coffee',
      'YESTERDAY FRIEND MEET': 'I met my friend yesterday',
      'ME YESTERDAY FRIEND MEET': 'I met my friend yesterday',
      'I YESTERDAY FRIEND MEET': 'I met my friend yesterday',
      'ME FRIEND YESTERDAY MEET': 'I met my friend yesterday',
      'ME NOT LIKE TEA': "I don't like tea",
      'I NOT LIKE TEA': "I don't like tea",
      'ME NOT LIKE COFFEE': "I don't like coffee",
      'I NOT LIKE COFFEE': "I don't like coffee",
      'I GOING SCHOOL': 'I am going to school',
      'ME GOING SCHOOL': 'I am going to school',
      'YOU GO SCHOOL': 'Are you going to school',
      'YOU GOING SCHOOL': 'Are you going to school',
      'I HOSPITAL GO DOCTOR MEET': 'I am going to the hospital to meet the doctor',
      'I TIRED WANT SLEEP': 'I am tired and want to sleep',
      'I TOMORROW MARKET GO': 'I will go to the market tomorrow',
      'TOMORROW MARKET I GO': 'I will go to the market tomorrow',
      'TOMORROW I MARKET GO': 'I will go to the market tomorrow',
      'TOMORROW I GO MARKET': 'I will go to the market tomorrow',
      'YESTERDAY MARKET I GO': 'I went to the market yesterday',
      'I YESTERDAY MARKET GO': 'I went to the market yesterday',
      'WHERE YOU GO': 'Where are you going',
      'YOU GO WHERE': 'Where are you going',
      'ME TIRED': 'I am tired',
      'I TIRED': 'I am tired',
      'ME HAPPY': 'I am happy',
      'I HAPPY': 'I am happy',
      'ME HUNGRY': 'I am hungry',
      'I HUNGRY': 'I am hungry',
      'ME NOT UNDERSTAND': 'I do not understand',
      'I NOT UNDERSTAND': 'I do not understand',
      'YOU UNDERSTAND': 'Do you understand',
      'I NEED HELP': 'I need help',
      'PLEASE HELP ME': 'Please help me',
      'THANK YOU VERY MUCH': 'Thank you very much',
      'I LIKE COFFEE': 'I like coffee',
      'I WANT WATER': 'I want water',
      'SEE YOU LATER': 'See you later',
      'HAVE GOOD DAY': 'Have a good day',
      'HAVE NICE DAY': 'Have a nice day',
    };

    if (idiomaticPhrases[joined]) {
      return `${idiomaticPhrases[joined]}${punctuation}`;
    }

    // 2. Systematic Negation Preservation Check
    const negationWords = ['NOT', 'NO', 'DON-T', "DON'T", 'DONT', 'NEVER', "CAN'T", 'CANT', "WON'T", 'WONT'];
    const hasNegation = upperGlosses.some((g) => negationWords.includes(g));

    // 3. Rule-based linguistic reconstruction:
    // Extract Time markers, Subject, Verb, Object, Modifiers
    const timeMarkers = ['TOMORROW', 'YESTERDAY', 'TODAY', 'NOW', 'SOON', 'LATER', 'MORNING', 'NIGHT'];
    const subjects = ['I', 'ME', 'YOU', 'HE', 'SHE', 'IT', 'WE', 'THEY', 'FRIEND', 'FAMILY', 'TEACHER', 'DOCTOR'];
    const verbs = ['GO', 'GOING', 'WANT', 'NEED', 'LIKE', 'HAVE', 'SEE', 'EAT', 'DRINK', 'MAKE', 'LEARN', 'HELP', 'KNOW', 'BUY', 'MEET', 'SLEEP'];

    let timeWord: string | null = null;
    let subjectWord: string | null = null;
    let verbWord: string | null = null;
    const remainingWords: string[] = [];

    for (let i = 0; i < upperGlosses.length; i++) {
      const g = upperGlosses[i];
      if (!timeWord && timeMarkers.includes(g)) {
        timeWord = g;
      } else if (!subjectWord && subjects.includes(g)) {
        subjectWord = g === 'ME' ? 'I' : g;
      } else if (!verbWord && verbs.includes(g)) {
        verbWord = g;
      } else if (!negationWords.includes(g)) {
        remainingWords.push(originalWords[i] || g.toLowerCase());
      }
    }

    // If negation is present, faithfully reconstruct without inverting polarity
    if (hasNegation && verbWord) {
      const subj = subjectWord || 'I';
      const obj = remainingWords.length > 0 ? ` ${remainingWords.join(' ')}` : '';
      if (verbWord === 'LIKE' || verbWord === 'WANT' || verbWord === 'KNOW' || verbWord === 'UNDERSTAND') {
        const aux = (subj === 'HE' || subj === 'SHE' || subj === 'IT') ? "doesn't" : "don't";
        return `${subj} ${aux} ${verbWord.toLowerCase()}${obj}${punctuation}`;
      } else if (verbWord === 'GO') {
        return `${subj} will not go to the${obj}${punctuation}`;
      } else {
        return `${subj} did not ${verbWord.toLowerCase()}${obj}${punctuation}`;
      }
    }

    // If standard Time + Subject + Verb + Object recognized:
    if (timeWord && subjectWord && verbWord) {
      let verbForm = verbWord.toLowerCase();
      let prep = '';
      if (verbWord === 'GO' || verbWord === 'GOING') {
        prep = 'to ';
        if (remainingWords.length > 0 && !remainingWords[0].startsWith('the') && !remainingWords[0].startsWith('school')) {
          prep = 'to the ';
        }
      }

      if (timeWord === 'TOMORROW' || timeWord === 'SOON' || timeWord === 'LATER') {
        const obj = remainingWords.length > 0 ? `${prep}${remainingWords.join(' ')}` : '';
        return `${subjectWord} will ${verbForm === 'going' ? 'go' : verbForm} ${obj} ${timeWord.toLowerCase()}${punctuation}`.replace(/\s+/g, ' ').trim();
      } else if (timeWord === 'YESTERDAY') {
        const pastVerb = verbWord === 'GO' || verbWord === 'GOING' ? 'went' : verbWord === 'MEET' ? 'met' : `${verbForm}ed`;
        const obj = remainingWords.length > 0 ? `${prep}${remainingWords.join(' ')}` : '';
        return `${subjectWord} ${pastVerb} ${obj} yesterday${punctuation}`.replace(/\s+/g, ' ').trim();
      }
    }

    // Questions without Time markers (e.g. YOU FOOD WANT -> Do you want food?)
    if (subjectWord === 'YOU' && verbWord && (punctuation === '?' || this.detectIsQuestion(upperGlosses))) {
      const obj = remainingWords.length > 0 ? ` ${remainingWords.join(' ')}` : '';
      if (verbWord === 'GO' || verbWord === 'GOING') {
        return `Are you going to${obj}?`;
      }
      return `Do you ${verbWord.toLowerCase()}${obj}?`;
    }

    // Present continuous restoration (e.g. I GOING SCHOOL -> I am going to school.)
    if (subjectWord && verbWord === 'GOING') {
      const obj = remainingWords.length > 0 ? ` to ${remainingWords.join(' ')}` : '';
      const aux = subjectWord === 'I' ? 'am' : subjectWord === 'YOU' ? 'are' : 'is';
      return `${subjectWord} ${aux} going${obj}${punctuation}`;
    }

    // 3. Fallback: Assemble preserved words cleanly, capitalizing first letter and honoring punctuation
    const words = originalWords.map((w, idx) => {
      const clean = w.trim().replace(/[.,!?;:]+$/, '');
      if (clean.toLowerCase() === 'me' && idx === 0) return 'I';
      if (clean.toLowerCase() === 'i') return 'I';
      return clean;
    });

    if (words.length === 0) return '';
    const capitalized = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    words[0] = capitalized;

    const assembled = words.join(' ');
    return `${assembled}${punctuation}`;
  }

  private glossToEnglishWord(gloss: string): string {
    const clean = gloss.replace(/^[-\s]+|[-\s]+$/g, '').toLowerCase();
    if (clean === 'me' || clean === 'i') return 'I';
    if (clean.includes('-')) {
      return clean.replace(/-/g, ' ');
    }
    return clean;
  }
}

export const languageContextEngine = new LanguageContextEngine();
