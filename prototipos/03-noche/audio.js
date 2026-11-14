// Sonido generado en código (sin archivos). Arranca con la primera interacción del jugador.
let ac = null, master = null, growlGain = null, windGain = null, nextBeat = 0, nextBreath = 0;

function noiseBuffer(sec = 2) {
  const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function loopNoise(filterType, freq, q) {
  const src = ac.createBufferSource(); src.buffer = noiseBuffer(); src.loop = true;
  const f = ac.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
  const g = ac.createGain(); g.gain.value = 0;
  src.connect(f).connect(g).connect(master); src.start();
  return { g, f };
}

export function initAudio() {
  if (ac) { ac.resume(); return; }
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  master = ac.createGain(); master.gain.value = 0.8; master.connect(ac.destination);
  // viento de fondo
  const w = loopNoise('bandpass', 380, 0.6); windGain = w.g; windGain.gain.value = 0.035;
  // gruñido: ruido grave con temblor
  const gr = loopNoise('lowpass', 260, 4); growlGain = gr.g;
  const lfo = ac.createOscillator(), lfoG = ac.createGain();
  lfo.frequency.value = 26; lfoG.gain.value = 0.5; lfo.connect(lfoG).connect(gr.g.gain); lfo.start();
}

const ready = () => ac && ac.state === 'running';

function tone(freq, endFreq, dur, vol, type = 'sine') {
  if (!ready()) return;
  const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function burst(freq, dur, vol, type = 'bandpass') {
  if (!ready()) return;
  const t = ac.currentTime, src = ac.createBufferSource(); src.buffer = noiseBuffer(0.5);
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = 1.2;
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master); src.start(t); src.stop(t + dur + 0.02);
}

export const sfx = {
  whoosh: () => burst(900, 0.18, 0.25, 'highpass'),
  thud: () => { tone(110, 45, 0.22, 0.6); burst(300, 0.1, 0.3); },
  bite: () => { burst(2200, 0.07, 0.5); tone(160, 60, 0.15, 0.4, 'square'); },
  yelp: () => { tone(1100, 420, 0.32, 0.25, 'triangle'); },
  impale: () => { tone(90, 40, 0.35, 0.7); burst(1500, 0.12, 0.35); tone(1300, 500, 0.4, 0.2, 'triangle'); },
  step: () => burst(500, 0.05, 0.05, 'lowpass'),
  death: () => { tone(220, 50, 1.6, 0.4); },
  crackle: (v = 0.12) => burst(2500 + Math.random() * 2000, 0.04, v, 'highpass'),
  snap: () => { burst(1800, 0.06, 0.18, 'bandpass'); },
  logs: () => { burst(400, 0.25, 0.25, 'lowpass'); setTimeout(() => burst(3000, 0.05, 0.15, 'highpass'), 120); },
  eat: () => { burst(700, 0.08, 0.12, 'bandpass'); setTimeout(() => burst(800, 0.08, 0.1, 'bandpass'), 150); },
  howl: (vol = 0.12) => {
    if (!ready()) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), v = ac.createOscillator(), vg = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(380, t); o.frequency.linearRampToValueAtTime(620, t + 0.8); o.frequency.linearRampToValueAtTime(560, t + 2.2); o.frequency.linearRampToValueAtTime(420, t + 3);
    v.frequency.value = 5; vg.gain.value = 9; v.connect(vg).connect(o.frequency); v.start(t); v.stop(t + 3.1);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.5); g.gain.setValueAtTime(vol, t + 2.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
    o.connect(g).connect(master); o.start(t); o.stop(t + 3.1);
  },
};

// Llamar cada cuadro: gruñido (0..1) y latido (0..1, sube con el miedo y las heridas)
export function ambience(growl, fear, dt, fatigue = 0) {
  if (!ready()) return;
  // respiración agitada: cada vez más fuerte y rápida con el cansancio
  if (fatigue > 0.25 && ac.currentTime >= nextBreath) {
    const v = (fatigue - 0.25) * 0.5;
    burst(1300, 0.22, v, 'bandpass');
    setTimeout(() => burst(900, 0.28, v * 0.8, 'bandpass'), 320 - fatigue * 120);
    nextBreath = ac.currentTime + 1.4 - fatigue * 0.8;
  }
  growlGain.gain.setTargetAtTime(growl * 0.32, ac.currentTime, 0.12);
  windGain.gain.setTargetAtTime(0.035 * (1 - fear * 0.7), ac.currentTime, 0.5);
  if (fear < 0.05) return;
  const t = ac.currentTime;
  if (t >= nextBeat) {
    const bpm = 70 + fear * 80;
    const v = 0.25 + fear * 0.45;
    // lub-dub
    const beat = (at, vol) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(60, at); o.frequency.exponentialRampToValueAtTime(35, at + 0.12); g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.14); o.connect(g).connect(master); o.start(at); o.stop(at + 0.16); };
    beat(t + 0.01, v); beat(t + 0.2, v * 0.7);
    nextBeat = t + 60 / bpm;
  }
}
