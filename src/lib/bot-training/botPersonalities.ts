/**
 * Bot Personalities & Dialogue Soundboard Configuration
 * Provides 3 distinct AI Bot personas for student engagement:
 * 1. Friendly Kid Coach (Kind, positive, educational reinforcement)
 * 2. Sarcastic Grandmaster (Savage wit, tactical roast banter)
 * 3. Zen Monk (Peaceful, philosophical chess mindfulness)
 */

export type BotPersonalityId = 'friendly' | 'sarcastic' | 'zen';

export interface BotPersonality {
  id: BotPersonalityId;
  name: string;
  tagline: string;
  avatar: string;
  badge: string;
  pitch: number;
  rate: number;
  soundboard: {
    greeting: string[];
    botCapture: string[];
    studentCapture: string[];
    check: string[];
    blunder: string[];
    studentWin: string[];
    botWin: string[];
  };
}

export const BOT_PERSONALITIES: Record<BotPersonalityId, BotPersonality> = {
  friendly: {
    id: 'friendly',
    name: 'Friendly Coach',
    tagline: 'Kind & Encouraging Mentor',
    avatar: '🧸',
    badge: 'Kind Coach',
    pitch: 1.15,
    rate: 1.02,
    soundboard: {
      greeting: [
        'Welcome! Take your time, think carefully, and let’s play an amazing game! 🌟',
        'Ready for a chess workout? You’ve got this! Let’s have fun! 🤝',
        'Hello champion! Remember to develop your pieces and castle safely! 🏰',
      ],
      botCapture: [
        'Got your piece! Keep your head up, look for a nice counter-strike! 😊',
        'Captured! Every lost piece is a chance to calculate a clever comeback! 🚀',
        'Nom nom! That piece looked delicious! Let’s see your next plan! 😋',
        'I took your piece! Look across the board, which of my pieces is unguarded? 🔍',
      ],
      studentCapture: [
        'Whoa! Great eye, you spotted that tactical strike! Fantastic! 👏',
        'Ouch! That was my favorite defender! Superb calculation! ⭐',
        'Nice capture! You are putting serious pressure on my position! ⚡',
        'Brilliant eye! You’re thinking like a master today! ♟️',
      ],
      check: [
        'Check! Remember your CPR safety rule: Capture the attacker, Protect, or Run! 🛡️',
        'Check! Take a deep breath, verify all three escape options! 🧘‍♂️',
      ],
      blunder: [
        'Don’t worry at all! Even World Champions drop pieces. Let’s keep fighting! 💪',
        'Mistakes are just stepping stones to Grandmaster wisdom! Onward! 🌱',
      ],
      studentWin: [
        'Outstanding checkmate! You outcalculated me completely! Fantastic victory! 🏆',
        'Magnificent game! Your opening knowledge and tactical sharp play won the day! 🥇',
      ],
      botWin: [
        'Good game! You defended bravely. Let’s check the review and level up for next time! 🤝',
        'Well played! Review the moves in analysis to spot where the turning point was! 📈',
      ],
    },
  },

  sarcastic: {
    id: 'sarcastic',
    name: 'Sarcastic GM',
    tagline: 'Savage & Witty Banter',
    avatar: '😈',
    badge: 'Savage GM',
    pitch: 0.95,
    rate: 1.12,
    soundboard: {
      greeting: [
        'Prepare yourself, human! My evaluation engine rarely forgives mistakes! ⚔️',
        'Are you sure you’re ready for this? My Elo wasn’t given away for free! 😈',
        'Let’s see if your opening theory extends past move four! Game on! ♟️',
      ],
      botCapture: [
        'Did you leave that piece as a donation? Don’t mind if I do! 🎁',
        'Free real estate! Thanks for the piece, I will take good care of it! 😈',
        'My evaluation bar just leaped up. Better start praying for a stalemate! 📈',
        'Oops, was that your knight? It looks so much better off the board! 🪓',
      ],
      studentCapture: [
        'Pfft! Purely a poisoned piece... or you got lucky! Let’s see your follow-up! 🤨',
        'You took that? Fine, you walked right into my 15-ply deep master trap! 🪤',
        'Enjoy that capture while you can, your King looks awfully drafty! 💨',
        'A decent move... for a human! Don’t let it get to your head! 😏',
      ],
      check: [
        'Check! Your King looks like he forgot his umbrella in a thunderstorm! ⚡',
        'Check! Is your King sweating yet? The walls are closing in! 🏰🔥',
      ],
      blunder: [
        'Oof! Did a pigeon just knock your piece onto that square? 🕊️',
        'Bold strategy... giving me pieces for free. Let’s see how that works out! 🍿',
      ],
      studentWin: [
        'What?! Unbelievable! My silicon circuits must have had a micro-glitch! 🤯',
        'Okay, okay, take your victory lap... but I demand an immediate rematch! 🧂',
      ],
      botWin: [
        'Checkmate! Back to tactics trainer school for you, my friend! ☕',
        'And that, class, is how you deliver a textbook checkmate! GG! 🎩',
      ],
    },
  },

  zen: {
    id: 'zen',
    name: 'Zen Monk',
    tagline: 'Calm & Philosophical',
    avatar: '🧘',
    badge: 'Zen Master',
    pitch: 0.82,
    rate: 0.92,
    soundboard: {
      greeting: [
        'Breathe in stillness. Let the 64 squares reflect clarity and mindfulness. 🌸',
        'No rush, no tension. Every piece seeks its harmonious place. ☯️',
        'Welcome, traveler of the board. Observe the quiet geometry of the game. 🎋',
      ],
      botCapture: [
        'A piece departs the realm. Silence and space deepen. 🍃',
        'The balance shifts like morning mist upon the mountain. 🌊',
        'Harmony on the squares requires subtraction as well as addition. 🕊️',
        'Form dissolves into formlessness. The position breathes. 🧘',
      ],
      studentCapture: [
        'A harmonious strike. The center bends to your quiet patience. ☯️',
        'Insight and calm converge. A deliberate, beautiful move. 🍃',
        'You see through the illusion of defenders. Well placed. ⛩️',
        'Strength without force. The true mark of a chess mind. 🧘‍♂️',
      ],
      check: [
        'A storm gathers around the King. Seek tranquility and a safe sanctuary. 🌧️',
        'The King is addressed. Return to balance through deliberate breath. 🛡️',
      ],
      blunder: [
        'Every stumble on the board is a leaf falling toward understanding. 🍂',
        'Do not grieve lost wood. Retain inner composure and seek the next path. 🕊️',
      ],
      studentWin: [
        'Flawless mindfulness. You have found the truth of the sixty-four squares. ⛩️',
        'The game concludes in quiet perfection. Honor to your mastery, friend. 🌸',
      ],
      botWin: [
        'Peace returns to the board. In every ending lies the seed of new wisdom. 🎋',
        'The game is complete. Rest your thoughts, and learn from stillness. 🕊️',
      ],
    },
  },
};

export const ALL_BOT_PERSONALITIES: BotPersonality[] = [
  BOT_PERSONALITIES.friendly,
  BOT_PERSONALITIES.sarcastic,
  BOT_PERSONALITIES.zen,
];

export function getRandomPersonalityQuote(
  personalityId: BotPersonalityId,
  category: keyof BotPersonality['soundboard']
): string {
  const persona = BOT_PERSONALITIES[personalityId] || BOT_PERSONALITIES.friendly;
  const pool = persona.soundboard[category];
  if (!pool || pool.length === 0) return '';
  return pool[Math.floor(Math.random() * pool.length)];
}
