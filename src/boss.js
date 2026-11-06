// Night 15: the fossa prowls the branch above and attacks until its hunger runs out.
import { G } from './state.js';
import { TUNE, LW, PY } from './config.js';
import { TEXT, poolFor } from './content.js';
import { SFX } from './audio.js';
import { gapWith, fair, survivable } from './fairness.js';
import { showBanner, burst, makeHazard, spawnHazard, spawnPowerup, endNight } from './world.js';

export const FOSSA_W = 48;
const ATTACKS = ['seeds', 'thorns', 'pounce', 'wasps'];

export function startBoss() {
  G.boss = { x: 36, dir: 1, y: -30, hp: TUNE.bossHunger, phase: 'intro', t: 0, atkT: 1.2, atk: null, last: null, rage: false, flashT: 0, puT: 5, trickleT: 2, downT: 0, growlT: 0 };
  showBanner(TEXT.bossIntro, '#ff8a6a', 'rgba(60,16,10,0.92)');
}

/** Attacks come from a shuffled bag, so every fight shows all four and never repeats one back to back. */
function nextAttack() {
  const b = G.boss;
  if (!b.bag || !b.bag.length) {
    do { b.bag = ATTACKS.slice().sort(() => Math.random() - 0.5); } while (b.bag[b.bag.length - 1] === b.last);
  }
  b.last = b.bag.pop();
  b.atk = { type: b.last, t: 0, step: 0 };
}
function endAttack(cool) { G.boss.atk = null; G.boss.atkT = cool; }

/** Mark a column, then pounce down it. Skipped if it would trap the lemur. */
function addPounce(cx, warn) {
  const w = 18, x = Math.max(0, Math.min(LW - w, Math.round(cx - w / 2)));
  G.beams.push({ x, w, t: 0, warn, fire: 0.45, firing: false });
  if (!survivable([])) G.beams.pop();
}

/** A full row of thorny branches with exactly one gap, never in the same slot twice in a row. */
function spawnThornRow(prev) {
  const order = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5).filter((s) => prev === undefined || Math.abs(s - prev) >= 2);
  for (const slot of order) {
    const row = [];
    for (let s = 0; s < 5; s++) if (s !== slot) row.push(makeHazard('thorns', s * 24, { y: -12, vy: TUNE.fallSpeed(G.night) * 0.85 }));
    if (gapWith(row) >= TUNE.gapNeed && survivable(row)) { G.items.push(...row); return slot; }
  }
  return null;
}

function runAttack(dt) {
  const b = G.boss, A = b.atk, r = b.rage;
  A.t += dt;
  if (A.type === 'seeds') {          // shakes seed pods loose from the branch
    const n = r ? 7 : 5, gap = r ? 0.28 : 0.38;
    while (A.step < n && A.t >= A.step * gap) {
      const x = Math.max(0, Math.min(LW - 9, b.x + 18 + (Math.random() - 0.5) * 70));
      const h = makeHazard('seed', x, { y: b.y + 22, vy: TUNE.fallSpeed(G.night) * 1.25 });
      if (fair(h) && survivable([h])) G.items.push(h);
      A.step++;
    }
    if (A.step >= n) endAttack(r ? 0.8 : 1.4);
  } else if (A.type === 'thorns') {
    const rows = r ? 2 : 1;
    if (A.step < rows && A.t >= A.step * 1.5) {
      const s = spawnThornRow(A.prev);
      if (s !== null) { A.prev = s; A.step++; } else A.t -= 0.2;
    }
    if (A.step >= rows) endAttack(r ? 1.2 : 1.8);
  } else if (A.type === 'pounce') {
    if (A.step === 0) {
      addPounce(G.px + 8.5, r ? 0.8 : 1.05);
      if (r) {
        let x2, guard = 0;
        do { x2 = 4 + Math.random() * (LW - 26); } while (Math.abs(x2 - G.px) < 26 && guard++ < 20);
        addPounce(x2 + 9, 0.95);
      }
      A.step = 1;
      SFX.charge();
    }
    if (A.t > (r ? 1.6 : 1.9)) endAttack(r ? 0.7 : 1.2);
  } else if (A.type === 'wasps') {
    const n = r ? 6 : 4, gap = r ? 0.3 : 0.42;
    while (A.step < n && A.t >= A.step * gap) { spawnHazard('wasp', undefined, { vy: TUNE.fallSpeed(G.night) * 0.95 }); A.step++; }
    if (A.step >= n) endAttack(r ? 0.9 : 1.5);
  }
}

export function updateBoss(dt, ts) {
  const b = G.boss;
  b.t += dt;
  b.flashT = Math.max(0, b.flashT - dt);

  if (b.phase === 'intro') {
    b.y = Math.min(18, -30 + b.t * 22);
    b.growlT -= dt;
    if (b.growlT <= 0) { SFX.growl(); b.growlT = 0.9; }
    if (b.t > 2.8) { b.phase = 'fight'; showBanner(TEXT.bossFight, '#ff8a6a', 'rgba(60,16,10,0.9)'); }
    return;
  }
  if (b.phase === 'down') {           // runs off into the forest
    b.downT += dt;
    b.x += 110 * dt;
    if (b.downT > 1.8) endNight();
    return;
  }

  b.x += b.dir * (b.rage ? 42 : 30) * dt * ts;
  if (b.x < 2 || b.x > LW - FOSSA_W - 2) { b.dir *= -1; b.x = Math.max(2, Math.min(LW - FOSSA_W - 2, b.x)); }
  b.hp -= TUNE.bossDrain * dt;

  if (!b.rage && b.hp <= TUNE.bossHunger / 2) {
    b.rage = true; G.shake = 0.5;
    SFX.growl();
    showBanner(TEXT.bossRage, '#ff8a6a', 'rgba(60,16,10,0.9)');
  }
  if (b.hp <= 0) {
    b.hp = 0; b.phase = 'down'; b.downT = 0; b.dir = 1;
    burst(b.x + 24, b.y + 14, ['#d8a878', '#ffd23f', '#ffffff', '#8af07a'], 40, 70);
    G.shake = 0.4;
    SFX.retreat();
    G.items.forEach((o) => { if (o.kind === 'hz') { o.dead = true; burst(o.x + o.w / 2, o.y + o.h / 2, ['#ffffff', '#ffd23f'], 5, 30); } });
    G.beams = [];
    const heal = Math.max(0, Math.min(TUNE.bossWinHeal, 100 - Math.ceil(G.hp)));
    G.hp += heal;
    showBanner([TEXT.bossDown, '+' + heal + ' HP'], '#ffd23f', 'rgba(60,40,0,0.9)');
    return;
  }

  if (b.atk) runAttack(dt * ts);
  else { b.atkT -= dt * ts; if (b.atkT <= 0) nextAttack(); }

  // power-ups keep coming during the fight (each one also cuts its hunger)
  b.puT -= dt;
  if (b.puT <= 0) {
    const fall = (PY + 28) / TUNE.puSpeed(G.night);
    b.puT = b.hp > TUNE.bossDrain * (fall + 1) && spawnPowerup() ? 6.5 + Math.random() * 2 : 1;
  }
  if (b.rage) {
    b.trickleT -= dt * ts;
    if (b.trickleT <= 0) {
      const p = poolFor(G.night);
      b.trickleT = spawnHazard(p[Math.random() * p.length | 0]) ? TUNE.spawnEvery(G.night) * 2.4 : 0.3;
    }
  }
}

