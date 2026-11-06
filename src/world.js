// Night flow, spawning, power-ups, collisions and the per-frame update.
import { G } from './state.js';
import { TUNE, LW, LH, PY, PW, NIGHTS, BOSS_NIGHT, isStorm } from './config.js';
import { HAZARDS, POWERUPS, TEXT, poolFor } from './content.js';
import { SPR } from './sprites.js';
import { SFX, music } from './audio.js';
import { store } from './store.js';
import { band, fair, survivable } from './fairness.js';
import { startBoss, updateBoss } from './boss.js';

// ---------------------------------------------------------------- effects
export function showBanner([big, small], fg, bg) { G.banner = { big, small, fg, bg, t: 0, life: 1.9 }; }
export function addFloat(x, y, t, c) { G.floats.push({ x, y, t, c, life: 0.9, age: 0 }); }
export function burst(x, y, cols, n = 12, speed = 50) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random());
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 0.5 + Math.random() * 0.5, age: 0, c: cols[i % cols.length] });
  }
}

export const wantedTrack = () => (G.boss ? (G.boss.rage ? 'fury' : 'hunt') : isStorm(G.night) ? 'storm' : 'calm');

// ---------------------------------------------------------------- run + night flow
function resetRun() {
  Object.assign(G, {
    night: 1, hp: 100, shield: 0, hasBeetle: false, beetleUsed: false, newBest: false,
    items: [], parts: [], floats: [], beams: [], warns: [], banner: null, boss: null,
    px: 51.5, slowT: 0, dayFlash: 0, invuln: 0, reviveT: 0, shake: 0, flash: 0, lastKiller: '',
  });
  G.drag.active = false;
}

export function startRun() {
  resetRun();
  SFX.start();
  beginNight(1);
  music.play(wantedTrack());
}

export function beginNight(n) {
  Object.assign(G, { night: n, nightT: 0, state: 'play', stateT: 0, boss: null, beams: [], warns: [], items: [], banner: null, campT: 0, campX: G.px });
  G.nightLen = n === BOSS_NIGHT ? Infinity : TUNE.nightLen(n);
  G.spawnT = 0.8;
  G.burstT = TUNE.burstEvery;
  G.streakT = TUNE.streakEvery;

  // plan this night's power-ups so they always land before dawn
  G.puPlan = [];
  if (n !== BOSS_NIGHT) {
    const fall = (PY + 28) / TUNE.puSpeed(n), latest = G.nightLen - TUNE.dawn - fall - 0.5;
    if (Math.random() < TUNE.puChance1(n)) G.puPlan.push(2 + Math.random() * Math.max(0.3, Math.min(latest, G.nightLen * 0.45) - 2));
    if (Math.random() < TUNE.puChance2(n)) G.puPlan.push(Math.min(latest, G.nightLen * 0.5 + Math.random() * Math.max(0.3, latest - G.nightLen * 0.5)));
    G.puPlan.sort((a, b) => a - b);
  }

  if (n === BOSS_NIGHT) startBoss();
  else if (n === NIGHTS) showBanner(TEXT.finalNight, '#ffd23f', 'rgba(60,40,0,0.9)');
  else if (isStorm(n)) { showBanner(TEXT.storm, '#bfe0ff', 'rgba(20,30,60,0.92)'); SFX.thunder(); }
  else if (n === 1) showBanner(TEXT.night1, '#ffffff', 'rgba(16,30,30,0.9)');
  music.set(wantedTrack());
}

function endNight() {
  G.items.forEach((o) => { if (!o.dead) burst(o.x + o.w / 2, o.y + o.h / 2, ['#ffffff', '#bfe0d0'], 5, 30); });
  Object.assign(G, { items: [], beams: [], warns: [], boss: null, banner: null });
  if (G.night >= NIGHTS) { winGame(); return; }
  G.lastHeal = Math.max(0, Math.min(TUNE.restHeal, 100 - Math.ceil(G.hp)));
  G.hp += G.lastHeal;
  Object.assign(G, { state: 'clear', clearT: 0, stateT: 0, slowT: 0 });
  SFX.chirp();
  music.duck();
}
export { endNight };

function die() {
  Object.assign(G, { state: 'dead', deadT: 0, stateT: 0, beams: [], warns: [] });
  music.stop();
  SFX.die();
  if (G.night > G.best) { G.best = G.night; G.newBest = true; store.set('lemur-best', G.best); }
}

