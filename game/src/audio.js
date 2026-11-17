// Synthesised sound: every effect is an oscillator + gain envelope, no audio files.
// The context is created on the first user gesture; in a headless shot it stays off.
export function makeAudio() {
  return { ctx: null, muted: false, master: null, lastShoot: 0 };
}

export function unlockAudio(audio) {
  if (audio.ctx) {
    if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
    return;
  }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio.ctx = new Ctx();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.22;
    audio.master.connect(audio.ctx.destination);
  } catch (err) {
    audio.ctx = null;
  }
}

function blip(audio, freq0, freq1, dur, type, vol, when = 0) {
  if (!audio.ctx || audio.muted || !audio.master) return;
  try {
    const t = audio.ctx.currentTime + when;
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq0, t);
    if (freq1 !== freq0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq1), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch (err) {
    // Sound is garnish: never let it break the game.
  }
}

function noise(audio, dur, vol, cutoff) {
  if (!audio.ctx || audio.muted || !audio.master) return;
  try {
    const t = audio.ctx.currentTime;
    const len = Math.max(1, Math.floor(audio.ctx.sampleRate * dur));
    const buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audio.ctx.createBufferSource();
    src.buffer = buf;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = audio.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    src.start(t);
  } catch (err) {
    // Sound is garnish: never let it break the game.
  }
}

export const sfx = {
  shoot(audio) {
    if (!audio.ctx) return;
    const now = performance.now();
    if (now - audio.lastShoot < 40) return;
    audio.lastShoot = now;
    blip(audio, 880, 320, 0.07, 'square', 0.10);
  },
  hit(audio) {
    blip(audio, 300, 140, 0.06, 'triangle', 0.12);
  },
  explode(audio) {
    noise(audio, 0.28, 0.5, 900);
    blip(audio, 160, 40, 0.3, 'sine', 0.35);
  },
  hurt(audio) {
    blip(audio, 220, 70, 0.25, 'sawtooth', 0.3);
    noise(audio, 0.15, 0.25, 500);
  },
  shard(audio) {
    blip(audio, 1320, 1760, 0.08, 'sine', 0.10);
  },
  upgrade(audio) {
    blip(audio, 523, 523, 0.1, 'sine', 0.18);
    blip(audio, 659, 659, 0.1, 'sine', 0.18, 0.09);
    blip(audio, 784, 784, 0.16, 'sine', 0.2, 0.18);
  },
  wave(audio) {
    blip(audio, 392, 392, 0.12, 'square', 0.12);
    blip(audio, 523, 523, 0.16, 'square', 0.12, 0.11);
  },
  nova(audio) {
    noise(audio, 0.5, 0.4, 2400);
    blip(audio, 180, 900, 0.45, 'sawtooth', 0.16);
  },
  over(audio) {
    blip(audio, 392, 392, 0.2, 'triangle', 0.2);
    blip(audio, 311, 311, 0.2, 'triangle', 0.2, 0.18);
    blip(audio, 233, 110, 0.5, 'triangle', 0.22, 0.36);
  },
  win(audio) {
    blip(audio, 523, 523, 0.14, 'sine', 0.2);
    blip(audio, 659, 659, 0.14, 'sine', 0.2, 0.12);
    blip(audio, 784, 784, 0.14, 'sine', 0.2, 0.24);
    blip(audio, 1046, 1046, 0.3, 'sine', 0.22, 0.36);
  },
};
