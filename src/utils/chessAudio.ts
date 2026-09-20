// Web Audio API Synthesizer for ChessHub Classroom SFX

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function setChessSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function isChessSoundEnabled(): boolean {
  return soundEnabled;
}

export function playChessSound(type: 'move' | 'capture' | 'check' | 'castle' | 'victory' | 'hand' | 'quiz_correct' | 'quiz_wrong' | 'critical_hit' | 'fanfare') {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  if (type === 'move') {
    // Soft wooden piece move sound (sine click + low thud)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.06);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  } else if (type === 'capture') {
    // Sharp wooden capture impact (two rapid clicks)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(600, now);
    osc1.frequency.exponentialRampToValueAtTime(150, now + 0.08);
    gain1.gain.setValueAtTime(0.5, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.08);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(220, now + 0.02);
    osc2.frequency.exponentialRampToValueAtTime(80, now + 0.1);
    gain2.gain.setValueAtTime(0.3, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.02);
    osc2.stop(now + 0.1);
  } else if (type === 'check') {
    // Alert high double beep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1174.66, now + 0.08);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === 'critical_hit') {
    // Dramatic Boss Battle Strike (impact + metallic shimmer)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);

    const chime = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(1318.5, now + 0.05); // E6
    chimeGain.gain.setValueAtTime(0.25, now + 0.05);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    chime.connect(chimeGain);
    chimeGain.connect(ctx.destination);
    chime.start(now + 0.05);
    chime.stop(now + 0.3);
  } else if (type === 'castle') {
    // Double thud
    playChessSound('move');
    setTimeout(() => playChessSound('move'), 90);
  } else if (type === 'victory' || type === 'quiz_correct') {
    // Celebratory arpeggio chime C5 - E5 - G5 - C6
    const freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.09;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  } else if (type === 'fanfare') {
    // Majestic Brass Fanfare: Ascending heroic brass chords with rich harmonics
    const notes = [
      { time: 0.00, chord: [523.25, 659.25, 783.99], dur: 0.18 }, // C major
      { time: 0.18, chord: [587.33, 739.99, 880.00], dur: 0.18 }, // D major
      { time: 0.38, chord: [659.25, 830.61, 987.77], dur: 0.22 }, // E major
      { time: 0.62, chord: [523.25, 659.25, 783.99, 1046.50], dur: 0.70 }, // High C major Grand Finale
    ];

    notes.forEach(({ time, chord, dur }) => {
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle'; // Warm brass tone
        osc.frequency.setValueAtTime(freq, now + time);
        gain.gain.setValueAtTime(0.22, now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    });
  } else if (type === 'hand') {
    // Soft bell notification
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } else if (type === 'quiz_wrong') {
    // Low double buzz
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.setValueAtTime(140, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }
}

let coachVoiceEnabled = true;
let lastSpokenTimestamp = 0;
const DEFAULT_MIN_SPEECH_INTERVAL_MS = 16000; // 16 seconds minimum cooldown between voice lines
const spokenPhrasesHistory = new Set<string>();

// Cached natural voice
let cachedNaturalVoice: SpeechSynthesisVoice | null = null;

function updateCachedVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const voices = window.speechSynthesis.getVoices();
    cachedNaturalVoice =
      voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Karen') ||
            v.name.includes('Daniel') ||
            v.name.includes('Jenny') ||
            v.name.includes('Guy'))
      ) ||
      voices.find((v) => v.lang.startsWith('en-US')) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      null;
  } catch {}
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  updateCachedVoice();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = updateCachedVoice;
  }
}

