/**
 * Audio system using Web Audio API.
 * Warm ambient soundtrack with gentle sound effects.
 * No external audio files — entirely synthesized.
 */

let audioCtx = null;
let isEnabled = false;
let ambientNodes = null; // { oscs, gains, master } for the ambient drone

function ensureContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// ─── Reverb (convolver) for spatial depth ─────
let reverbNode = null;
function getReverb() {
  if (reverbNode) return reverbNode;
  const ctx = ensureContext();
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      // Exponential decay with some diffusion
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
  }
  reverbNode = ctx.createConvolver();
  reverbNode.buffer = buf;
  return reverbNode;
}

// ─── Ambient Pad — warm, evolving drone ──────
function startAmbient() {
  if (ambientNodes) return;
  const ctx = ensureContext();
  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.035, now + 3); // Gentle fade in

  // Low-pass filter for warmth
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  filter.Q.value = 1;

  // Three detuned sawtooth oscillators = warm pad
  const freqs = [65.41, 98.00, 130.81]; // C2, G2, C3 — open fifth drone
  const detunes = [-8, 5, -3]; // Slight detuning for richness
  const oscs = [];
  const gains = [];

  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.detune.value = detunes[i];

    const g = ctx.createGain();
    g.gain.value = i === 0 ? 0.5 : 0.3; // Bass note louder

    osc.connect(g);
    g.connect(filter);
    osc.start(now);
    oscs.push(osc);
    gains.push(g);
  });

  // Subtle LFO on filter cutoff for gentle movement
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08; // Very slow wobble
  lfoGain.gain.value = 150;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start(now);
  oscs.push(lfo);

  filter.connect(master);

  // Send some to reverb for spaciousness
  const reverbSend = ctx.createGain();
  reverbSend.gain.value = 0.4;
  filter.connect(reverbSend);
  reverbSend.connect(getReverb());
  getReverb().connect(master);

  master.connect(ctx.destination);

  ambientNodes = { oscs, gains, master, filter, reverbSend };
}

function stopAmbient() {
  if (!ambientNodes) return;
  const ctx = ensureContext();
  const now = ctx.currentTime;

  // Anchor current value then ramp to zero (required by Web Audio spec)
  ambientNodes.master.gain.setValueAtTime(ambientNodes.master.gain.value, now);
  ambientNodes.master.gain.linearRampToValueAtTime(0, now + 1.5);

  const nodes = ambientNodes;
  ambientNodes = null;

  setTimeout(() => {
    nodes.oscs.forEach(o => { try { o.stop(); } catch(e) {} });
    try { nodes.master.disconnect(); } catch(e) {}
  }, 2000);
}

// ─── Arrival Chime — gentle harp-like pluck ───
export function playChime() {
  if (!isEnabled) return;
  const ctx = ensureContext();
  const now = ctx.currentTime;

  // Harp-like pluck: sine + harmonic, fast attack, medium decay
  const notes = [
    { freq: 523.25, time: 0, vol: 0.06 },     // C5
    { freq: 659.25, time: 0.12, vol: 0.05 },   // E5
    { freq: 783.99, time: 0.24, vol: 0.04 },   // G5
  ];

  notes.forEach(({ freq, time, vol }) => {
    // Fundamental
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    // Second harmonic for shimmer
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;

    const gain = ctx.createGain();
    const t = now + time;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(vol * 0.3, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.linearRampToValueAtTime(vol * 0.15, t + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(gain);
    osc2.connect(gain2);
    gain.connect(ctx.destination);
    gain2.connect(ctx.destination);

    // Send to reverb for space
    const revSend = ctx.createGain();
    revSend.gain.value = 0.3;
    gain.connect(revSend);
    revSend.connect(getReverb());
    getReverb().connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 1.5);
    osc2.start(t);
    osc2.stop(t + 1.0);
  });
}

// ─── Whoosh — smooth wind sweep ──────────────
export function playWhoosh() {
  if (!isEnabled) return;
  const ctx = ensureContext();
  const now = ctx.currentTime;

  // Longer, softer filtered noise
  const duration = 1.2;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      // Bell curve envelope — rises then falls
      const env = Math.sin(t * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env;
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // Sweeping bandpass filter — sounds like wind
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(300, now);
  filter.frequency.exponentialRampToValueAtTime(1500, now + duration * 0.4);
  filter.frequency.exponentialRampToValueAtTime(200, now + duration);
  filter.Q.value = 3;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.04, now + 0.1);
  gain.gain.linearRampToValueAtTime(0.03, now + duration * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start(now);
}

// ─── Triumphant Fanfare — warm brass arpeggio ─
export function playFanfare() {
  if (!isEnabled) return;
  const ctx = ensureContext();
  const now = ctx.currentTime;

  // Rising arpeggio: C4 E4 G4 C5 — with warmth
  const notes = [
    { freq: 261.63, time: 0 },
    { freq: 329.63, time: 0.25 },
    { freq: 392.00, time: 0.50 },
    { freq: 523.25, time: 0.75 },
  ];

  notes.forEach(({ freq, time }) => {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc.type = 'triangle';
    osc2.type = 'sine';
    osc.frequency.value = freq;
    osc2.frequency.value = freq * 1.002; // Slight detune for warmth

    const gain = ctx.createGain();
    const t = now + time;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.04);
    gain.gain.setValueAtTime(0.07, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.linearRampToValueAtTime(0.04, t + 0.04);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    osc.connect(gain);
    osc2.connect(gain2);
    gain.connect(ctx.destination);
    gain2.connect(ctx.destination);

    // Reverb for grandeur
    const revSend = ctx.createGain();
    revSend.gain.value = 0.4;
    gain.connect(revSend);
    revSend.connect(getReverb());
    getReverb().connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 2);
    osc2.start(t);
    osc2.stop(t + 2);
  });
}

// ─── Transport Soundscapes ──────────────────
let transportNodes = null;

/**
 * Rhythmic train chugging: filtered noise bursts at ~3Hz.
 * Creates a "chk-chk-chk" locomotive rhythm.
 */
export function playTrainSound(duration = 3500) {
  if (!isEnabled) return;
  stopTransportSound();
  const ctx = ensureContext();
  const now = ctx.currentTime;
  const dur = duration / 1000;

  // White noise source
  const bufLen = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buf;

  // Bandpass for "metallic" texture
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 400;
  bp.Q.value = 2;

  // Rhythmic amplitude modulation at ~3Hz (chug rhythm)
  const lfo = ctx.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = 3;

  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.5;

  const modGain = ctx.createGain();
  modGain.gain.value = 0.5; // Offset so it pulses 0 → 1

  lfo.connect(lfoGain);
  lfoGain.connect(modGain.gain);

  // Master gain with fade in/out
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.04, now + 0.3);
  master.gain.setValueAtTime(0.04, now + dur - 0.5);
  master.gain.linearRampToValueAtTime(0, now + dur);

  source.connect(bp);
  bp.connect(modGain);
  modGain.connect(master);
  master.connect(ctx.destination);

  source.start(now);
  source.stop(now + dur);
  lfo.start(now);
  lfo.stop(now + dur);

  transportNodes = { master, oscs: [lfo], sources: [source] };
  setTimeout(() => { if (transportNodes && transportNodes.master === master) transportNodes = null; }, duration);
}

