// Sound effects and chiptune music, synthesized live with the Web Audio API (no audio files).
import { store } from './store.js';

let ctx = null;
let muted = store.get('lemur-muted', false);

/** Lazily create/resume the AudioContext (browsers only allow it after a user gesture). */
export function audio() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export const isMuted = () => muted;
export function toggleMute() {
  muted = !muted;
  store.set('lemur-muted', muted);
  if (!muted) tone(880, 0.06, 'triangle', 0.06);
}

// ---------------------------------------------------------------- effects
function tone(f, d, type = 'square', v = 0.07, f2 = null, delay = 0) {
  if (muted) return;
  const a = audio(); if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(a.destination);
  o.start(t); o.stop(t + d + 0.03);
}

function noise(d, v = 0.06, highpass = 0, delay = 0) {
  if (muted) return;
  const a = audio(); if (!a) return;
  const b = a.createBuffer(1, Math.floor(a.sampleRate * d), a.sampleRate), ch = b.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
  const s = a.createBufferSource(), g = a.createGain();
  g.gain.value = v; s.buffer = b;
  if (highpass) { const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = highpass; s.connect(f); f.connect(g); } else s.connect(g);
  g.connect(a.destination);
  s.start(a.currentTime + delay);
}

export const SFX = {
  hit()     { tone(160, 0.2, 'sine', 0.16, 60); noise(0.1, 0.07); },
  block()   { noise(0.12, 0.08, 2500); tone(1200, 0.08, 'triangle', 0.06); },
  slow()    { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.12, 'triangle', 0.06, null, i * 0.05)); },
  shield()  { noise(0.25, 0.07, 1800); tone(300, 0.25, 'triangle', 0.06, 700); },
  snack()   { noise(0.05, 0.09, 1200); noise(0.05, 0.09, 1200, 0.09); tone(988, 0.1, 'triangle', 0.06, 1319, 0.2); },
  beetle()  { [659, 880, 1109, 1319].forEach((f, i) => tone(f, 0.12, 'triangle', 0.06, null, i * 0.07)); },
  revive()  { [440, 554, 659, 880, 1109].forEach((f, i) => tone(f, 0.14, 'triangle', 0.07, null, i * 0.07)); },
  chirp()   { [0, 0.18, 0.36].forEach((d, i) => tone(1400 + i * 200, 0.09, 'sine', 0.08, 2600 + i * 200, d)); tone(1760, 0.3, 'triangle', 0.04, null, 0.55); },
  die()     { tone(520, 0.9, 'triangle', 0.09, 90); tone(260, 0.9, 'sine', 0.06, 50, 0.1); },
  win()     { [440, 554, 659, 880, 659, 880, 1109].forEach((f, i) => tone(f, 0.16, 'triangle', 0.07, null, i * 0.12)); },
  thunder() { noise(0.9, 0.09); tone(70, 0.8, 'sine', 0.12, 40); },
  growl()   { tone(90, 0.5, 'sawtooth', 0.05, 70); tone(95, 0.5, 'sawtooth', 0.04, 60, 0.05); },
  charge()  { tone(220, 0.8, 'triangle', 0.06, 880); },
  pounce()  { noise(0.25, 0.1, 900); tone(140, 0.3, 'sawtooth', 0.06, 50); },
  retreat() { noise(0.5, 0.06, 1500); [880, 740, 587, 440].forEach((f, i) => tone(f, 0.1, 'triangle', 0.06, null, i * 0.08)); },
  start()   { tone(660, 0.08, 'triangle', 0.07); tone(990, 0.12, 'triangle', 0.07, null, 0.08); },
};

