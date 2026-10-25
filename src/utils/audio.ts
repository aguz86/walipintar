/**
 * 100% Offline Procedural Web Audio Synthesizer & Indonesian Speech
 * No external audio files needed; runs natively on all browsers & devices.
 */

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    // Ignore
  }
}

if (typeof window !== 'undefined') {
  ['touchstart', 'touchend', 'pointerdown', 'click', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, unlockAudio, { passive: true, once: false });
  });
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.25,
  startTimeOffset = 0,
  targetFreq?: number
) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = ctx.currentTime + startTimeOffset;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (targetFreq) {
      osc.frequency.exponentialRampToValueAtTime(targetFreq, startTime + duration);
    }

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  } catch {
    // Audio context not ready
  }
}

export const SFX = {
  bloop: () => tone(320, 0.15, 'sine', 0.35, 0, 750),
  pop: () => tone(450, 0.09, 'triangle', 0.4, 0, 900),
  ding: () => {
    tone(880, 0.35, 'sine', 0.25, 0);
    tone(1320, 0.35, 'sine', 0.15, 0.05);
  },
  correct: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'sine', 0.2, i * 0.08));
  },
  fanfare: () => {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
      tone(f, i > 5 ? 0.6 : 0.22, 'triangle', 0.25, i * 0.12)
    );
  },
  win: () => {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) =>
      tone(f, 0.35, 'sine', 0.22, i * 0.1)
    );
  },
  hit: () => {
    tone(420, 0.2, 'sawtooth', 0.22, 0, 70);
    tone(130, 0.18, 'square', 0.18, 0, 50);
  },
  heal: () => {
    [523, 659, 784].forEach((f, i) => tone(f, 0.28, 'sine', 0.2, i * 0.1));
  },
  no: () => tone(220, 0.26, 'triangle', 0.22, 0, 140),
  levelUp: () => {
    [440, 554, 659, 880, 1108].forEach((f, i) => tone(f, 0.22, 'triangle', 0.2, i * 0.07));
  },
};

// Procedural Animal Sounds parameters
interface SoundParam {
  d: number;
  f: [number, number][];
  F?: [[number, number][], number, number][];
  a: number;
  r?: number;
  k?: number;
  v?: [number, number];
  x?: number;
  nz?: number;
  hs?: number;
  am?: [number, number];
  rp?: [number, number][];
  sc?: number;
}