function winGame() {
  Object.assign(G, { state: 'win', stateT: 0 });
  music.stop();
  G.wonHp = Math.max(0, Math.round(G.hp));
  G.newBest = G.best <= NIGHTS;
  G.best = NIGHTS + 1;
  store.set('lemur-best', G.best);
  SFX.win();
}

// ---------------------------------------------------------------- spawning
export function makeHazard(type, x, o = {}) {
  const def = HAZARDS[type], sp = SPR[type];
  const vy = o.vy !== undefined ? o.vy
    : (TUNE.fallSpeed(G.night) + (isStorm(G.night) ? TUNE.stormSpeed : 0) + Math.random() * 12) * (def.speed || 1) * (o.speedMul || 1);
  return { id: ++G.uid, kind: 'hz', type, x, bx: x, y: o.y !== undefined ? o.y : -sp.height, w: sp.width, h: sp.height, vy, t: Math.random() * 6, def };
}

/** Random x, spread slightly past both edges so the walls get as much traffic as the middle. */
export function spawnX(w) {
  const m = w * TUNE.edgeSpread, c = -m + Math.random() * (LW + 2 * m);
  return Math.max(0, Math.min(LW - w, c - w / 2));
}
const aimX = (w) => Math.max(0, Math.min(LW - w, G.px + PW / 2 - w / 2 + (Math.random() - 0.5) * 12));

/** Spawn a danger if it's fair, survivable and can clear the lemur before dawn. Returns it, or null. */
export function spawnHazard(type, x, o = {}) {
  const sp = SPR[type], tries = x === undefined ? 10 : 1;
  const camping = x === undefined && !G.noCamp && G.campT > TUNE.campTime && G.night >= 2 && Math.random() < TUNE.campAim;
  for (let i = 0; i < tries; i++) {
    const cx = x !== undefined ? x : (camping && i < 3 ? aimX(sp.width) : spawnX(sp.width));
    const h = makeHazard(type, cx, o);
    // don't stack two things on top of each other
    if (x === undefined && G.items.some((q) => q.kind === 'hz' && Math.abs(q.y - h.y) < Math.max(q.h, h.h) && h.x < q.x + q.w + 2 && h.x + h.w + 2 > q.x)) continue;
    if (!G.boss && !o.force && band(h)[1] > G.nightLen - G.nightT - TUNE.clearMargin) continue;
    if (o.force || (fair(h) && survivable([h]))) { G.items.push(h); return h; }
  }
  return null;
}

export function spawnPowerup() {
  if (G.items.some((o) => o.kind === 'pu')) return false;
  let type;
  if (G.night >= TUNE.beetleFrom && !G.beetleUsed && !G.hasBeetle && Math.random() < TUNE.beetleChance) type = 'beetle';
  else {
    const opts = ['fig', 'leaf', 'cricket'];
    if (G.hp < 50) opts.push('cricket');
    type = opts[Math.random() * opts.length | 0];
  }
  const sp = SPR[type], x = 6 + Math.random() * (LW - sp.width - 12);
  G.items.push({ id: ++G.uid, kind: 'pu', type, x, bx: x, y: -sp.height, w: sp.width, h: sp.height, vy: TUNE.puSpeed(G.night), t: 0 });
  return true;
}

// ---------------------------------------------------------------- collisions
function hitbox(o) {
  if (o.kind === 'hz') { const h = o.def.hit; return [o.x + h[0], o.y + h[1], h[2], h[3]]; }
  return [o.x + 3, o.y + 2, o.w - 6, o.h - 4];
}
const overlap = (a, b) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];

export function takeHit(o) {
  if (o.blocked || G.invuln > 0) return;
  const cx = G.px + PW / 2;
  if (G.shield > 0) {
    G.shield--; G.invuln = 0.35;
    SFX.block();
    addFloat(cx, PY - 6, 'BLOCK!', '#8af07a');
    burst(cx, PY + 6, ['#8af07a', '#d8ffd0'], 10, 40);
    if (!o.isBeam) { o.blocked = true; o.vy = -70; o.vx = (o.x + o.w / 2 < cx ? -1 : 1) * 45; }
    return;
  }
  const dmg = Math.round(o.def.dmg * TUNE.dmgMul(G.night));
  G.hp -= dmg;
  Object.assign(G, { lastKiller: o.def.name, invuln: 0.8, shake: 0.28, flash: 0.35 });
  SFX.hit();
  addFloat(cx, PY - 6, '-' + dmg, '#ff6a5a');
  burst(o.x + o.w / 2, Math.min(o.y + o.h / 2, PY + 8), ['#ff6a5a', '#ffffff', '#ffb08a'], 14, 55);
  if (!o.isBeam) o.dead = true;
  if (G.hp <= 0) {
    if (G.hasBeetle) {
      Object.assign(G, { hasBeetle: false, beetleUsed: true, hp: TUNE.reviveHp, invuln: 1.6, reviveT: 1.6 });
      SFX.revive();
      showBanner(TEXT.revive, '#fff3b0', 'rgba(60,40,0,0.9)');
      G.items.forEach((i) => { if (i.kind === 'hz' && i.y > 100) { i.dead = true; burst(i.x + i.w / 2, i.y + i.h / 2, ['#ffd23f', '#ffffff'], 6, 40); } });
      G.beams = [];
    } else die();
  }
}

