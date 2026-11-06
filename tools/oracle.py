"""Proof that all 30 nights are beatable: a bot that plans a dodge path (same reachability search as the game)
and plays full runs at normal speed rules.   python3 tools/oracle.py [runs]"""
import asyncio, sys
from playwright.async_api import async_playwright
from common import open_game

BOT = r"""(runs) => {
const G = GAME.G, LW = 120, PY = 180, MAXP = LW - 18, DT = 1 / 60;
const MOVE = Math.floor(GAME.TUNE.playerSpeed * DT);
function hbAt(o, tau) {
  const d = o.def, sl = G.slowT, eff = tau <= sl ? tau * 0.4 : sl * 0.4 + (tau - sl);
  const y = o.y + o.vy * eff; let x = o.x; const t = o.t + eff;
  if (d.sway) x = o.bx + Math.sin(t * 1.6) * d.sway;
  if (d.zig) x = Math.max(1, Math.min(LW - o.w - 1, o.bx + Math.sin(t * 3) * d.zig));
  const h = d.hit; return [x + h[0], y + h[1], h[2], h[3]];
}
let path = [];
function plan() {
  const its = G.items.filter((o) => o.kind === 'hz' && !o.blocked), N = Math.round(2.6 / DT), layers = [];
  let reach = new Uint8Array(MAXP + 2); reach[Math.max(1, Math.min(MAXP, Math.round(G.px)))] = 1; layers.push(reach);
  for (let k = 1; k <= N; k++) {
    const t = k * DT, nx = new Uint8Array(MAXP + 2);
    for (let p = 1; p <= MAXP; p++) if (reach[p]) for (let q = Math.max(1, p - MOVE); q <= Math.min(MAXP, p + MOVE); q++) nx[q] = 1;
    for (const o of its) { const hb = hbAt(o, t); if (hb[1] + hb[3] <= PY + 2 || hb[1] >= PY + 18) continue; for (let p = Math.max(1, Math.floor(hb[0] - 14)); p <= Math.min(MAXP, Math.ceil(hb[0] + hb[2] - 3)); p++) nx[p] = 0; }
    for (const b of G.beams) { const f0 = b.firing ? -b.t : b.warn - b.t, f1 = f0 + b.fire; if (t < f0 - 0.06 || t > f1 + 0.06) continue; for (let p = Math.max(1, Math.floor(b.x - 15)); p <= Math.min(MAXP, Math.ceil(b.x + b.w - 2)); p++) nx[p] = 0; }
    if (!nx.some((v) => v)) break;
    layers.push(nx); reach = nx;
  }
  const L = layers.length - 1; let best = -1, bd = 1e9;
  for (let p = 1; p <= MAXP; p++) if (layers[L][p]) { const d = Math.abs(p - 51); if (d < bd) { bd = d; best = p; } }
  let cur = best; const back = [cur];
  for (let k = L - 1; k >= 1; k--) { let nb = -1, nd = 1e9; for (let q = Math.max(1, cur - MOVE); q <= Math.min(MAXP, cur + MOVE); q++) if (layers[k][q]) { const d = Math.abs(q - cur); if (d < nd) { nd = d; nb = q; } } cur = nb; back.push(cur); }
  path = back.reverse();
  return L < N;
}
const out = [];
for (let r = 0; r < runs; r++) {
  GAME.start(); let frames = 0, hits = 0, prev = 100, doomed = 0, i = 0; const log = [];
  while (frames < 60 * 60 * 25) {
    if (G.state === 'dead' || G.state === 'win') break;
    if (G.state === 'play') { if (frames % 3 === 0) { if (plan()) doomed++; i = 0; } const tg = path[Math.min(i++, path.length - 1)]; if (tg > 0) GAME.setPx(tg); }
    GAME.step(1); frames++;
    if (G.hp < prev - 0.5) { hits++; log.push(G.night + ':' + G.lastKiller); }
    prev = G.hp;
  }
  out.push({ end: G.state, night: G.night, hits, doomedChecks: doomed, hitLog: log.slice(0, 6), minutes: +(frames / 3600).toFixed(1) });
}
return out;
}"""


async def main():
    runs = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page, errors = await open_game(b)
        res = await page.evaluate(BOT, runs)
        for r in res:
            print(r)
        wins = sum(r["end"] == "win" for r in res)
        print(f"\n{wins}/{runs} full runs won", "| errors:", errors)
        await b.close()
    sys.exit(0 if wins == runs and not errors else 1)

asyncio.run(main())
