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

export function playChessSound(type: 'move' | 'capture' | 'check' | 'castle' | 'victory' | 'hand' | 'quiz_correct' | 'quiz_wrong' | 'critical_hit') {
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

export function speakCoachAdvice(text: string, options?: { pitch?: number; rate?: number; force?: boolean }) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!coachVoiceEnabled && !options?.force) return;

  try {
    // Strip emojis and symbols for crystal clear speech synthesis
    const cleanText = text
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[♚♛♜♝♞♟♔♕♖♗♘♙⚔️⚡🎯🏆💡🔥]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options?.rate ?? 1.02;
    utterance.pitch = options?.pitch ?? 1.05;
    utterance.volume = 0.9;

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) => (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Daniel')))
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('[speakCoachAdvice] Speech synthesis failed:', err);
  }
}