const ANIMAL_SOUNDS_PARAMS: Record<string, SoundParam> = {
  '🐱': {
    d: 0.8,
    f: [[0, 520], [0.18, 780], [0.45, 700], [0.8, 470]],
    F: [[[[0, 350], [0.2, 700], [0.8, 380]], 180, 1], [[[0, 2300], [0.25, 2000], [0.8, 1000]], 350, 0.7]],
    a: 0.05,
    r: 0.25,
    k: 0.8,
    v: [6, 0.02],
  },
  '🐶': {
    d: 0.24,
    f: [[0, 330], [0.08, 230], [0.24, 150]],
    F: [[[[0, 750]], 250, 1], [[[0, 1300]], 350, 0.6]],
    a: 0.008,
    x: 8,
    k: 0.5,
    nz: 0.12,
    rp: [[0, 1], [0.38, 1.12]],
  },
  '🐮': {
    d: 1.2,
    f: [[0, 105], [0.25, 130], [0.7, 138], [1.2, 92]],
    F: [[[[0, 250], [0.3, 430], [1.2, 300]], 120, 1], [[[0, 700], [0.35, 850], [1.2, 700]], 160, 0.5]],
    a: 0.14,
    r: 0.35,
    k: 0.9,
    v: [5, 0.03],
  },
  '🦆': {
    d: 0.18,
    f: [[0, 540], [0.05, 480], [0.18, 330]],
    F: [[[[0, 900]], 300, 1], [[[0, 1800]], 400, 0.8], [[[0, 3000]], 500, 0.3]],
    a: 0.01,
    x: 7,
    k: 0.3,
    am: [75, 0.35],
    rp: [[0, 1], [0.25, 1], [0.5, 0.95]],
  },
  '🐐': {
    d: 0.9,
    f: [[0, 380], [0.2, 430], [0.9, 330]],
    F: [[[[0, 700]], 200, 1], [[[0, 1400]], 300, 0.7]],
    a: 0.05,
    r: 0.2,
    k: 0.6,
    v: [28, 0.07],
  },
  '🐔': {
    d: 0.12,
    f: [[0, 400], [0.12, 300]],
    F: [[[[0, 1000]], 300, 1], [[[0, 2000]], 400, 0.5]],
    a: 0.005,
    x: 14,
    k: 0.3,
    nz: 0.05,
    rp: [[0, 1], [0.2, 1.05], [0.4, 0.95], [0.65, 1.1]],
  },
  '🐓': {
    d: 0.8,
    f: [[0, 380], [0.3, 620], [0.6, 750], [0.8, 550]],
    F: [[[[0, 1200]], 300, 1], [[[0, 2400]], 400, 0.8]],
    a: 0.02,
    r: 0.2,
    k: 0.4,
    rp: [[0, 1], [0.3, 1.2], [0.6, 1.35]],
  },
  '🐸': {
    d: 0.25,
    f: [[0, 180], [0.25, 150]],
    F: [[[[0, 500]], 150, 1], [[[0, 1500]], 300, 0.5]],
    a: 0.01,
    x: 6,
    k: 0.4,
    am: [40, 0.6],
    rp: [[0, 1], [0.32, 1], [0.64, 0.95]],
  },
  '🐘': {
    d: 1.0,
    f: [[0, 350], [0.25, 600], [0.7, 550], [1.0, 300]],
    F: [[[[0, 900], [1.0, 1200]], 300, 1], [[[0, 1800]], 400, 0.8]],
    a: 0.08,
    r: 0.3,
    k: 0.4,
    nz: 0.03,
    v: [12, 0.03],
  },
  '🦁': {
    d: 1.2,
    f: [[0, 90], [0.3, 140], [0.9, 100], [1.2, 70]],
    F: [[[[0, 500], [0.5, 700], [1.2, 400]], 250, 1], [[[0, 1200]], 400, 0.5]],
    a: 0.1,
    r: 0.4,
    k: 0.4,
    nz: 0.25,
    am: [30, 0.4],
  },
  '🐵': {
    d: 0.5,
    f: [[0, 500], [0.15, 800], [0.3, 450], [0.5, 700]],
    F: [[[[0, 500], [0.25, 900], [0.5, 600]], 200, 1], [[[0, 1500]], 300, 0.5]],
    a: 0.03,
    r: 0.15,
    k: 0.6,
    v: [8, 0.03],
    rp: [[0, 1], [0.6, 1.15]],
  },
  '🐴': {
    d: 1.0,
    f: [[0, 700], [0.15, 950], [0.4, 800], [0.7, 600], [1.0, 400]],
    F: [[[[0, 800], [1.0, 1100]], 300, 1], [[[0, 2200]], 500, 0.6]],
    a: 0.04,
    r: 0.3,
    k: 0.5,
    nz: 0.03,
    v: [20, 0.06],
  },
  '🐍': {
    d: 0.9,
    hs: 1,
    f: [[0, 100]],
    a: 0.1,
    r: 0.4,
  },
  '🦜': {
    d: 0.35,
    f: [[0, 900], [0.1, 1400], [0.35, 800]],
    F: [[[[0, 1200]], 400, 1], [[[0, 2500]], 600, 0.7]],
    a: 0.01,
    r: 0.1,
    k: 0.3,
    am: [60, 0.3],
    rp: [[0, 1], [0.45, 1.1]],
  },
  '🐦': {
    d: 0.3,
    f: [[0, 1200], [0.15, 1800], [0.3, 1100]],
    F: [[[[0, 1500]], 300, 1], [[[0, 3000]], 500, 0.6]],
    a: 0.01,
    r: 0.1,
    rp: [[0, 1], [0.35, 1.15]],
  },
  '🐝': {
    d: 0.8,
    f: [[0, 240], [0.4, 260], [0.8, 230]],
    F: [[[[0, 480]], 200, 1], [[[0, 960]], 300, 0.8]],
    a: 0.05,
    r: 0.2,
    v: [35, 0.04],
  },
};

// Aliases
ANIMAL_SOUNDS_PARAMS['🐃'] = { ...ANIMAL_SOUNDS_PARAMS['🐮'], sc: 0.85 };
ANIMAL_SOUNDS_PARAMS['🐅'] = { ...ANIMAL_SOUNDS_PARAMS['🦁'], sc: 0.8 };
ANIMAL_SOUNDS_PARAMS['🦧'] = { ...ANIMAL_SOUNDS_PARAMS['🐵'], sc: 0.7 };
ANIMAL_SOUNDS_PARAMS['🐊'] = { ...ANIMAL_SOUNDS_PARAMS['🦁'], sc: 0.6, am: [20, 0.5] };
ANIMAL_SOUNDS_PARAMS['🐑'] = { ...ANIMAL_SOUNDS_PARAMS['🐐'], sc: 1.15 };
ANIMAL_SOUNDS_PARAMS['🐏'] = ANIMAL_SOUNDS_PARAMS['🐐'];
ANIMAL_SOUNDS_PARAMS['🐤'] = { ...ANIMAL_SOUNDS_PARAMS['🐔'], sc: 1.6 };
ANIMAL_SOUNDS_PARAMS['🐥'] = { ...ANIMAL_SOUNDS_PARAMS['🐔'], sc: 1.6 };
ANIMAL_SOUNDS_PARAMS['🐣'] = { ...ANIMAL_SOUNDS_PARAMS['🐔'], sc: 1.6 };