// ---------------------------------------------------------------- music
// A tiny step sequencer: each song is 32 eighth notes of lead + bass and a 16-step percussion pattern.
// Percussion keys: b = low bongo, t = high bongo, h = shaker, s = snare.
const seq = (str) => str.trim().split(/\s+/);
const SONGS = {
  calm: {
    bpm: 100,
    lead: seq('A4 C5 E5 -  D5 C5 A4 -  G4 A4 C5 -  D5 E5 D5 C5  A4 C5 E5 G5  E5 D5 C5 -  D5 C5 A4 G4  A4 -  -  -'),
    bass: seq('A2 -  A2 E3  A2 -  A2 E3  F2 -  F2 C3  F2 -  F2 C3  C3 -  C3 G2  C3 -  C3 G2  G2 -  G2 D3  E2 -  E2 B2'),
    drums: 'b.h.t.h.b.htt.h.',
  },
  storm: {
    bpm: 120,
    lead: seq('A4 C5 E5 A5  D5 C5 A4 C5  G4 A4 C5 E5  D5 E5 D5 C5  A4 C5 E5 G5  E5 D5 C5 E5  D5 C5 A4 G4  A4 E5 A4 -'),
    bass: seq('A2 A2 A2 E3  A2 A2 A2 E3  F2 F2 F2 C3  F2 F2 F2 C3  C3 C3 C3 G2  C3 C3 C3 G2  G2 G2 G2 D3  E2 E2 E2 B2'),
    drums: 'b.htt.hbb.htt.hh',
  },
  hunt: {
    bpm: 132,
    lead: seq('D5 -  D5 F5  E5 -  C5 -  D5 -  D5 A5  G5 F5 E5 -  A#4 - A#4 D5  C5 -  A4 -  C5 -  C5 E5  D5 C#5 D5 -'),
    bass: seq('D2 D2 D3 D2  D2 D2 D3 D2  D2 D2 D3 D2  D2 D2 D3 D2  A#1 A#1 A#2 A#1  A#1 A#1 A#2 A#1  A1 A1 A2 A1  A1 A1 A2 A1'),
    drums: 'b.h.s.h.b.hbs.hh',
  },
  fury: {
    bpm: 156,
    lead: seq('D6 -  D6 F6  E6 -  C6 -  D6 -  D6 A6  G6 F6 E6 -  A#5 - A#5 D6  C6 -  A5 -  C6 -  C6 E6  D6 C#6 D6 -'),
    bass: seq('D2 D3 D2 D3  D2 D3 D2 D3  D2 D3 D2 D3  D2 D3 D2 D3  A#1 A#2 A#1 A#2  A#1 A#2 A#1 A#2  A1 A2 A1 A2  A1 A2 A1 A2'),
    drums: 'bbh.s.hhbbh.s.ht',
  },
};
export const SONG_NAMES = Object.keys(SONGS);

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function freq(n) {
  if (!n || n === '-') return 0;
  const m = n.match(/^([A-G]#?)(\d)$/);
  return 440 * Math.pow(2, (NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12);
}

const M = { on: store.get('lemur-music', true), track: null, step: 0, next: 0, timer: null, bus: null, noise: null, playing: false, base: 0.5, notes: 0 };

function bus(a) {
  if (M.bus) return;
  M.bus = a.createGain(); M.bus.gain.value = M.base; M.bus.connect(a.destination);
  const b = a.createBuffer(1, a.sampleRate * 0.2, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  M.noise = b;
}

function voice(a, type, f, t, dur, vol, slideTo) {
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(M.bus);
  o.start(t); o.stop(t + dur + 0.02);
  M.notes++;
}

function shake(a, t, dur, vol, hp) {
  const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
  s.buffer = M.noise; f.type = 'highpass'; f.frequency.value = hp;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(M.bus);
  s.start(t); s.stop(t + dur + 0.02);
  M.notes++;
}

function playStep(a, song, step, t) {
  const eighth = 60 / song.bpm / 2;
  if (step % 2 === 0) {
    const i = step / 2, lead = freq(song.lead[i]), bass = freq(song.bass[i]);
    if (lead) {
      voice(a, 'triangle', lead, t, eighth * 1.6, 0.11);               // plucky marimba-ish lead
      voice(a, 'triangle', lead * 2, t + eighth, eighth * 0.8, 0.025);  // soft echo an octave up
    }
    if (bass) voice(a, 'sine', bass, t, eighth * 1.8, 0.16);
  }
  const d = song.drums[step % 16];
  if (d === 'b') voice(a, 'sine', 210, t, 0.14, 0.18, 120);
  if (d === 't') voice(a, 'sine', 330, t, 0.1, 0.12, 230);
  if (d === 'h') shake(a, t, 0.04, 0.03, 6000);
  if (d === 's') shake(a, t, 0.1, 0.06, 1400);
}

function tick() {
  const a = ctx;
  if (!a || !M.playing || !M.track) return;
  const song = SONGS[M.track];
  if (M.next < a.currentTime) M.next = a.currentTime + 0.05;
  while (M.next < a.currentTime + 0.15) {
    playStep(a, song, M.step, M.next);
    M.next += 60 / song.bpm / 4;
    M.step = (M.step + 1) % 64;
  }
}

export const music = {
  get on() { return M.on; },
  get playing() { return M.playing; },
  get track() { return M.track; },
  get notes() { return M.notes; },
  play(track) {
    if (!M.on) return;
    const a = audio(); if (!a) return;
    bus(a);
    if (track) M.track = track;
    if (!M.track) M.track = 'calm';
    if (!M.playing) {
      M.playing = true;
      M.next = a.currentTime + 0.06;
      M.bus.gain.cancelScheduledValues(a.currentTime);
      M.bus.gain.setValueAtTime(M.base, a.currentTime);
    }
    if (!M.timer) M.timer = setInterval(tick, 25);
  },
  stop() {
    M.playing = false;
    if (M.timer) { clearInterval(M.timer); M.timer = null; }
    if (ctx && M.bus) { M.bus.gain.cancelScheduledValues(ctx.currentTime); M.bus.gain.setValueAtTime(0, ctx.currentTime); }
  },
  set(track) { M.track = track; },
  /** Dip the music briefly so a jingle can be heard. */
  duck() {
    if (!ctx || !M.bus || !M.playing) return;
    const t = ctx.currentTime;
    M.bus.gain.cancelScheduledValues(t);
    M.bus.gain.setValueAtTime(M.base * 0.3, t);
    M.bus.gain.linearRampToValueAtTime(M.base, t + 0.9);
  },
  toggle(resume) {
    M.on = !M.on;
    store.set('lemur-music', M.on);
    if (!M.on) music.stop(); else if (resume) music.play();
  },
};
