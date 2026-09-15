/**
 * Common conversational sentences categorized for rapid interpretation,
 * interactive Sentence Studio translation, and automatic mapping.
 */

export interface SignBreakdownItem {
  sign: string;
  handshape: string;
  movement: string;
  tips?: string;
  nonManual?: string;
}

export interface CommonSentenceItem {
  id: string;
  sentence: string;
  text?: string;
  label?: string;
  gloss: string;
  glosses: string[];
  emoji: string;
  category:
    | 'greetings'
    | 'conversation'
    | 'polite'
    | 'responses'
    | 'greeting'
    | 'courtesy'
    | 'question'
    | 'help'
    | 'status';
  categoryLabel: string;
  keywords: string[];
  aslDescription: string;
  signsBreakdown: SignBreakdownItem[];
}

export interface SentenceCategoryMeta {
  id: 'all' | 'greetings' | 'conversation' | 'polite' | 'responses';
  label: string;
  emoji: string;
  icon?: string;
  description: string;
}

export const SENTENCE_STUDIO_CATEGORIES: SentenceCategoryMeta[] = [
  { id: 'all', label: 'All Phrases', emoji: '🌟', description: 'Browse all sign language conversational sentences' },
  { id: 'greetings', label: 'Greetings', emoji: '👋', description: 'Warm hello, morning, evening & departure signs' },
  { id: 'conversation', label: 'Everyday conversation', emoji: '💬', description: 'Daily questions, understanding & clarification phrases' },
  { id: 'polite', label: 'Polite phrases', emoji: '🤝', description: 'Respectful requests, gratitude & courtesy expressions' },
  { id: 'responses', label: 'Useful responses', emoji: '✨', description: 'Affirmations, doubts, agreements & quick replies' },
];

