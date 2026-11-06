"""Dead-zone check: is any spot on the branch much safer than the rest? Also measures anti-camping.
    python3 tools/deadzone.py [reps]"""
import asyncio, sys
from playwright.async_api import async_playwright
from common import open_game

JS = r"""(reps) => {
const G = GAME.G, LW = 120, PY = 180, NX = LW - 18, res = {};
const groups = { 'nights 1-7': [1,2,3,4,5,6,7], 'nights 8-14': [8,9,10,11,12,13,14], 'nights 16-22': [16,17,18,19,20,21,22], 'nights 23-30': [23,24,25,26,27,28,29,30], 'boss (15)': [15] };
G.ghost = true; G.noCamp = true;
for (const [name, nights] of Object.entries(groups)) {
  const hits = new Array(NX + 1).fill(0); let secs = 0;
  for (let r = 0; r < reps; r++) for (const n of nights) {
    GAME.setNight(n); const span = {}; let s = 0;
    while (G.state === 'play' && G.night === n && s < 3600) {
      G.hp = 1e9; GAME.setPx(51.5); GAME.step(1); s++;
      for (const o of G.items) {
        if (o.kind !== 'hz' || o.blocked) continue;
        const h = o.def.hit, y0 = o.y + h[1], y1 = y0 + h[3];
        if (y1 > PY + 2 && y0 < PY + 18) { const sp = span[o.id] || (span[o.id] = [1e9, -1e9]); sp[0] = Math.min(sp[0], o.x + h[0]); sp[1] = Math.max(sp[1], o.x + h[0] + h[2]); }
      }
      for (const b of G.beams) if (b.firing && !b._k) { b._k = 1; span['b' + Math.random()] = [b.x, b.x + b.w]; }
    }
    secs += s / 60;
    for (const sp of Object.values(span)) for (let x = 1; x <= NX; x++) if (sp[0] < x + 14 && sp[1] > x + 3) hits[x]++;
  }
  const perMin = hits.slice(1).map((h) => h / secs * 60), avg = perMin.reduce((a, b) => a + b, 0) / perMin.length;
  const zones = [];
  for (let z = 0; z < 9; z++) { const a = Math.floor(z * NX / 9), b = Math.floor((z + 1) * NX / 9), sl = perMin.slice(a, b); zones.push(+(sl.reduce((p, q) => p + q, 0) / sl.length / avg).toFixed(2)); }
  res[name] = { threatsPerMin: +avg.toFixed(1), zonesVsAvg: zones, safestVsAvg: +(Math.min(...perMin) / avg).toFixed(2) };
}
G.noCamp = false;
const camp = {};
for (const X of [1, 51, 102]) {
  let n = 0, secs = 0;
  for (let r = 0; r < reps; r++) for (const night of [5, 12, 18, 24, 28]) {
    GAME.setNight(night); const seen = new Set(); let s = 0;
    while (G.state === 'play' && G.night === night && s < 3600) {
      G.hp = 1e9; GAME.setPx(X); GAME.step(1); s++;
      for (const o of G.items) {
        if (o.kind !== 'hz' || seen.has(o.id)) continue;
        const h = o.def.hit, y0 = o.y + h[1], y1 = y0 + h[3];
        if (y1 > PY + 2 && y0 < PY + 18 && o.x + h[0] < X + 14 && o.x + h[0] + h[2] > X + 3) { seen.add(o.id); n++; }
      }
    }
    secs += s / 60;
  }
  camp['standing still at x=' + X] = +(n / secs * 60).toFixed(1);
}
res.campingHitsPerMin = camp;
G.ghost = false;
return res;
}"""


async def main():
    reps = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page, errors = await open_game(b)
        res = await page.evaluate(JS, reps)
        for k, v in res.items():
            print(k, v)
        worst = min(v["safestVsAvg"] for k, v in res.items() if k != "campingHitsPerMin")
        cmp = list(res["campingHitsPerMin"].values())
        ok = worst >= 0.6 and min(cmp) >= 0.7 * max(cmp)
        print("\nPASS no dead zones" if ok else "\nFAIL dead zone found", "| errors:", errors)
        await b.close()
    sys.exit(0 if ok and not errors else 1)

asyncio.run(main())