export function collect(o) {
  o.dead = true;
  music.duck();
  burst(o.x + o.w / 2, o.y + o.h / 2, ['#ffffff', '#fff3b0', '#d8ffd0'], 12, 45);
  const pu = POWERUPS[o.type];
  showBanner(pu.banner, pu.fg, pu.bg);
  if (o.type === 'fig') { G.slowT = TUNE.slowTime; SFX.slow(); }
  if (o.type === 'leaf') { G.shield = TUNE.shieldHits; SFX.shield(); }
  if (o.type === 'cricket') {
    G.hp = Math.min(100, G.hp + TUNE.snackHeal); G.dayFlash = 1.4; SFX.snack();
    burst(G.px + PW / 2, PY + 8, ['#eaffc8', '#8af07a'], 16, 50);
  }
  if (o.type === 'beetle') { G.hasBeetle = true; SFX.beetle(); }
  const b = G.boss;
  if (b && b.phase === 'fight') { b.hp -= TUNE.bossPuHit; b.flashT = 0.3; addFloat(b.x + 24, b.y + 34, '-' + TUNE.bossPuHit + ' HUNGER', '#ffb08a'); }
}

// ---------------------------------------------------------------- per-frame update
function updateSpawning(dt, ts) {
  const dawn = !G.boss && G.nightT > G.nightLen - TUNE.dawn;
  if (!G.boss && !dawn) {
    G.spawnT -= dt * ts;
    if (G.spawnT <= 0) {
      const p = poolFor(G.night), type = p[Math.random() * p.length | 0], h = spawnHazard(type);
      // from night 12 a chameleon sometimes rides down next to a snake
      if (h && type === 'snake' && G.night >= 12 && Math.random() < 0.4) {
        const w = SPR.chameleon.width, tx = h.x + h.w + 2 < LW - w - 1 ? h.x + h.w + 2 : h.x - w - 2;
        if (tx > 1) spawnHazard('chameleon', tx, { y: h.y + 10, vy: h.vy });
      }
      G.spawnT = h ? TUNE.spawnEvery(G.night) * (isStorm(G.night) ? TUNE.stormSpawn : 1) : 0.15;
    }
    if (G.night >= TUNE.burstFrom) {
      G.burstT -= dt * ts;
      if (G.burstT <= 0) {
        const p = poolFor(G.night);
        for (let k = 0; k < 3; k++) { const ty = p[Math.random() * p.length | 0]; spawnHazard(ty, undefined, { y: -SPR[ty].height - k * 16 }); }
        G.burstT = TUNE.burstEvery * (0.8 + Math.random() * 0.4);
      }
    }
    if (G.night >= TUNE.streakFrom) {
      G.streakT -= dt * ts;
      if (G.streakT <= 0) {
        const p = poolFor(G.night), ty = p[Math.random() * p.length | 0], w = SPR[ty].width, x = spawnX(w);
        // only warn about a fast streak that can still clear the lemur before dawn
        if (band(makeHazard(ty, x, { speedMul: 1.9 }))[1] + 0.7 <= G.nightLen - G.nightT - TUNE.clearMargin) G.warns.push({ x, type: ty, w, t: 0, life: 0.7 });
        G.streakT = TUNE.streakEvery * (0.7 + Math.random() * 0.6);
      }
    }
  }
  if (!G.boss && G.puPlan.length && G.nightT >= G.puPlan[0]) {
    const fall = (PY + 28) / TUNE.puSpeed(G.night);
    if (G.nightT + fall > G.nightLen - 0.4) G.puPlan.shift();
    else if (spawnPowerup()) G.puPlan.shift();
    else G.puPlan[0] += 0.5;
  }
  for (const w of G.warns) {
    w.t += dt * ts;
    if (w.t >= w.life) { w.done = true; if (!dawn) spawnHazard(w.type, w.x, { speedMul: 1.9 }); }
  }
  G.warns = G.warns.filter((w) => !w.done);
}

