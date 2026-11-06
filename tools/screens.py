"""Render key game states to PNGs for a visual check: python3 tools/screens.py [base_url] [outdir]"""
import asyncio, sys, os
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765/index.html"
OUT = sys.argv[2] if len(sys.argv) > 2 else "shots"
SCENES = [
  ("title", "GAME.G.touch=false"),
  ("night3", "GAME.setNight(3);GAME.G.ghost=true;GAME.step(60*7);GAME.G.ghost=false"),
  ("storm14", "GAME.setNight(14);GAME.G.ghost=true;GAME.step(60*6);GAME.give('leaf');GAME.step(20)"),
  ("fig", "GAME.setNight(9);GAME.G.ghost=true;GAME.step(60*5);GAME.give('fig');GAME.step(30)"),
  ("boss_intro", "GAME.setNight(15);GAME.G.ghost=true;GAME.step(60*1.5)"),
  ("boss_pounce", "GAME.setNight(15);GAME.G.ghost=true;let i=0;while(!(GAME.G.beams.length&&GAME.G.beams[0].firing)&&i++<60*30)GAME.step(1)"),
  ("boss_rows", "GAME.setNight(15);GAME.G.ghost=true;let i=0;while(!GAME.G.items.some(o=>o.type==='thorns'&&o.y>40)&&i++<60*30)GAME.step(1)"),
  ("boss_rage", "GAME.setNight(15);GAME.G.ghost=true;GAME.step(60*20)"),
  ("dawn", "GAME.setNight(23);GAME.G.ghost=true;GAME.step(Math.round((GAME.G.nightLen-1.5)*60))"),
  ("clear", "GAME.setNight(6);GAME.clearNight();GAME.step(1);GAME.step(40)"),
  ("dead_anim", "GAME.setNight(12);GAME.step(30);GAME.kill();GAME.step(25)"),
  ("dead", "GAME.setNight(12);GAME.step(30);GAME.kill();GAME.step(100)"),
  ("win", "GAME.setNight(30);GAME.win();GAME.step(60)"),
  ("paused", "GAME.setNight(4);GAME.step(120);GAME.pause()"),
]
async def main():
  os.makedirs(OUT, exist_ok=True)
  async with async_playwright() as p:
    b = await p.chromium.launch()
    pg = await b.new_page(viewport={"width": 400, "height": 720})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    for name, js in SCENES:
      await pg.goto("about:blank"); await pg.goto(URL + "#dev"); await pg.wait_for_timeout(500)
      await pg.evaluate("document.fonts.ready")
      await pg.evaluate(f"(()=>{{{js}}})()")
      await pg.evaluate("GAME.G.frozen=true;GAME.render(3.3)")
      await pg.locator("#game").screenshot(path=f"{OUT}/{name}.png")
    print("errors:", errs)
    await b.close()
asyncio.run(main())