export function setCoachVoiceEnabled(enabled: boolean) {
  coachVoiceEnabled = enabled;
  if (!enabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function isCoachVoiceEnabled(): boolean {
  return coachVoiceEnabled;
}

export function stopCoachVoice() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function resetVoiceCooldown() {
  lastSpokenTimestamp = 0;
}

export function clearSpokenHistory() {
  spokenPhrasesHistory.clear();
  lastSpokenTimestamp = 0;
}

export type TacticalTheme =
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'hanging'
  | 'king_safety'
  | 'opening'
  | 'center'
  | 'endgame';

export const TACTICAL_COACH_ADVICE: Record<TacticalTheme, string[]> = {
  fork: [
    'Watch out! The knight or piece is attacking two targets at once.',
    'A fork can win material! Look for ways to strike multiple undefended pieces.',
    'Double attack in the air! Check if any of your pieces are caught in a fork.',
  ],
  pin: [
    'That piece is pinned! Moving it would expose a more valuable piece behind it.',
    "Pins restrict your opponent's pieces. Look to apply pressure to pinned targets.",
    'Be careful of the absolute pin on your king — you cannot move that piece.',
  ],
  skewer: [
    'A skewer attack forces the more valuable piece to move, leaving what is behind exposed.',
    'Line up your long-range pieces along open files and diagonals for skewers.',
  ],
  hanging: [
    'Look for unprotected pieces! A hanging piece is a tactical opportunity.',
    'Ensure all your pieces are guarded by friendly pawns or pieces.',
    'Calculate carefully before capturing: make sure you win material, not just trade.',
  ],
  king_safety: [
    'King safety comes first! Consider castling to tuck your king safely into the corner.',
    'Avoid pushing too many pawns in front of your castled king.',
    'Watch out for open diagonals aiming right at your king.',
  ],
  opening: [
    'In the opening: control the center, develop your minor pieces, and castle quickly.',
    'Try not to move the same piece multiple times in the opening unless necessary.',
    'Connect your rooks by developing your queen to a safe, active square.',
  ],
  center: [
    'Fight for the center squares: e4, d4, e5, and d5 give your pieces maximum mobility.',
    'Pawn tension in the center dictates the pace of the game.',
  ],
  endgame: [
    'In the endgame, activate your king! The king becomes an active fighting piece.',
    'Passed pawns must be pushed! Support your passed pawns with your king and rooks.',
    'Rooks belong behind passed pawns to support their advance.',
  ],
};

export function getRandomTacticalAdvice(theme: TacticalTheme): string {
  const pool = TACTICAL_COACH_ADVICE[theme] || TACTICAL_COACH_ADVICE.opening;
  const available = pool.filter((p) => !spokenPhrasesHistory.has(p.toLowerCase()));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export function speakCoachAdvice(
  text: string,
  options?: {
    pitch?: number;
    rate?: number;
    force?: boolean;
    minIntervalMs?: number;
    fallbackSfx?: 'move' | 'capture' | 'check' | 'fanfare';
  }
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  if (!coachVoiceEnabled && !options?.force) return false;

  const now = Date.now();
  const minInterval = options?.minIntervalMs ?? DEFAULT_MIN_SPEECH_INTERVAL_MS;

  // Enforce intelligent cooldown unless force is true
  if (!options?.force && now - lastSpokenTimestamp < minInterval) {
    if (options?.fallbackSfx) {
      try {
        playChessSound(options.fallbackSfx);
      } catch {}
    }
    return false;
  }

  try {
    // Strip emojis and symbols for crystal clear speech synthesis
    const cleanText = text
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[♚♛♜♝♞♟♔♕♖♗♘♙⚔️⚡🎯🏆💡🔥🐾🧩]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return false;

    // Deduplication check: Do not repeat identical phrase unless force is true
    const normalized = cleanText.toLowerCase();
    if (!options?.force && spokenPhrasesHistory.has(normalized)) {
      return false;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options?.rate ?? 1.02;
    utterance.pitch = options?.pitch ?? 1.05;
    utterance.volume = 0.9;

    if (!cachedNaturalVoice) {
      updateCachedVoice();
    }
    if (cachedNaturalVoice) {
      utterance.voice = cachedNaturalVoice;
    }

    window.speechSynthesis.speak(utterance);
    lastSpokenTimestamp = Date.now();
    spokenPhrasesHistory.add(normalized);

    // Keep history bounded to last 60 phrases
    if (spokenPhrasesHistory.size > 60) {
      const arr = Array.from(spokenPhrasesHistory);
      spokenPhrasesHistory.clear();
      arr.slice(-30).forEach((item) => spokenPhrasesHistory.add(item));
    }

    return true;
  } catch (err) {
    console.warn('[speakCoachAdvice] Speech synthesis failed:', err);
    if (options?.fallbackSfx) {
      try {
        playChessSound(options.fallbackSfx);
      } catch {}
    }
    return false;
  }
}

