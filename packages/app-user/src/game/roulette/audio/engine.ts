// WebAudio synthesizer — no audio assets. All sounds generated procedurally.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let volume = 0.8;

function ensureCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.2, when = 0) {
  const c = ensureCtx();
  if (!c || !master) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + when);
  g.gain.setValueAtTime(0.0001, c.currentTime + when);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + duration);
  osc.connect(g);
  g.connect(master);
  osc.start(c.currentTime + when);
  osc.stop(c.currentTime + when + duration + 0.02);
}

function noise(duration: number, filterFreq: number, gain = 0.15, when = 0) {
  const c = ensureCtx();
  if (!c || !master) return;
  const buffer = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime + when);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + duration);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(c.currentTime + when);
}

export const audioEngine = {
  setMuted(m: boolean) {
    muted = m;
    if (master) master.gain.value = m ? 0 : volume;
  },
  setVolume(v: number) {
    volume = v;
    if (master) master.gain.value = muted ? 0 : v;
  },
  /** Short tick as the pointer passes each pocket. */
  tick() {
    tone(1800, 0.02, 'square', 0.05);
  },
  chip() {
    tone(880, 0.06, 'triangle', 0.18);
    tone(1320, 0.05, 'sine', 0.1, 0.03);
  },
  spin() {
    noise(2.2, 600, 0.08);
    noise(2.2, 1200, 0.05, 0.1);
  },
  /** Ball deceleration — rising tick rate as it slows. */
  ballSlow() {
    tone(400, 0.4, 'sine', 0.06);
  },
  countdown() {
    tone(440, 0.08, 'square', 0.08);
  },
  countdownUrgent() {
    tone(880, 0.1, 'square', 0.12);
  },
  win() {
    tone(523, 0.12, 'triangle', 0.2);
    tone(659, 0.12, 'triangle', 0.2, 0.1);
    tone(784, 0.2, 'triangle', 0.2, 0.2);
  },
  lose() {
    tone(220, 0.25, 'sine', 0.15);
    tone(180, 0.3, 'sine', 0.12, 0.12);
  },
};
