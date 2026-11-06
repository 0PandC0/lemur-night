// Entry point: canvas sizing, the main loop, and (only with #dev in the URL) test hooks.
import { G } from './state.js';
import { LW, LH, FONT, TUNE } from './config.js';
import { HAZARDS } from './content.js';
import { SFX, music } from './audio.js';
import { render, setContext } from './render.js';
import { update, startRun, beginNight, endNight, spawnHazard, makeHazard, collect, takeHit } from './world.js';
import { gapWith, survivable } from './fairness.js';
import { bindInput, primary, setPaused, toggleMusic } from './input.js';

const cv = document.getElementById('game');
const wrap = document.getElementById('wrap');
setContext(cv.getContext('2d'));

/** Integer-scale the 120x213 canvas to the largest size that fits, at device pixel ratio. */
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const cs = Math.max(0.5, Math.min(wrap.clientWidth / LW, wrap.clientHeight / LH));
  G.S = Math.max(1, Math.round(cs * dpr));
  cv.width = LW * G.S;
  cv.height = LH * G.S;
  cv.style.width = LW * cs + 'px';
  cv.style.height = LH * cs + 'px';
}
window.addEventListener('resize', resize);
bindInput(cv);

let last = performance.now(), clock = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  clock += dt;
  if (!G.paused && !G.frozen) update(dt);
  if (!G.frozen) render(clock);
  requestAnimationFrame(frame);
}
resize();
requestAnimationFrame(frame);
if (document.fonts && document.fonts.load) document.fonts.load(`8px ${FONT}`).catch(() => {});

// Installable + offline: register the service worker (skipped for the test build and the single-file bundle).
if ('serviceWorker' in navigator && location.hash !== '#dev' && document.querySelector('link[rel="manifest"]')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode just won't be available */ }));
  // show "OFFLINE READY" on the title screen once the whole game is cached
  const checkOffline = () => caches.keys()
    .then((keys) => Promise.all(keys.map((k) => caches.open(k).then((c) => c.match('src/main.js')))))
    .then((hits) => { G.offlineReady = hits.some(Boolean); if (!G.offlineReady) setTimeout(checkOffline, 2000); })
    .catch(() => {});
  navigator.serviceWorker.ready.then(checkOffline);
}

// Test hooks for the automated QA scripts in /tools. Not reachable in normal play.
if (location.hash === '#dev') {
  window.GAME = {
    G, TUNE, HAZARDS, SFX, music, gapWith, survivable, primary, toggleMusic,
    start: () => startRun(),
    setNight(n) { if (G.state !== 'play') startRun(); beginNight(n); },
    clearNight() { G.nightT = G.nightLen; },
    win() { G.night = 30; endNight(); },
    kill() { Object.assign(G, { hp: 1, hasBeetle: false, shield: 0, invuln: 0 }); takeHit({ def: HAZARDS.coconut, x: G.px, y: 180, w: 10, h: 10 }); },
    give(type) { collect({ type, x: G.px, y: 160, w: 10, h: 10 }); },
    spawn: (type) => spawnHazard(type),
    drop(type, x, y) { const h = makeHazard(type, x, { y }); G.items.push(h); return h; },
    step(n) { for (let i = 0; i < n; i++) update(1 / 60); },
    setPx(x) { G.px = x; },
    pause: () => setPaused('paused'),
    render: (t) => render(t),
  };
}
