"""Render the app icons into assets/icons/ (needs the local server running)."""
import asyncio, base64, os
from playwright.async_api import async_playwright
from common import URL
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "icons")
ICONS = {"icon-512.png": (512, 12), "icon-192.png": (192, 5), "apple-touch-icon.png": (180, 5), "favicon-32.png": (32, 1)}
async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await pg.goto(URL.replace("index.html", "tools/icons.html")); await pg.wait_for_function("window.ready")
        for name, (size, scale) in ICONS.items():
            d = await pg.evaluate(f"icon({size},{scale})")
            open(os.path.join(OUT, name), "wb").write(base64.b64decode(d.split(",", 1)[1]))
            print(name)
        await b.close()
asyncio.run(main())
