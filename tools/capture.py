"""Record docs/gameplay.gif and docs/*.png for the README (bot-driven, deterministic frame stepping).
    python3 tools/capture.py"""
import asyncio, base64, os, shutil, subprocess, re
from playwright.async_api import async_playwright
from common import open_game

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(HERE, "..", "docs")
FRAMES = os.path.join(HERE, "_frames")
BOT = open(os.path.join(HERE, "oracle.py")).read()
BOT = BOT[BOT.index('BOT = r"""') + 10: BOT.index('"""', BOT.index('BOT = r"""') + 10)]
PLAN = BOT[BOT.index("function hbAt"): BOT.index("const out = [];")]

HELPERS = r"""(() => { const G = GAME.G, LW = 120, PY = 180, MAXP = LW - 18, DT = 1 / 60, MOVE = Math.floor(GAME.TUNE.playerSpeed * DT);
""" + PLAN + r"""
let i = 0, clock = 0, f = 0;
window.CAP = {
  run(n, every) { const out = []; for (let k = 0; k < n; k++) { for (let s = 0; s < every; s++) { if (G.state === 'play') { if (f % 3 === 0) { plan(); i = 0; } const tg = path[Math.min(i++, path.length - 1)]; if (tg > 0) GAME.setPx(tg); } G.hp = Math.max(G.hp, 60); GAME.step(1); f++; } clock += every / 60; GAME.render(clock); out.push(document.getElementById('game').toDataURL('image/png')); } return out; },
};
})();"""

SCENES = [
    ("GAME.G.frozen=true;GAME.setNight(14);GAME.step(60)", 75),
    ("GAME.give('fig')", 45),
    ("GAME.setNight(15);GAME.step(60*5)", 90),
    ("GAME.G.boss.hp=0.5", 30),
    ("", 24),
]

async def main():
    shutil.rmtree(FRAMES, ignore_errors=True); os.makedirs(FRAMES); os.makedirs(DOCS, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page, errors = await open_game(b, viewport={"width": 260, "height": 470})
        await page.evaluate(HELPERS)
        n = 0
        for js, count in SCENES:
            if js: await page.evaluate(js)
            for d in await page.evaluate(f"CAP.run({count}, 4)"):
                open(f"{FRAMES}/{n:04d}.png", "wb").write(base64.b64decode(d.split(",", 1)[1])); n += 1
        await b.close()
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "15", "-i", f"{FRAMES}/%04d.png",
                    "-vf", "scale=240:-1:flags=neighbor,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=none",
                    f"{DOCS}/gameplay.gif"], check=True)
    shutil.rmtree(FRAMES)
    print("frames", n, "errors", errors)

asyncio.run(main())
