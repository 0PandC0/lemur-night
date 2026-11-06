// Fairness rules. Hard is fine, impossible is not:
//  1. whatever crosses the lemur's row at the same time must leave a gap at least TUNE.gapNeed wide
//  2. a new danger only spawns if, from where the lemur is right now, a path at full speed still dodges everything
import { G } from './state.js';
import { TUNE, LW, PY, PW } from './config.js';

const ROW_TOP = PY;
const ROW_BOTTOM = PY + 18;

/** Time window [enter, leave] during which an item overlaps the lemur's row, honouring slow motion. */
export function band(o) {
  const v = Math.max(1, o.vy);
  const toT = (d) => {
    const slowDist = G.slowT * TUNE.slowScale * v;
    return d <= slowDist ? d / (v * TUNE.slowScale) : G.slowT + (d - slowDist) / v;
  };
  return [toT(ROW_TOP - (o.y + o.h)), toT(ROW_BOTTOM - o.y)];
}

/** Horizontal extent an item can cover, including its sway / zig-zag. */
function xRange(o) {
  const amp = o.def ? (o.def.sway || o.def.zig || 0) : 0;
  const base = o.bx !== undefined ? o.bx : o.x;
  return [Math.max(0, base - amp), Math.min(LW, base + o.w + amp)];
}

/** Widest open gap in the lemur's row while the given new items pass through it. */
export function gapWith(extra) {
  const spans = [], seen = new Set();
  for (const c of extra) {
    const [a, b] = band(c);
    spans.push(xRange(c)); seen.add(c);
    for (const o of G.items) {
      if (seen.has(o) || o.kind !== 'hz' || o.blocked) continue;
      const [oa, ob] = band(o);
      if (ob > 0 && oa < b && ob > a) { spans.push(xRange(o)); seen.add(o); }
    }
  }
  for (const bm of G.beams) spans.push([bm.x, bm.x + bm.w]);
  spans.sort((p, q) => p[0] - q[0]);
  let cur = 0, gap = 0;
  for (const [l, r] of spans) { gap = Math.max(gap, l - cur); cur = Math.max(cur, r); }
  return Math.max(gap, LW - cur);
}

export const fair = (...items) => gapWith(items) >= TUNE.gapNeed;

/** Hitbox of an item tau seconds from now. */
export function hitboxAt(o, tau) {
  const d = o.def;
  const eff = tau <= G.slowT ? tau * TUNE.slowScale : G.slowT * TUNE.slowScale + (tau - G.slowT);
  const y = o.y + o.vy * eff;
  let x = o.x;
  if (d.sway) x = o.bx + Math.sin((o.t + eff) * 1.6) * d.sway;
  if (d.zig) x = Math.max(1, Math.min(LW - o.w - 1, o.bx + Math.sin((o.t + eff) * 3) * d.zig));
  const h = d.hit;
  return [x + h[0], y + h[1], h[2], h[3]];
}

/**
 * Reachability search: the set of lemur positions that are still safe, stepped forward 1/30 s at a time.
 * If that set ever becomes empty, the new items would make the night impossible, so they don't spawn.
 */
export function survivable(extra, horizon = 0) {
  const all = G.items.filter((o) => o.kind === 'hz' && !o.blocked).concat(extra);
  let tEnd = horizon;
  for (const o of extra) tEnd = Math.max(tEnd, band(o)[1]);
  for (const b of G.beams) tEnd = Math.max(tEnd, (b.firing ? 0 : b.warn - b.t) + b.fire);
  tEnd = Math.min(4, tEnd);
  if (tEnd <= 0) return true;

  const STEP = 1 / 30, MOVE = Math.floor(TUNE.playerSpeed * STEP), MAXP = LW - (PW + 1);
  let reach = new Uint8Array(MAXP + 2);
  reach[Math.max(1, Math.min(MAXP, Math.round(G.px)))] = 1;
  for (let t = STEP; t <= tEnd + 1e-6; t += STEP) {
    const next = new Uint8Array(MAXP + 2);
    for (let p = 1; p <= MAXP; p++) if (reach[p]) {
      for (let q = Math.max(1, p - MOVE); q <= Math.min(MAXP, p + MOVE); q++) next[q] = 1;
    }
    for (const o of all) for (const tt of [t - STEP / 2, t]) {
      const hb = hitboxAt(o, tt);
      if (hb[1] + hb[3] <= ROW_TOP + 2 || hb[1] >= ROW_BOTTOM) continue;
      // keep at least a 14 px opening (the body is 11 px wide), so every escape is comfortably doable
      for (let p = Math.max(1, Math.floor(hb[0] - 15)); p <= Math.min(MAXP, Math.ceil(hb[0] + hb[2] - 3)); p++) next[p] = 0;
    }
    for (const b of G.beams) {
      const f0 = b.firing ? -b.t : b.warn - b.t, f1 = f0 + b.fire;
      if (t < f0 - 0.05 || t > f1 + 0.05) continue;
      for (let p = Math.max(1, Math.floor(b.x - 15)); p <= Math.min(MAXP, Math.ceil(b.x + b.w - 3)); p++) next[p] = 0;
    }
    if (!next.some((v) => v)) return false;
    reach = next;
  }
  return true;
}
