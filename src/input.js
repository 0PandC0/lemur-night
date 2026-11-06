// Keyboard, mouse and touch. Drag anywhere moves the lemur relative to where the finger went down.
import { G } from './state.js';
import { LW, LH } from './config.js';
import { audio, toggleMute, music } from './audio.js';
import { startRun, beginNight, wantedTrack } from './world.js';

const onResultScreen = () => G.state === 'title' || G.state === 'dead' || G.state === 'win';
const inSoundToggle = (p) => p.y < 8.5 && p.x > LW - 42;
const inMusicToggle = (p) => p.y >= 8.5 && p.y < 15 && p.x > LW - 42;

export function setPaused(v) {
  G.paused = v;
  if (v) music.stop();
  else if (G.state === 'play') music.play(wantedTrack());
}

export function toggleMusic() { music.toggle(G.state === 'play' || G.state === 'clear'); }

/** Space / Enter / tap: start, skip, resume or play again depending on the screen. */
export function primary() {
  audio();
  if (G.paused) { setPaused(null); return; }
  if (G.state === 'title') { startRun(); return; }
  if (G.state === 'clear' && G.clearT > 0.5) { beginNight(G.night + 1); return; }
  if ((G.state === 'dead' && G.deadT > 1.3) || (G.state === 'win' && G.stateT > 1.2)) startRun();
}

export function bindInput(cv) {
  const toLogical = (e) => {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * LW, y: (e.clientY - r.top) / r.height * LH };
  };

  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    document.body.classList.add('pointer');
    cv.focus({ preventScroll: true });
    if (e.pointerType === 'touch') G.touch = true;
    const p = toLogical(e);
    if (onResultScreen() && inSoundToggle(p)) { toggleMute(); return; }
    if (onResultScreen() && inMusicToggle(p)) { audio(); toggleMusic(); return; }
    if (G.state === 'play' && !G.paused) {
      Object.assign(G.drag, { active: true, x: p.x, startX: p.x, startPx: G.px });
      try { cv.setPointerCapture(e.pointerId); } catch (_) { /* older browsers */ }
      audio();
      return;
    }
    primary();
  });
  cv.addEventListener('pointermove', (e) => { if (G.drag.active) G.drag.x = toLogical(e).x; });
  const endDrag = () => { G.drag.active = false; };
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);

  const isLeft = (k) => k === 'ArrowLeft' || k === 'a' || k === 'A';
  const isRight = (k) => k === 'ArrowRight' || k === 'd' || k === 'D';
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'Tab') document.body.classList.remove('pointer');
    if (isLeft(k)) { G.keys.left = true; e.preventDefault(); }
    if (isRight(k)) { G.keys.right = true; e.preventDefault(); }
    if (k === ' ' || k === 'Enter') { e.preventDefault(); if (!e.repeat) primary(); }
    if (k === 'm' || k === 'M') toggleMute();
    if (k === 'n' || k === 'N') toggleMusic();
    if ((k === 'p' || k === 'P' || k === 'Escape') && G.state === 'play') setPaused(G.paused ? null : 'paused');
  });
  window.addEventListener('keyup', (e) => {
    if (isLeft(e.key)) G.keys.left = false;
    if (isRight(e.key)) G.keys.right = false;
  });

  // pause when the tab is hidden or loses focus, so nobody loses a run to a notification
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    if (G.state === 'play') setPaused('paused'); else music.stop();
  });
  window.addEventListener('blur', () => {
    G.keys.left = G.keys.right = false;
    G.drag.active = false;
    if (G.state === 'play') setPaused('paused');
  });
}