function updateBeams(dt, ts) {
  for (const bm of G.beams) {
    bm.t += dt * ts;
    if (!bm.firing && bm.t >= bm.warn) { bm.firing = true; bm.t = 0; SFX.pounce(); G.shake = Math.max(G.shake, 0.15); }
    if (bm.firing) {
      if (!G.ghost && G.state === 'play' && G.px + 3 < bm.x + bm.w && G.px + 14 > bm.x) takeHit({ def: HAZARDS.pounce, isBeam: true, x: bm.x, y: PY, w: bm.w, h: 10 });
      if (bm.t >= bm.fire) bm.done = true;
    }
  }
  G.beams = G.beams.filter((b) => !b.done);
}

function updateItems(dt, ts) {
  const body = [G.px + 3, PY + 2, 11, 16];
  for (const o of G.items) {
    const s = o.kind === 'hz' ? ts : 1;
    o.t += dt * s;
    if (o.blocked) { o.x += o.vx * dt; o.y += o.vy * dt; o.vy += 160 * dt; if (o.y > LH || o.y < -40) o.dead = true; continue; }
    o.y += o.vy * dt * s;
    if (o.kind === 'hz') {
      if (o.def.sway) o.x = o.bx + Math.sin(o.t * 1.6) * o.def.sway;
      if (o.def.zig) o.x = Math.max(1, Math.min(LW - o.w - 1, o.bx + Math.sin(o.t * 3) * o.def.zig));
    } else o.x = o.bx + Math.sin(o.t * 2) * 3;
    if (o.y > LH) o.dead = true;
    if (!G.ghost && !o.dead && overlap(body, hitbox(o))) { if (o.kind === 'hz') takeHit(o); else collect(o); }
    if (G.state !== 'play') break;
  }
  G.items = G.items.filter((o) => !o.dead);
}

export function update(dt) {
  G.stateT += dt;
  G.parts.forEach((p) => { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt; });
  G.parts = G.parts.filter((p) => p.age < p.life);
  G.floats.forEach((f) => { f.age += dt; f.y -= 14 * dt; });
  G.floats = G.floats.filter((f) => f.age < f.life);
  if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.life) G.banner = null; }
  G.shake = Math.max(0, G.shake - dt);
  G.flash = Math.max(0, G.flash - dt);
  if (G.state === 'clear') { G.clearT += dt; if (G.clearT > 2.6) beginNight(G.night + 1); return; }
  if (G.state === 'dead') { G.deadT += dt; return; }
  if (G.state !== 'play') return;

  G.nightT += dt;
  G.invuln = Math.max(0, G.invuln - dt);
  G.slowT = Math.max(0, G.slowT - dt);
  G.dayFlash = Math.max(0, G.dayFlash - dt);
  G.reviveT = Math.max(0, G.reviveT - dt);

  // movement: keys or drag
  let mv = 0;
  if (G.keys.left) mv -= 1;
  if (G.keys.right) mv += 1;
  if (mv) { G.px += mv * TUNE.playerSpeed * dt; G.facing = mv; }
  const d = G.drag;
  if (d.active) {
    const nx = d.startPx + (d.x - d.startX);
    if (Math.abs(nx - G.px) > 0.05) G.facing = nx < G.px ? -1 : 1;
    mv = mv || (Math.abs(nx - G.px) > 0.2 ? 1 : 0);
    G.px = nx;
  }
  G.px = Math.max(1, Math.min(LW - (PW + 1), G.px));
  G.walkT = mv ? G.walkT + dt : 0;
  if (Math.abs(G.px - G.campX) < 12) G.campT += dt; else { G.campX = G.px; G.campT = 0; }

  const ts = G.slowT > 0 ? TUNE.slowScale : 1;
  if (music.playing) music.set(wantedTrack());
  if (G.boss) { updateBoss(dt, ts); if (G.state !== 'play') return; }
  updateSpawning(dt, ts);
  updateBeams(dt, ts);
  if (G.state !== 'play') return;
  updateItems(dt, ts);

  // a night ends at dawn, but only once everything still falling has passed the lemur
  const pending = G.items.some((o) => o.kind === 'hz' && !o.blocked && !o.dead && o.y < PY + 18);
  if (G.state === 'play' && !G.boss && G.nightT >= G.nightLen && (G.nightT >= G.nightLen + 5 || !pending)) endNight();
}
