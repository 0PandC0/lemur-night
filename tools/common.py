"""Shared Playwright setup for the QA scripts. Serve the repo first:  python3 -m http.server 8765"""
import os

URL = os.environ.get("LEMUR_URL", "http://localhost:8765/index.html")


async def open_game(browser, **page_kwargs):
    """Open the game with test hooks (#dev), wait for the font, return (page, errors)."""
    page = await browser.new_page(**page_kwargs)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    await page.goto("about:blank")
    await page.goto(URL + "#dev")
    await page.wait_for_function("window.GAME !== undefined")
    await page.evaluate("document.fonts.ready")
    return page, errors
