"""Save the three README screenshots into docs/.   python3 tools/screens_docs.py"""
import asyncio, os
from playwright.async_api import async_playwright
from common import open_game
DOCS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs")
SHOTS = {
    "title": "GAME.G.touch=false",
    "night": "GAME.setNight(16);GAME.G.ghost=true;GAME.step(60*9);GAME.G.ghost=false",
    "boss": "GAME.setNight(15);GAME.G.ghost=true;let i=0;while(!(GAME.G.beams.length&&!GAME.G.beams[0].firing&&GAME.G.beams[0].t>0.3)&&i++<60*30)GAME.step(1);GAME.G.ghost=false",
}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, js in SHOTS.items():
            page, errors = await open_game(b, viewport={"width": 300, "height": 540}, device_scale_factor=2)
            await page.evaluate(f"(()=>{{{js}}})()")
            await page.evaluate("GAME.G.frozen=true;GAME.render(2.2)")
            await page.locator("#game").screenshot(path=f"{DOCS}/{name}.png")
            await page.close()
            print(name, errors)
        await b.close()
asyncio.run(main())
