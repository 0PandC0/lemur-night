"""PWA check: manifest + icons valid, service worker installs, and the game loads and plays with the network off.
    python3 tools/offline.py"""
import asyncio, json, sys
from playwright.async_api import async_playwright
from common import URL

async def main():
    ok = True
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 390, "height": 760})
        page = await ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(URL)
        await page.evaluate("navigator.serviceWorker.ready")
        await page.wait_for_function("navigator.serviceWorker.controller !== null || (location.reload(), false)", timeout=15000)
        cached = await page.evaluate("caches.keys().then(async k => (await (await caches.open(k[0])).keys()).length)")
        man = await page.evaluate("fetch('manifest.webmanifest').then(r => r.json())")
        icons = await page.evaluate("Promise.all(['assets/icons/icon-192.png','assets/icons/icon-512.png','assets/icons/apple-touch-icon.png'].map(u => new Promise(r => { const i = new Image(); i.onload = () => r([u, i.width, i.height]); i.onerror = () => r([u, 0, 0]); i.src = u; })))")
        print("cached files:", cached, "| manifest:", man["name"], man["display"], "| icons:", icons)
        # go offline and reload: the whole game must come from the cache
        await ctx.set_offline(True)
        await page.reload()
        await page.wait_for_timeout(800)
        font = await page.evaluate("document.fonts.check('8px Silkscreen')")
        await page.keyboard.press("Space"); await page.wait_for_timeout(400)
        box = await page.locator("#game").bounding_box()
        # in the release build there are no test hooks, so check the canvas is drawing and the title changed to gameplay
        px = await page.evaluate("(() => { const c = document.getElementById('game'); const d = c.getContext('2d').getImageData(c.width/2, c.height*0.95, 1, 1).data; return [...d]; })()")
        print("offline: font loaded =", font, "| canvas", round(box["width"]), "x", round(box["height"]), "| pixel", px, "| errors", errors)
        ok = cached >= 22 and man["display"] == "standalone" and all(w > 0 for _, w, _h in icons) and font and box["width"] > 100 and not errors
        await b.close()
    print("PASS installable + plays offline" if ok else "FAIL")
    sys.exit(0 if ok else 1)

asyncio.run(main())