export const COMMON_CONVERSATIONAL_SENTENCES: CommonSentenceItem[] = [
  // ==================== GREETINGS (9 sentences) ====================
  {
    id: 'hello-hi',
    sentence: 'Hello! / Hi!',
    gloss: 'HELLO / HI',
    glosses: ['HELLO'],
    emoji: '👋',
    category: 'greetings',
    categoryLabel: 'Greetings',
    keywords: ['hello', 'hi', 'greet', 'welcome', 'hey', 'start'],
    aslDescription: 'Dominant open B-hand starts at temple and waves outward in a friendly, cheerful salute or open-palm wave.',
    signsBreakdown: [
      {
        sign: 'HELLO',
        handshape: 'Open B-hand (flat four fingers together, thumb tucked slightly)',
        movement: 'Fingertips touch temple/forehead, then sweep outward forward and right in a salute gesture',
        tips: 'Smile warmly and make eye contact with the person you are greeting.'
      }
    ]
  },
  {
    id: 'good-morning',
    sentence: 'Good morning!',
    gloss: 'GOOD MORNING',
    glosses: ['GOOD', 'MORNING'],
    emoji: '🌅',
    category: 'greetings',
    categoryLabel: 'Greetings',
    keywords: ['good', 'morning', 'day', 'sunrise', 'early', 'greeting'],
    aslDescription: 'Sign GOOD (fingertips at chin falling into base open palm), then sign MORNING (dominant flat hand rising up under non-dominant forearm like the sun).',
    signsBreakdown: [
      {
        sign: 'GOOD',
        handshape: 'Flat open hand at chin',
        movement: 'Fingertips touch chin, then drop into the open palm of the non-dominant hand',
        tips: 'Keep movement crisp and positive.'
      },
      {
        sign: 'MORNING',
        handshape: 'Dominant flat hand rising from crook of non-dominant elbow',
        movement: 'Non-dominant arm rests horizontal as the horizon; dominant hand arcs upward like the sun rising',
        tips: 'Rise smoothly up to shoulder height.'
      }
    ]
  },
  {
    id: 'good-afternoon',
    sentence: 'Good afternoon!',
    gloss: 'GOOD AFTERNOON',
    glosses: ['GOOD', 'AFTERNOON'],
    emoji: '☀️',
    category: 'greetings',
    categoryLabel: 'Greetings',
    keywords: ['good', 'afternoon', 'day', 'lunch', 'sun'],
    aslDescription: 'Sign GOOD (chin to palm), then sign AFTERNOON (dominant forearm angled downward past midday horizontal sun).',
    signsBreakdown: [
      {
        sign: 'GOOD',
        handshape: 'Flat hand on chin dropping to base palm',
        movement: 'Chin to palm smooth release',
        tips: 'Pleasant, open facial expression.'
      },
      {
        sign: 'AFTERNOON',
        handshape: 'Flat open hand palm down',
        movement: 'Dominant arm rests on horizontal non-dominant arm and tilts forward/downward at a 45° angle twice',
        tips: 'Represents the sun descending past noon.'
      }
    ]
  },
  {
    id: 'good-evening',
    sentence: 'Good evening!',
    gloss: 'GOOD EVENING',
    glosses: ['GOOD', 'EVENING'],
    emoji: '🌆',
    category: 'greetings',
    categoryLabel: 'Greetings',
    keywords: ['good', 'evening', 'night', 'sunset', 'dusk', 'greeting'],
    aslDescription: 'Sign GOOD, then sign EVENING/NIGHT (dominant bent-hand wrist hooks over non-dominant wrist like the sun setting below the horizon).',
    signsBreakdown: [
      {
        sign: 'GOOD',
        handshape: 'Flat hand from chin to base palm',
        movement: 'Drop forward smoothly into base hand',
        tips: 'Standard affirmative baseline.'
      },
      {
        sign: 'EVENING / NIGHT',
        handshape: 'Dominant bent hand, fingers curved downward',
        movement: 'Dominant wrist rests or arches over the horizontal non-dominant wrist',
        tips: 'Represents the sun sinking below the edge of the world.'
      }
    ]
  },
  {
    id: 'how-are-you',
    sentence: 'How are you?',
    gloss: 'HOW YOU',
    glosses: ['HOW', 'YOU'],
    emoji: '🤔',
    category: 'greetings',
    categoryLabel: 'Greetings',
    keywords: ['how', 'are', 'you', 'feeling', 'doing', 'health'],
    aslDescription: 'Both curved hands back of knuckles together roll outward until palms face upward (HOW), then point dominant index finger directly forward (YOU).',
    signsBreakdown: [
      {
        sign: 'HOW',
        handshape: 'Both curved hands with backs of fingers touching',
        movement: 'Roll hands upward and outward so palms face upward towards chest',
        tips: 'Furrow eyebrows slightly (WH-question marker).'
      },
      {
        sign: 'YOU',
        handshape: 'Index finger pointing (1-hand)',
        movement: 'Point smoothly forward toward interlocutor',
        tips: 'Direct eye contact completes the conversational link.'
      }
    ]
  },
  {
    id: 'im-fine-thank-you',
    sentence: 'I’m fine, thank you.',
    gloss: 'I FINE THANK-YOU',
    glosses: ['I', 'FINE', 'THANK-YOU'],
    emoji: '😊',
    category: 'greetings',
    categoryLabel: 'Greetings',
    keywords: ['fine', 'thank', 'you', 'well', 'good', 'status'],
    aslDescription: 'Point to chest (I), tap thumb of open 5-hand on center of chest twice (FINE), then fingertips from chin extended forward (THANK-YOU).',
    signsBreakdown: [
      {
        sign: 'FINE',
        handshape: 'Open 5-hand (fingers spread, thumb perpendicular)',
        movement: 'Touch tip of thumb to center chest with a gentle tap or slight forward bounce',
        tips: 'Smile comfortably to indicate wellness.'
      },
      {
        sign: 'THANK-YOU',
        handshape: 'Flat open hand, fingertips on chin',
        movement: 'Move hand forward and down toward the listener in gratitude',
        tips: 'Nod head gently.'
      }
    ]
  },
  {
    id: 'nice-to-meet-you',
    sentence: 'Nice to meet you.',
    gloss: 'NICE MEET YOU',
    glosses: ['NICE', 'MEET', 'YOU'],
    emoji: '🤝',
    category: 'greetings',
    categoryLabel: 'Greetings',
    keywords: ['nice', 'meet', 'greet', 'welcome', 'introduce', 'pleasure'],
    aslDescription: 'Slide dominant flat hand across non-dominant palm (NICE), bring two upright index fingers together facing each other (MEET), and point forward (YOU).',
    signsBreakdown: [
      {
        sign: 'NICE',
        handshape: 'Both hands flat open, palms facing each other',
        movement: 'Dominant hand slides smoothly across non-dominant palm from heel to fingertips',
        tips: 'Smooth, clean horizontal glide.'
      },
      {
        sign: 'MEET',
        handshape: 'Both hands with index finger upright (1-handshapes)',
        movement: 'Bring knuckles of both index fingers together in front of chest',
        tips: 'Represents two people approaching each other.'
      }
    ]
  },
  {
    id: 'see-you-later',
    sentence: 'See you later.',
    gloss: 'SEE YOU LATER',
    glosses: ['SEE', 'YOU', 'LATER'],
    emoji: '👀',
    category: 'greetings',
    categoryLabel: 'Greetings',
    keywords: ['see', 'later', 'goodbye', 'bye', 'farewell', 'depart'],
    aslDescription: 'V-handshape near eye moves forward (SEE), point to person (YOU), then L-handshape tilts forward from wrist (LATER).',
    signsBreakdown: [
      {
        sign: 'SEE',
        handshape: 'V-hand (index and middle fingers spread like eyes)',
        movement: 'Fingertips near cheek/eye thrust forward toward person',
        tips: 'Direct gaze along the direction of fingers.'
      },
      {
        sign: 'LATER',
        handshape: 'L-hand (thumb and index forming an L)',
        movement: 'Dominant index finger tilts downward from the wrist like a clock hand ticking forward',
        tips: 'Casual, friendly motion.'
      }
    ]
  },
  {
    id: 'take-care',
    sentence: 'Take care.',
    gloss: 'TAKE-CARE',
    glosses: ['TAKE-CARE'],
    emoji: '💙',
    category: 'greetings',
    categoryLabel: 'Greetings',
    keywords: ['take', 'care', 'protect', 'safe', 'goodbye', 'warmth'],
    aslDescription: 'Both hands form K-handshapes (or V with thumb between). Stack dominant K atop non-dominant K and tap twice gently.',
    signsBreakdown: [
      {
        sign: 'TAKE-CARE',
        handshape: 'Both hands in K-handshape (thumb resting between index and middle finger)',
        movement: 'Dominant K-hand taps on top of non-dominant K-hand in a protective two-stroke motion',
        tips: 'Warm, sincere facial expression with slight nod.'
      }
    ]
  },

  // ==================== EVERYDAY CONVERSATION (10 sentences) ====================
  {
    id: 'what-are-you-doing',
    sentence: 'What are you doing?',
    gloss: 'YOU DO WHAT',
    glosses: ['YOU', 'DO', 'WHAT'],
    emoji: '🔍',
    category: 'conversation',
    categoryLabel: 'Everyday conversation',
    keywords: ['what', 'doing', 'action', 'activity', 'busy', 'question'],
    aslDescription: 'Point to person (YOU), pinch index and thumb together palms up fluttering (DO-DO-DO), and shake hands side-to-side palms up with furrowed brows (WHAT).',
    signsBreakdown: [
      {
        sign: 'DO-WHAT / DO',
        handshape: 'Both hands palms up, index fingers touching thumbs repeatedly (pinch gesture)',
        movement: 'Quick double pinch flutter while furrowing brows',
        tips: 'In ASL, #DO-DO with furrowed brows natively translates to "What are you doing?".'
      }
    ]
  },
  {
    id: 'where-are-you-going',
    sentence: 'Where are you going?',
    gloss: 'YOU GO WHERE',
    glosses: ['YOU', 'GO', 'WHERE'],
    emoji: '🚶',
    category: 'conversation',
    categoryLabel: 'Everyday conversation',
    keywords: ['where', 'going', 'destination', 'travel', 'direction', 'leave'],
    aslDescription: 'Point to person (YOU), index fingers arc forward in destination motion (GO), then index finger wags side-to-side with furrowed eyebrows (WHERE).',
    signsBreakdown: [
      {
        sign: 'GO',
        handshape: 'Both index fingers pointed forward',
        movement: 'Arc fingers upward and forward simultaneously toward travel direction',
        tips: 'Shows moving away from current location.'
      },
      {
        sign: 'WHERE',
        handshape: 'Index finger pointing upright (1-hand)',
        movement: 'Wiggle/shake index finger side-to-side like a pendulum with furrowed brows',
        tips: 'Head tilts slightly forward with questioning eyes.'
      }
    ]
  },
  {
    id: 'what-happened',
    sentence: 'What happened?',
    gloss: 'HAPPEN WHAT',
    glosses: ['HAPPEN', 'WHAT'],
    emoji: '⚡',
    category: 'conversation',
    categoryLabel: 'Everyday conversation',
    keywords: ['what', 'happened', 'event', 'occurred', 'news', 'shock'],
    aslDescription: 'Both index fingers horizontal palms up flip over simultaneously so palms face down (HAPPEN), with furrowed eyebrows and open questioning expression.',
    signsBreakdown: [
      {
        sign: 'HAPPEN',
        handshape: 'Both hands index fingers pointing forward, palms up',
        movement: 'Rotate both wrists inward so palms quickly face downward',
        tips: 'Facial expression shows concern or curiosity.'
      }
    ]
  },
  {
    id: 'are-you-okay',
    sentence: 'Are you okay?',
    gloss: 'YOU OKAY',
    glosses: ['YOU', 'OKAY'],
    emoji: '🩺',
    category: 'conversation',
    categoryLabel: 'Everyday conversation',
    keywords: ['are', 'you', 'okay', 'fine', 'hurt', 'check', 'wellness'],
    aslDescription: 'Point to person (YOU), fingerspell O-K or sign FINE/WELL with raised eyebrows indicating a Yes/No question.',
    signsBreakdown: [
      {
        sign: 'OKAY',
        handshape: 'Form O-hand then snap into K-hand',
        movement: 'Fingerspell "O" then "K" cleanly in front of chest',
        tips: 'CRITICAL: Raise your eyebrows high to mark the sentence as an inquiry.'
      }
    ]
  },
  {
    id: 'i-understand',
    sentence: 'I understand.',
    gloss: 'I UNDERSTAND',
    glosses: ['I', 'UNDERSTAND'],
    emoji: '💡',
    category: 'conversation',
    categoryLabel: 'Everyday conversation',
    keywords: ['understand', 'comprehend', 'got', 'clear', 'know'],
    aslDescription: 'Dominant fist near temple flicks index finger straight up like a lightbulb turning on, accompanied by an affirmative head nod.',
    signsBreakdown: [
      {
        sign: 'UNDERSTAND',
        handshape: 'S-fist near forehead/temple',
        movement: 'Flick index finger upward like a light bulb snapping on',
        tips: 'Nod your head simultaneously to express agreement and clarity.'
      }
    ]
  },
  {
    id: 'i-dont-understand',
    sentence: 'I don’t understand.',
    gloss: 'I NOT UNDERSTAND',
    glosses: ['I', 'NOT', 'UNDERSTAND'],
    emoji: '🤷',
    category: 'conversation',
    categoryLabel: 'Everyday conversation',
    keywords: ['dont', 'understand', 'confused', 'unclear', 'lost', 'repeat'],
    aslDescription: 'Sign UNDERSTAND near forehead while shaking head side-to-side in clear negation, with slightly puzzled eyebrows.',
    signsBreakdown: [
      {
        sign: 'NOT UNDERSTAND',
        handshape: 'Fist near temple flicking index finger upward',
        movement: 'Flick index finger while shaking head "no" firmly',
        tips: 'Head shake must coincide directly with the sign stroke.'
      }
    ]
  },
  {
    id: 'please-say-that-again',
    sentence: 'Please say that again.',
    gloss: 'PLEASE AGAIN SAY',
    glosses: ['PLEASE', 'AGAIN', 'SAY'],
    emoji: '🔄',
    category: 'conversation',
    categoryLabel: 'Everyday conversation',
    keywords: ['please', 'say', 'again', 'repeat', 'clarify', 'pardon'],
    aslDescription: 'Sign PLEASE (chest rub), then dominant curved hand arcs into flat base palm (AGAIN), with an open, polite facial tilt.',
    signsBreakdown: [
      {
        sign: 'PLEASE',
        handshape: 'Flat hand on chest in circular rub',
        movement: 'Circular clockwise motion',
        tips: 'Conveys polite intention.'
      },
      {
        sign: 'AGAIN',
        handshape: 'Dominant bent hand, non-dominant flat palm up',
        movement: 'Dominant bent fingertips arc over and land firmly into base palm',
        tips: 'Clear, defined landing in palm.'
      }
    ]
  },
  {
    id: 'please-speak-slowly',
    sentence: 'Please speak slowly.',
    gloss: 'PLEASE SIGN SLOW',
    glosses: ['PLEASE', 'SIGN', 'SLOW'],
    emoji: '🐢',
    category: 'conversation',
    categoryLabel: 'Everyday conversation',
    keywords: ['speak', 'slowly', 'sign', 'pace', 'speed', 'please'],
    aslDescription: 'Sign PLEASE, then dominant flat hand slowly glides up the back of non-dominant wrist and forearm (SLOW).',
    signsBreakdown: [
      {
        sign: 'SLOW',
        handshape: 'Dominant open hand palm down on back of non-dominant hand',
        movement: 'Stroke dominant fingertips slowly up the forearm toward elbow',
        tips: 'Deliberate, slow execution reflects the meaning.'
      }
    ]
  },
  {
    id: 'give-me-a-minute',
    sentence: 'Give me a minute.',
    gloss: 'WAIT ONE MINUTE',
    glosses: ['WAIT', 'ONE', 'MINUTE'],
    emoji: '⏱️',
    category: 'conversation',
    categoryLabel: 'Everyday conversation',
    keywords: ['give', 'minute', 'wait', 'hold', 'moment', 'pause'],
    aslDescription: 'Both curved hands palm up wiggle fingers toward body (WAIT), or index finger held up (ONE) resting on non-dominant palm ticking like a minute hand (MINUTE).',
    signsBreakdown: [
      {
        sign: 'WAIT',
        handshape: 'Both hands palms facing up, fingers bent',
        movement: 'Wiggle fingers slightly toward body with a patient posture',
        tips: 'Hold position gently.'
      },
      {
        sign: 'MINUTE',
        handshape: 'Dominant index finger against base flat palm',
        movement: 'Index finger tilts forward like a clock minute tick',
        tips: 'Short, precise movement.'
      }
    ]
  },
  {
    id: 'no-problem',
    sentence: 'No problem.',
    gloss: 'NO PROBLEM',
    glosses: ['NO', 'PROBLEM'],
    emoji: '👌',
    category: 'conversation',
    categoryLabel: 'Everyday conversation',
    keywords: ['no', 'problem', 'easy', 'welcome', 'fine', 'alright'],
    aslDescription: 'Snap index and middle finger down on thumb (NO), or sign NONE, then both bent V-hands knuckles tap and twist (PROBLEM) with an easy smile.',
    signsBreakdown: [
      {
        sign: 'NO',
        handshape: 'Index and middle fingers together meeting thumb',
        movement: 'Snap shut firmly against thumb',
        tips: 'Standard negation particle.'
      },
      {
        sign: 'PROBLEM',
        handshape: 'Both hands in bent-V handshapes (curled knuckles)',
        movement: 'Knuckles touch and twist past each other twice',
        tips: 'Smile and shake head slightly to indicate ease.'
      }
    ]
  },

  // ==================== POLITE PHRASES (9 sentences) ====================
  {
    id: 'please',
    sentence: 'Please.',
    gloss: 'PLEASE',
    glosses: ['PLEASE'],
    emoji: '🙏',
    category: 'polite',
    categoryLabel: 'Polite phrases',
    keywords: ['please', 'polite', 'courtesy', 'request', 'ask'],
    aslDescription: 'Flat dominant hand placed palm-down against center of chest, rotating in a gentle clockwise circle.',
    signsBreakdown: [
      {
        sign: 'PLEASE',
        handshape: 'Flat open B-hand, thumb relaxed against side',
        movement: 'Place palm flat against center chest and rub in a circular clockwise motion',
        tips: 'Sincere facial expression conveys genuine respect.'
      }
    ]
  },
  {
    id: 'thank-you',
    sentence: 'Thank you.',
    gloss: 'THANK-YOU',
    glosses: ['THANK-YOU'],
    emoji: '💐',
    category: 'polite',
    categoryLabel: 'Polite phrases',
    keywords: ['thank', 'thanks', 'gratitude', 'appreciate'],
    aslDescription: 'Fingertips of flat dominant hand touch chin/lips and extend forward and down toward the other person.',
    signsBreakdown: [
      {
        sign: 'THANK-YOU',
        handshape: 'Flat open hand, fingers together',
        movement: 'Touch lips/chin with fingertips, then extend hand outward palm up',
        tips: 'A slight nod of the head enhances the sign.'
      }
    ]
  },
  {
    id: 'youre-welcome',
    sentence: 'You’re welcome.',
    gloss: 'WELCOME',
    glosses: ['WELCOME'],
    emoji: '🤗',
    category: 'polite',
    categoryLabel: 'Polite phrases',
    keywords: ['welcome', 'youre', 'courtesy', 'glad', 'response'],
    aslDescription: 'Dominant flat open hand starts slightly to side at waist level, sweeping gracefully inward and toward the body.',
    signsBreakdown: [
      {
        sign: 'WELCOME',
        handshape: 'Flat open hand palm facing up and inward',
        movement: 'Sweep hand in a welcoming inward arc toward your midsection',
        tips: 'Smile warmly to welcome the other person.'
      }
    ]
  },
  {
    id: 'excuse-me',
    sentence: 'Excuse me.',
    gloss: 'EXCUSE-ME',
    glosses: ['EXCUSE-ME'],
    emoji: '🙋',
    category: 'polite',
    categoryLabel: 'Polite phrases',
    keywords: ['excuse', 'pardon', 'apology', 'attention', 'pass'],
    aslDescription: 'Curved fingertips of dominant hand brush across flat palm of non-dominant hand toward the wrist twice.',
    signsBreakdown: [
      {
        sign: 'EXCUSE-ME',
        handshape: 'Dominant hand curved/bent, non-dominant hand open palm facing up',
        movement: 'Brush dominant fingertips from base of fingers back along the palm to the wrist',
        tips: 'Slight polite tilt of the head.'
      }
    ]
  },
  {
    id: 'im-sorry',
    sentence: 'I’m sorry.',
    gloss: 'I SORRY',
    glosses: ['I', 'SORRY'],
    emoji: '🙇',
    category: 'polite',
    categoryLabel: 'Polite phrases',
    keywords: ['sorry', 'apologize', 'regret', 'forgive', 'mistake'],
    aslDescription: 'Form an A-hand (fist with thumb alongside) and rub in a circular clockwise motion over the center of the chest with a contrite expression.',
    signsBreakdown: [
      {
        sign: 'SORRY',
        handshape: 'A-fist (fist with thumb along fingers)',
        movement: 'Rub fist in circular motion against sternum/chest',
        tips: 'Contrite, apologetic facial expression is essential.'
      }
    ]
  },
  {
    id: 'thats-okay',
    sentence: 'That’s okay.',
    gloss: 'THAT OKAY',
    glosses: ['THAT', 'OKAY'],
    emoji: '👌',
    category: 'polite',
    categoryLabel: 'Polite phrases',
    keywords: ['thats', 'okay', 'fine', 'alright', 'forgive', 'comfort'],
    aslDescription: 'Point Y-hand down onto flat palm (THAT), then fingerspell O-K or sign FINE with an assuring, comforting nod.',
    signsBreakdown: [
      {
        sign: 'THAT / OKAY',
        handshape: 'O then K handshapes or open flat reassuring gesture',
        movement: 'Quick fingerspell O-K with a relaxed downward bounce and affirmative nod',
        tips: 'Shows forgiveness and reassurance.'
      }
    ]
  },
  {
    id: 'may-i',
    sentence: 'May I?',
    gloss: 'MAY I',
    glosses: ['MAY', 'I'],
    emoji: '🙋‍♂️',
    category: 'polite',
    categoryLabel: 'Polite phrases',
    keywords: ['may', 'can', 'permit', 'permission', 'allow', 'question'],
    aslDescription: 'Both open flat hands held out palms up dipping slightly forward (ALLOW / PERMIT / MAY), then point to chest (I) with questioning raised eyebrows.',
    signsBreakdown: [
      {
        sign: 'MAY / PERMIT',
        handshape: 'Both flat hands, palms angled up',
        movement: 'Dip hands forward in an inquiring gesture of permission',
        tips: 'Raise eyebrows high to formulate the permission question.'
      }
    ]
  },
  {
    id: 'could-you-help-me',
    sentence: 'Could you help me?',
    gloss: 'YOU HELP ME',
    glosses: ['YOU', 'HELP', 'ME'],
    emoji: '🤝',
    category: 'polite',
    categoryLabel: 'Polite phrases',
    keywords: ['could', 'help', 'assist', 'support', 'favor'],
    aslDescription: 'Directional sign: Closed fist with thumb up resting on base flat palm moves from listener towards signer chest, with questioning raised eyebrows.',
    signsBreakdown: [
      {
        sign: 'HELP-ME (Directional)',
        handshape: 'Dominant fist thumb-up on non-dominant open flat palm',
        movement: 'Start in front of the other person and lift toward your own chest',
        tips: 'Because HELP is directional, moving toward you means "help me".'
      }
    ]
  },
  {
    id: 'can-you-please-help-me',
    sentence: 'Can you please help me?',
    gloss: 'PLEASE HELP ME',
    glosses: ['PLEASE', 'HELP', 'ME'],
    emoji: '🆘',
    category: 'polite',
    categoryLabel: 'Polite phrases',
    keywords: ['can', 'please', 'help', 'urgent', 'assist', 'need'],
    aslDescription: 'Sign PLEASE with chest circular motion, then immediately execute directional HELP moving from interlocutor toward self with pleading raised eyebrows.',
    signsBreakdown: [
      {
        sign: 'PLEASE',
        handshape: 'Flat hand on chest',
        movement: 'Circular clockwise rub',
        tips: 'Shows politeness before the urgent request.'
      },
      {
        sign: 'HELP-ME',
        handshape: 'Fist on base palm moving inward',
        movement: 'Draw smoothly toward yourself with earnest eye contact',
        tips: 'Raised eyebrows convey the question.'
      }
    ]
  },

  // ==================== USEFUL RESPONSES (10 sentences) ====================
  {
    id: 'yes-sure',
    sentence: 'Yes, sure.',
    gloss: 'YES SURE',
    glosses: ['YES', 'SURE'],
    emoji: '👍',
    category: 'responses',
    categoryLabel: 'Useful responses',
    keywords: ['yes', 'sure', 'agree', 'definitely', 'affirm'],
    aslDescription: 'Nod S-fist up and down (YES), then index finger upright at chin moves forward in an assertive line (SURE/TRUE).',
    signsBreakdown: [
      {
        sign: 'YES',
        handshape: 'S-fist',
        movement: 'Tilt fist up and down from the wrist like a nodding head',
        tips: 'Nod your actual head to amplify the affirmation.'
      },
      {
        sign: 'SURE / TRUE',
        handshape: 'Index finger pointing upward (1-hand) at lips',
        movement: 'Move index finger straight forward from mouth',
        tips: 'Clear, confident forward motion.'
      }
    ]
  },
  {
    id: 'of-course',
    sentence: 'Of course.',
    gloss: 'OF-COURSE',
    glosses: ['OF-COURSE'],
    emoji: '💯',
    category: 'responses',
    categoryLabel: 'Useful responses',
    keywords: ['course', 'absolutely', 'certainly', 'sure', 'positive'],
    aslDescription: 'Sign TRUE/SURE with index finger moving forward from chin with a firm head nod, or sign NATURAL/OF-COURSE (both N-hands arcing).',
    signsBreakdown: [
      {
        sign: 'OF-COURSE / TRUE',
        handshape: 'Dominant 1-finger at mouth/chin',
        movement: 'Move straight outward with strong decisive stroke',
        tips: 'Affirmative facial nod confirms certainty.'
      }
    ]
  },
  {
    id: 'maybe',
    sentence: 'Maybe.',
    gloss: 'MAYBE',
    glosses: ['MAYBE'],
    emoji: '⚖️',
    category: 'responses',
    categoryLabel: 'Useful responses',
    keywords: ['maybe', 'perhaps', 'possible', 'uncertain', 'balance'],
    aslDescription: 'Both open flat hands held palm-up in front of chest, alternating up and down like balancing scales, with head tilted.',
    signsBreakdown: [
      {
        sign: 'MAYBE',
        handshape: 'Both flat hands palms facing up',
        movement: 'Alternate lifting one hand while lowering the other, like a scale balancing possibilities',
        tips: 'Pursed lips or slight shoulder shrug shows uncertainty.'
      }
    ]
  },
  {
    id: 'i-think-so',
    sentence: 'I think so.',
    gloss: 'I THINK SO',
    glosses: ['I', 'THINK', 'SO'],
    emoji: '💭',
    category: 'responses',
    categoryLabel: 'Useful responses',
    keywords: ['think', 'believe', 'guess', 'suppose', 'probably'],
    aslDescription: 'Touch tip of index finger to temple (THINK), then nod head affirmatively or point forward in agreement.',
    signsBreakdown: [
      {
        sign: 'THINK',
        handshape: 'Index finger pointing (1-hand)',
        movement: 'Touch fingertip to forehead/temple',
        tips: 'Nod gently to indicate "I think yes / I think so".'
      }
    ]
  },
  {
    id: 'i-dont-think-so',
    sentence: 'I don’t think so.',
    gloss: 'I THINK NOT',
    glosses: ['I', 'THINK', 'NOT'],
    emoji: '🙅',
    category: 'responses',
    categoryLabel: 'Useful responses',
    keywords: ['dont', 'think', 'disagree', 'doubt', 'unlikely', 'negative'],
    aslDescription: 'Touch tip of index finger to temple (THINK) while shaking head "no", then thumb under chin flicking outward (NOT).',
    signsBreakdown: [
      {
        sign: 'THINK NOT',
        handshape: 'Index finger touches temple, then A-thumb flicks from under chin',
        movement: 'Synchronize head shake side-to-side with the hand motion',
        tips: 'Clear, polite negative facial expression.'
      }
    ]
  },
  {
    id: 'not-yet',
    sentence: 'Not yet.',
    gloss: 'NOT YET',
    glosses: ['NOT', 'YET'],
    emoji: '⏳',
    category: 'responses',
    categoryLabel: 'Useful responses',
    keywords: ['not', 'yet', 'pending', 'waiting', 'incomplete'],
    aslDescription: 'Dominant flat hand held at side near waist with fingers pointing down, palm facing back, bending wrist back and forth twice with tongue slightly between teeth.',
    signsBreakdown: [
      {
        sign: 'NOT-YET',
        handshape: 'Dominant flat hand, fingers together pointing downward',
        movement: 'Flap hand backwards from wrist two or three times near hip',
        tips: 'Non-manual marker: slightly press tongue against lower lip or teeth.'
      }
    ]
  },
  {
    id: 'im-not-sure',
    sentence: 'I’m not sure.',
    gloss: 'I NOT SURE',
    glosses: ['I', 'NOT', 'SURE'],
    emoji: '🤷‍♂️',
    category: 'responses',
    categoryLabel: 'Useful responses',
    keywords: ['sure', 'doubt', 'uncertain', 'dont', 'know'],
    aslDescription: 'Sign NOT (thumb flicks forward from under chin), then sign SURE with slight shoulder shrug and head shake.',
    signsBreakdown: [
      {
        sign: 'NOT SURE',
        handshape: 'Thumb under chin outward flick, followed by 1-hand hesitation',
        movement: 'Flick thumb outward from chin and shrug shoulders',
        tips: 'Raise shoulders slightly and tilt head to reflect uncertainty.'
      }
    ]
  },
  {
    id: 'sounds-good',
    sentence: 'Sounds good.',
    gloss: 'SOUNDS GOOD',
    glosses: ['SOUNDS', 'GOOD'],
    emoji: '👌',
    category: 'responses',
    categoryLabel: 'Useful responses',
    keywords: ['sounds', 'good', 'agree', 'deal', 'great', 'fine'],
    aslDescription: 'Touch ear index finger (HEAR / SOUND), then sign GOOD (chin to palm) with an enthusiastic nod.',
    signsBreakdown: [
      {
        sign: 'HEAR / SOUND',
        handshape: 'Index finger pointing to earlobe',
        movement: 'Touch ear lightly',
        tips: 'Establishes the auditory reference.'
      },
      {
        sign: 'GOOD',
        handshape: 'Flat hand on chin dropping into base palm',
        movement: 'Drop forward smoothly',
        tips: 'Nod head to signify agreement.'
      }
    ]
  },
  {
    id: 'thats-great',
    sentence: 'That’s great!',
    gloss: 'THAT GREAT',
    glosses: ['THAT', 'GREAT'],
    emoji: '🎉',
    category: 'responses',
    categoryLabel: 'Useful responses',
    keywords: ['great', 'wonderful', 'awesome', 'fantastic', 'celebrate'],
    aslDescription: 'Both open 5-hands held up at shoulder level palms forward, pushing outward twice with an excited smile (GREAT / WONDERFUL).',
    signsBreakdown: [
      {
        sign: 'GREAT / WONDERFUL',
        handshape: 'Both open 5-hands, palms facing outward',
        movement: 'Push hands forward twice in celebratory motion',
        tips: 'Wide smile and open eyes for enthusiasm.'
      }
    ]
  },
  {
    id: 'never-mind',
    sentence: 'Never mind.',
    gloss: 'NEVER-MIND',
    glosses: ['NEVER-MIND'],
    emoji: '🍃',
    category: 'responses',
    categoryLabel: 'Useful responses',
    keywords: ['never', 'mind', 'forget', 'drop', 'ignore', 'cancel'],
    aslDescription: 'Dominant flat open B-hand held near face sweeps or drops outward to the side like wiping away or brushing off a thought (DROP-IT / FORGET-IT).',
    signsBreakdown: [
      {
        sign: 'NEVER-MIND',
        handshape: 'Open flat hand near side of head/chest',
        movement: 'Wave/brush hand dismissively outward and down to the side',
        tips: 'Relaxed facial expression signaling no worries.'
      }
    ]
  }
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
      item.keywords.some((kw) => clean.includes(kw)) ||
      item.sentence.toLowerCase().includes(clean) ||
      clean.includes(item.gloss.toLowerCase())
    );
    if (matched) return matched;
  }

  // If no specific hint matches, cycle through conversational sentences
  const selected = COMMON_CONVERSATIONAL_SENTENCES[fallbackRotationIndex % COMMON_CONVERSATIONAL_SENTENCES.length];
  fallbackRotationIndex = (fallbackRotationIndex + 1) % COMMON_CONVERSATIONAL_SENTENCES.length;
  return selected;
}

/**
 * Filter sentences by category
 */
export function getSentencesByCategory(category: string): CommonSentenceItem[] {
  if (!category || category === 'all') {
    return COMMON_CONVERSATIONAL_SENTENCES;
  }
  return COMMON_CONVERSATIONAL_SENTENCES.filter((item) => item.category === category);
}