/**
 * Ship/steamer soundscape: deep foghorn + gentle ocean wash.
 */
export function playSteamerSound(duration = 3500) {
  if (!isEnabled) return;
  stopTransportSound();
  const ctx = ensureContext();
  const now = ctx.currentTime;
  const dur = duration / 1000;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(1, now + 0.3);
  master.gain.setValueAtTime(1, now + dur - 0.5);
  master.gain.linearRampToValueAtTime(0, now + dur);
  master.connect(ctx.destination);

  // --- Foghorn: low sawtooth swell ---
  const horn = ctx.createOscillator();
  horn.type = 'sawtooth';
  horn.frequency.value = 80;

  const hornLP = ctx.createBiquadFilter();
  hornLP.type = 'lowpass';
  hornLP.frequency.value = 200;
  hornLP.Q.value = 2;

  const hornGain = ctx.createGain();
  hornGain.gain.setValueAtTime(0, now);
  hornGain.gain.linearRampToValueAtTime(0.04, now + 0.8);
  hornGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

  horn.connect(hornLP);
  hornLP.connect(hornGain);
  hornGain.connect(master);

  horn.start(now);
  horn.stop(now + 2.5);

  // --- Ocean wash: filtered noise with slow LFO ---
  const oceanLen = Math.floor(ctx.sampleRate * dur);
  const oceanBuf = ctx.createBuffer(2, oceanLen, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = oceanBuf.getChannelData(ch);
    for (let i = 0; i < oceanLen; i++) {
      d[i] = Math.random() * 2 - 1;
    }
  }

  const oceanSrc = ctx.createBufferSource();
  oceanSrc.buffer = oceanBuf;

  const oceanLP = ctx.createBiquadFilter();
  oceanLP.type = 'lowpass';
  oceanLP.frequency.value = 500;
  oceanLP.Q.value = 1;

  // Slow wave-like amplitude modulation
  const waveLfo = ctx.createOscillator();
  waveLfo.type = 'sine';
  waveLfo.frequency.value = 0.3; // Gentle wave rhythm

  const waveLfoGain = ctx.createGain();
  waveLfoGain.gain.value = 0.015;

  const oceanGain = ctx.createGain();
  oceanGain.gain.value = 0.025;

  waveLfo.connect(waveLfoGain);
  waveLfoGain.connect(oceanGain.gain);

  oceanSrc.connect(oceanLP);
  oceanLP.connect(oceanGain);
  oceanGain.connect(master);

  oceanSrc.start(now);
  oceanSrc.stop(now + dur);
  waveLfo.start(now);
  waveLfo.stop(now + dur);

  transportNodes = { master, oscs: [horn, waveLfo], sources: [oceanSrc] };
  setTimeout(() => { if (transportNodes && transportNodes.master === master) transportNodes = null; }, duration);
}

/**
 * Stop any playing transport sound immediately.
 */
export function stopTransportSound() {
  if (!transportNodes) return;
  try { transportNodes.master.disconnect(); } catch(e) {}
  if (transportNodes.oscs) transportNodes.oscs.forEach(o => { try { o.stop(); } catch(e) {} });
  if (transportNodes.sources) transportNodes.sources.forEach(s => { try { s.stop(); } catch(e) {} });
  transportNodes = null;
}

// ─── Master Controls ─────────────────────────
export function enableAudio() {
  isEnabled = true;
  ensureContext();
  startAmbient();
  // Play a gentle chime so user knows audio is on
  playChime();
}

export function disableAudio() {
  isEnabled = false;
  stopAmbient();
  stopTransportSound();
  // Suspend the entire context to kill ALL output paths
  // (including reverb bypass from shared convolver node)
  if (audioCtx && audioCtx.state === 'running') {
    audioCtx.suspend();
  }
}

export function toggleAudio() {
  if (isEnabled) {
    disableAudio();
  } else {
    enableAudio();
  }
  return isEnabled;
}

export function isAudioEnabled() {
  return isEnabled;
}