function interpolateSeg(pts: [number, number][], t: number): number {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i][0]) {
      return pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * (t - pts[i - 1][0])) / (pts[i][0] - pts[i - 1][0]);
    }
  }
  return pts[pts.length - 1][1];
}

function synthesizeWave(p: SoundParam, sc = 1): Float32Array {
  const sr = 22050;
  const n = Math.floor(sr * p.d);
  const out = new Float32Array(n);
  let ph = 0;
  let pw = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const f = interpolateSeg(p.f, t) * sc * (p.v ? 1 + p.v[1] * Math.sin(6.2832 * p.v[0] * t) : 1);
    ph += (6.2832 * f) / sr;
    let s = 0;

    if (p.hs) {
      const w = Math.random() * 2 - 1;
      s = w - 0.9 * pw;
      pw = w;
    } else if (p.F) {
      const fm = p.F.map((q) => [interpolateSeg(q[0], t), q[1], q[2]] as [number, number, number]);
      for (let k = 1; k * f < 4800 && k < 50; k++) {
        let a = 0.04;
        for (const q of fm) {
          a += q[2] * Math.exp(-Math.pow((k * f - q[0]) / q[1], 2));
        }
        s += (a / Math.pow(k, p.k || 0.6)) * Math.sin(k * ph);
      }
      if (p.nz) s += p.nz * (Math.random() * 2 - 1);
    }

    if (p.am) {
      s *= 1 - p.am[1] + p.am[1] * Math.sin(6.2832 * p.am[0] * t);
    }

    const env = Math.min(1, t / p.a) * (p.x ? Math.exp(-t * p.x) : Math.max(0, Math.min(1, (p.d - t) / (p.r || 0.2))));
    out[i] = s * env;
  }
  return out;
}

const bufferCache: Record<string, AudioBuffer> = {};

export function hasAnimalSound(emoji: string): boolean {
  return !!ANIMAL_SOUNDS_PARAMS[emoji];
}

export function playAnimalSound(emoji: string, callback?: () => void): void {
  const ctx = getAudioContext();
  if (!ctx || !ANIMAL_SOUNDS_PARAMS[emoji]) {
    callback?.();
    return;
  }

  try {
    let buf = bufferCache[emoji];
    if (!buf) {
      const p = ANIMAL_SOUNDS_PARAMS[emoji];
      const sr = 22050;
      const repeats = p.rp || [[0, 1]];
      const parts = repeats.map((r) => [Math.floor(r[0] * sr), synthesizeWave(p, (p.sc || 1) * r[1])] as [number, Float32Array]);
      const maxLen = Math.max(...parts.map(([off, data]) => off + data.length));
      const combined = new Float32Array(maxLen);

      parts.forEach(([off, data]) => {
        for (let i = 0; i < data.length; i++) {
          combined[off + i] += data[i];
        }
      });

      let peak = 0;
      for (let i = 0; i < combined.length; i++) {
        if (Math.abs(combined[i]) > peak) peak = Math.abs(combined[i]);
      }
      const scale = peak > 0 ? 0.85 / peak : 1;
      for (let i = 0; i < combined.length; i++) {
        combined[i] *= scale;
      }

      buf = ctx.createBuffer(1, maxLen, sr);
      buf.copyToChannel(combined, 0);
      bufferCache[emoji] = buf;
    }

    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.connect(ctx.destination);

    let ended = false;
    const finish = () => {
      if (!ended) {
        ended = true;
        callback?.();
      }
    };

    source.onended = finish;
    source.start();
    setTimeout(finish, buf.duration * 1000 + 400);
  } catch {
    callback?.();
  }
}

// Indonesian Text-to-Speech with fallback
export function speakText(text: string, lang: 'id' | 'en' = 'id', onEnd?: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    const targetLang = lang === 'id' ? 'id' : 'en';
    const langVoices = voices.filter((v) =>
      v.lang.toLowerCase().replace('_', '-').startsWith(targetLang) ||
      (targetLang === 'id' && /indonesia/i.test(v.name))
    );

    // Prefer friendly female voice if available
    const preferredVoice = langVoices.find((v) =>
      /female|perempuan|wanita|gadis|damayanti|google|indah|siti|sari|samantha|zira/i.test(v.name)
    ) || langVoices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
    } else {
      utterance.lang = lang === 'id' ? 'id-ID' : 'en-US';
    }

    utterance.pitch = 1.3;
    utterance.rate = 0.95;

    let finished = false;
    const done = () => {
      if (!finished) {
        finished = true;
        onEnd?.();
      }
    };

    utterance.onend = done;
    utterance.onerror = done;

    setTimeout(() => {
      try {
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      } catch {
        done();
      }
    }, 60);

    setTimeout(done, 6000);
  } catch {
    onEnd?.();
  }
}
