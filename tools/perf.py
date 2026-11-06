"""Frame-time check on a phone-sized screen (Pixel-like, DPR 2.625) in the busiest scenes.
    python3 tools/perf.py"""
import asyncio, sys
from playwright.async_api import async_playwright
from common import open_game

JS = r"""(scene) => {
const G = GAME.G; G.frozen = true;
const stats = (a) => { a.sort((x, y) => x - y); const q = (p) => a[Math.min(a.length - 1, Math.floor(a.length * p))]; return { avg: +(a.reduce((s, v) => s + v, 0) / a.length).toFixed(2), p95: +q(0.95).toFixed(2), p99: +q(0.99).toFixed(2), max: +a[a.length - 1].toFixed(2) }; };
if (scene === 'late storm') { GAME.setNight(25); }
if (scene === 'boss rage') { GAME.setNight(15); G.hp = 1e9; GAME.step(180); G.boss.hp = 48; }
if (scene === 'fig slow-mo') { GAME.setNight(24); GAME.step(120); }
const up = [], re = []; let clock = 0;
const cv = document.getElementById('game'), g = cv.getContext('2d');
for (let i = 0; i < 1200; i++) {
  G.hp = 1e9; G.ghost = true;
  if (scene === 'fig slow-mo' && i % 300 === 0) GAME.give('fig');
  const t0 = performance.now(); GAME.step(1); const t1 = performance.now();
  GAME.render(clock += 1 / 60); g.getImageData(0, 0, 1, 1);   // force the GPU flush so we time real work
  const t2 = performance.now(); up.push(t1 - t0); re.push(t2 - t1);
}
G.ghost = false;
return { update: stats(up), render: stats(re), canvas: [cv.width, cv.height] };
}"""


async def main():
    worst = 0
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page, errors = await open_game(b, viewport={"width": 412, "height": 915}, device_scale_factor=2.625)
        for scene in ["late storm", "boss rage", "fig slow-mo"]:
            r = await page.evaluate(JS, scene)
            worst = max(worst, r["update"]["p99"] + r["render"]["p99"])
            print(scene, r)
        await b.close()
    ok = worst < 16.7 and not errors
    print(f"\n{'PASS' if ok else 'FAIL'} p99 update+render = {worst:.1f} ms per frame (budget 16.7 ms)", "| errors:", errors)
    sys.exit(0 if ok else 1)

asyncio.run(main())
