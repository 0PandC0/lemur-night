"""Main QA pass: fairness per night, power-ups, boss, mechanics, end-of-night clearing, text fit, real input.

    python3 -m http.server 8765 &
    python3 tools/qa.py            -> prints a summary, writes tools/qa_result.json, exits 1 on any failure
"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
from common import open_game

NIGHT_SIM = r"""(reps) => {
const G = GAME.G, LW = 120, PY = 180;
function rowGap() {
  const spans = [];
  for (const o of G.items) {
    if (o.kind !== 'hz' || o.blocked) continue;
    const h = o.def.hit, y0 = o.y + h[1], y1 = y0 + h[3];
    if (y1 > PY + 2 && y0 < PY + 18) spans.push([o.x + h[0], o.x + h[0] + h[2]]);
  }
  for (const b of G.beams) if (b.firing) spans.push([b.x, b.x + b.w]);
  spans.sort((a, b) => a[0] - b[0]);
  let cur = 0, gap = 0;
  for (const [a, b] of spans) { gap = Math.max(gap, a - cur); cur = Math.max(cur, b); }
  return Math.max(gap, LW - cur);
}
const out = [];
for (let r = 0; r < reps; r++) for (let n = 1; n <= 30; n++) {
  GAME.setNight(n); G.hp = 1e9;
  const types = {}, pus = []; let maxHaz = 0, walls = 0, minGap = 999, steps = 0, atk = {}, rage = false, pounces = 0;
  while (G.state === 'play' && G.night === n && steps < 60 * 90) {
    G.hp = 1e9; GAME.step(1); steps++;
    for (const o of G.items) { if (o._s) continue; o._s = 1; if (o.kind === 'hz') types[o.type] = (types[o.type] || 0) + 1; else pus.push(o); }
    for (const o of pus) if (o.y + o.h >= PY) o._reach = 1;
    maxHaz = Math.max(maxHaz, G.items.filter((o) => o.kind === 'hz').length);
    const g = rowGap(); minGap = Math.min(minGap, g); if (g < 14) walls++;
    if (G.boss) {
      if (G.boss.atk && !G.boss.atk._c) { G.boss.atk._c = 1; atk[G.boss.atk.type] = (atk[G.boss.atk.type] || 0) + 1; }
      if (G.boss.rage) rage = true;
      for (const b of G.beams) if (!b._c) { b._c = 1; pounces++; }
    }
  }
  const row = { n, rep: r, secs: +(steps / 60).toFixed(1), types, pu: pus.length, puReached: pus.filter((o) => o._reach).length, maxHaz, wallFrames: walls, minGap: Math.round(minGap), ended: G.state };
  if (n === 15) Object.assign(row, { bossAttacks: atk, rage, pounces });
  out.push(row);
}
return out;
}"""

CLEAR_CHECK = r"""(withFig) => {
// collisions off: does anything still sit above the lemur when a night ends? (it must not)
const G = GAME.G, PY = 180; let leftovers = 0, holds = [], nights = 0;
G.ghost = true;
for (let rep = 0; rep < 2; rep++) for (let n = 1; n <= 30; n++) {
  if (n === 15) continue;
  GAME.setNight(n); const len = G.nightLen; let steps = 0, gave = false;
  while (G.state === 'play' && steps < 3600) {
    if (withFig && !gave && steps >= Math.round((len - 1.5) * 60)) { GAME.give('fig'); gave = true; }
    const ts = G.slowT > 0 ? 0.4 : 1;
    const left = G.items.filter((o) => o.kind === 'hz' && !o.blocked && !o.dead && o.y + o.vy * ts / 60 < PY + 18).length;
    GAME.step(1); steps++;
    if (G.state !== 'play') leftovers += left;
  }
  holds.push(steps / 60 - len); nights++;
}
G.ghost = false;
return { nights, leftovers, maxHold: +Math.max(...holds).toFixed(2), avgHold: +(holds.reduce((a, b) => a + b, 0) / holds.length).toFixed(2) };
}"""

MECHANICS = r"""() => {
const G = GAME.G, M = {};
const dropOn = (type) => { G.items.length = 0; return GAME.drop(type, G.px - 1, 172); };
GAME.start(); GAME.step(5); GAME.setPx(50);
GAME.give('leaf'); M.shieldGiven = G.shield;
dropOn('coconut'); GAME.step(3); M.shieldAfterHit = G.shield; M.hpAfterBlock = G.hp;
GAME.step(40); G.shield = 0;
dropOn('coconut'); GAME.step(3); M.hpAfterHit = G.hp; M.killerName = G.lastKiller;
G.items.length = 0; G.hp = 50; GAME.give('cricket'); M.hpAfterSnack = G.hp;
GAME.give('fig'); M.slowT = G.slowT;
GAME.give('beetle'); M.hasBeetle = G.hasBeetle; G.hp = 5; G.invuln = 0; G.slowT = 0;
dropOn('coconut'); GAME.step(3);
M.revive = { state: G.state, hp: G.hp, hasBeetle: G.hasBeetle, beetleUsed: G.beetleUsed };
GAME.kill(); M.deadState = G.state;
GAME.step(100); GAME.primary();
M.playAgain = { state: G.state, night: G.night, hp: G.hp, shield: G.shield, hasBeetle: G.hasBeetle, beetleUsed: G.beetleUsed, slowT: G.slowT, items: G.items.length, boss: !!G.boss };
GAME.start(); GAME.clearNight(); GAME.step(1); M.restAtFull = G.lastHeal; M.afterClear = G.state;
GAME.step(60 * 3); M.nextNight = G.night;
GAME.setNight(15); for (let i = 0; i < 200; i++) { G.hp = 1e9; GAME.step(1); }
const before = G.boss.hp; GAME.give('cricket'); M.bossHungerDrop = +(before - G.boss.hp).toFixed(1);
M.stormNights = [];
for (let n = 1; n <= 30; n++) { GAME.setNight(n); if (G.banner && G.banner.big === 'STORM NIGHT') M.stormNights.push(n); }
M.tracks = {};
for (const n of [3, 5, 15]) { GAME.setNight(n); G.hp = 1e9; GAME.step(n === 15 ? 60 * 4 : 2); M.tracks[n] = GAME.music.track; }
GAME.setNight(15); G.hp = 1e9; G.boss.hp = 51; GAME.step(60 * 4); G.hp = 1e9; M.tracks.rage = GAME.music.track;
G.boss.hp = 0.5; for (let i = 0; i < 60 * 4; i++) { G.hp = 1e9; GAME.step(1); }
M.afterBoss = { state: G.state, night: G.night };
GAME.setNight(30); GAME.win(); M.winState = G.state; M.best = G.best;
return M;
}"""

TEXT_FIT = r"""() => {
const font = '"Silkscreen"', c = document.createElement('canvas').getContext('2d'), LW = 120, bad = [];
const W = (t, s) => { c.font = `${s}px ${font}`; return c.measureText(t).width; };
const chk = (t, s, max, where) => { const w = W(t, s); if (w > max) bad.push({ where, t, size: s, width: +w.toFixed(1), max }); };
const banners = [['!! DANGER !!', 'A FOSSA IS HUNTING'], ['BOSS FIGHT', 'SURVIVE UNTIL IT GIVES UP'], ['FURIOUS!', 'THE WHOLE FOREST JOINS IN'],
  ['THE FOSSA GAVE UP', '+30 HP'], ['FINAL NIGHT', 'ONE MORE SUNRISE'], ['STORM NIGHT', 'RAIN AND WIND - WATCH OUT'],
  ['NIGHT 1', 'STAY ALERT'], ['STILL GOING!', 'THE GOLDEN BEETLE SAVED YOU'], ['RIPE FIG!', 'SUGAR RUSH - TIME SLOWS'], ['LEAF SHIELD!', 'BLOCKS 2 HITS'],
  ['CRUNCHY SNACK', '+30 HP'], ['GOLDEN BEETLE!', 'EXTRA LIFE STORED']];
banners.forEach(([b, s]) => { chk(b, 8, LW - 18, 'banner'); chk(s, 4, LW - 18, 'banner small'); });
Object.values(GAME.HAZARDS).forEach((h) => chk(h.name, 4, 98, 'taken out by'));
['TINY SNACK', 'BRANCH HOPPER', 'NIGHT RUNNER', 'CANOPY SCOUT', 'FOREST LEGEND'].forEach((r) => chk(r, 6, 98, 'rank'));
['MOONLIGHT', 'LEGEND'].forEach((r) => chk(r, 9, 98, 'win rank'));
['TEN NIGHTS DOWN', 'YOU OUTRAN THE FOSSA', 'TWENTY NIGHTS DOWN', 'FIVE TO GO', 'ONE LAST NIGHT', '+4 HP (NAP)', 'STORM INCOMING', 'SPACE TO SKIP'].forEach((t) => chk(t, 4, LW - 6, 'clear screen'));
chk('ON TO NIGHT 30!', 8, LW - 4, 'clear'); chk('NIGHT 29 SURVIVED', 6, LW - 4, 'clear');
chk('NIGHT 30', 7, 47, 'HUD night'); chk('SHIELD x2', 4, 44, 'HUD shield'); chk('HUNGER', 4, 18, 'HUD hunger');
chk('LEMUR', 20, LW - 4, 'title'); chk('FEARS EVERYTHING.', 4, LW - 4, 'title'); chk('DRAG ANYWHERE TO MOVE', 4, LW - 4, 'title'); chk('PRESS SPACE', 7, LW - 4, 'title');
chk('30 NIGHTS. GOOD LUCK.', 4, LW - 46, 'title best vs sound toggle'); chk('BEST: NIGHT 29', 4, LW - 46, 'title best');
chk('LIGHTS OUT', 10, 98, 'dead'); chk('NIGHT 30', 12, 98, 'dead'); chk('SCREENSHOT & SHARE YOUR NIGHT', 4, 100, 'dead'); chk('PLAY AGAIN', 6, 60, 'button');
chk('30 NIGHTS', 10, 98, 'win'); chk('SURVIVED', 10, 98, 'win'); chk('HP LEFT: 100%', 4, 98, 'win');
chk('PAUSED', 11, LW - 4, 'pause'); chk('PRESS P TO RESUME', 4, LW - 4, 'pause'); chk('POUNCE!', 5, 34, 'pounce');
chk('MUSIC OFF', 4, 40, 'toggle'); chk('SOUND OFF', 4, 40, 'toggle');
return bad;
}"""


async def real_input(page):
    """Drive the game with actual keyboard/pointer events, the way a player would."""
    r = {}
    g = lambda expr: page.evaluate(expr)
    await page.keyboard.press("Space"); await page.wait_for_timeout(200)
    r["spaceStarts"] = await g("GAME.G.state")
    x0 = await g("GAME.G.px")
    await page.keyboard.down("ArrowRight"); await page.wait_for_timeout(400); await page.keyboard.up("ArrowRight")
    r["arrowRightMoves"] = round(await g("GAME.G.px") - x0, 1)
    x0 = await g("GAME.G.px")
    await page.keyboard.down("a"); await page.wait_for_timeout(400); await page.keyboard.up("a")
    r["aMovesLeft"] = round(await g("GAME.G.px") - x0, 1)
    box = await page.locator("#game").bounding_box()
    cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] * 0.7
    x0 = await g("GAME.G.px")
    await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx - box["width"] * 0.25, cy, steps=8)
    await page.wait_for_timeout(100); await page.mouse.up()
    r["dragMoves"] = round(await g("GAME.G.px") - x0, 1)
    await page.mouse.click(box["x"] + box["width"] * 0.94, box["y"] + box["height"] * 0.03); await page.wait_for_timeout(50)
    r["pauseButtonTap"] = await g("GAME.G.paused")
    await page.mouse.click(cx, cy); await page.wait_for_timeout(50)
    r["tapResumes"] = await g("GAME.G.paused")
    await page.keyboard.press("p"); r["pPauses"] = await g("GAME.G.paused")
    await page.keyboard.press("p"); r["pResumes"] = await g("GAME.G.paused")
    m0 = await g("GAME.music.on"); await page.keyboard.press("n"); r["nTogglesMusic"] = m0 != await g("GAME.music.on"); await page.keyboard.press("n")
    await g("GAME.G.hp=1;GAME.kill()"); await page.wait_for_function("GAME.G.deadT > 1.4")
    r["deadScreen"] = await g("GAME.G.state")
    await page.mouse.click(cx, box["y"] + box["height"] * 0.8); await page.wait_for_timeout(100)
    r["clickPlaysAgain"] = await g("GAME.G.state")
    await g("GAME.G.hp=1;GAME.kill()"); await page.wait_for_timeout(300)
    mute0 = await page.evaluate("localStorage.getItem('lemur-muted')")
    await page.mouse.click(box["x"] + box["width"] * 0.9, box["y"] + box["height"] * 0.012)
    r["soundToggleClick"] = mute0 != await page.evaluate("localStorage.getItem('lemur-muted')")
    return r


def verdicts(res):
    """Turn raw results into pass/fail lines."""
    v = []
    nights = res["nights"]
    walls = sum(x["wallFrames"] for x in nights)
    pu, reached = sum(x["pu"] for x in nights), sum(x["puReached"] for x in nights)
    v.append(("no impossible walls (row gap < 14px)", walls == 0, f"{walls} frames"))
    v.append(("every power-up reaches the lemur", pu == reached, f"{reached}/{pu}"))
    v.append(("all 30 nights end normally", all(x["ended"] in ("clear", "win") for x in nights), ""))
    boss = [x for x in nights if x["n"] == 15]
    v.append(("boss uses all 4 attacks + rage", all(len(b["bossAttacks"]) == 4 and b["rage"] for b in boss), str([b["bossAttacks"] for b in boss])))
    for k, c in res["clear"].items():
        v.append((f"nothing left above the lemur at dawn ({k})", c["leftovers"] == 0, str(c)))
    m = res["mech"]
    v.append(("leaf shield blocks a hit", m["shieldGiven"] == 2 and m["shieldAfterHit"] == 1 and m["hpAfterBlock"] == 100, ""))
    v.append(("a hit costs HP and names the killer", m["hpAfterHit"] < 100 and m["killerName"] == "A FALLING COCONUT", f'{m["hpAfterHit"]} {m["killerName"]}'))
    v.append(("snack heals +30, fig slows", m["hpAfterSnack"] == 80 and m["slowT"] > 0, f'{m["hpAfterSnack"]} {m["slowT"]}'))
    v.append(("golden beetle revives once", m["revive"] == {"state": "play", "hp": 45, "hasBeetle": False, "beetleUsed": True}, str(m["revive"])))
    v.append(("play again fully resets", m["playAgain"] == {"state": "play", "night": 1, "hp": 100, "shield": 0, "hasBeetle": False, "beetleUsed": False, "slowT": 0, "items": 0, "boss": False}, str(m["playAgain"])))
    v.append(("night clear -> next night", m["afterClear"] == "clear" and m["nextNight"] == 2, ""))
    v.append(("power-up cuts boss hunger", m["bossHungerDrop"] >= 12, str(m["bossHungerDrop"])))
    v.append(("storm nights 5,10,20,25 (+30 final)", m["stormNights"] == [5, 10, 20, 25], str(m["stormNights"])))
    v.append(("music follows the night (calm/storm/hunt/fury)", m["tracks"] == {"3": "calm", "5": "storm", "15": "hunt", "rage": "fury"}, str(m["tracks"])))
    v.append(("beating the fossa -> clear", m["afterBoss"]["state"] == "clear", str(m["afterBoss"])))
    v.append(("night 30 -> win screen", m["winState"] == "win", ""))
    v.append(("all text fits", not res["textOverflow"], str(res["textOverflow"])))
    i = res["input"]
    v.append(("real keyboard/mouse/touch input works", i["spaceStarts"] == "play" and i["arrowRightMoves"] > 10 and i["aMovesLeft"] < -10 and i["dragMoves"] < -10
              and i["pauseButtonTap"] == "paused" and i["tapResumes"] is None and i["pPauses"] == "paused" and i["pResumes"] is None and i["nTogglesMusic"] and i["deadScreen"] == "dead" and i["clickPlaysAgain"] == "play" and i["soundToggleClick"], str(i)))
    v.append(("no console / page errors", not res["errors"], str(res["errors"][:3])))
    return v


async def main():
    reps = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page, errors = await open_game(b, viewport={"width": 400, "height": 760})
        res = {"nights": await page.evaluate(NIGHT_SIM, reps)}
        res["clear"] = {"no fig": await page.evaluate(CLEAR_CHECK, False), "late fig": await page.evaluate(CLEAR_CHECK, True)}
        res["mech"] = await page.evaluate(MECHANICS)
        res["textOverflow"] = await page.evaluate(TEXT_FIT)
        page2, errors2 = await open_game(b, viewport={"width": 400, "height": 760}, has_touch=False)
        res["input"] = await real_input(page2)
        res["errors"] = errors + errors2
        await b.close()
    json.dump(res, open(os.path.join(os.path.dirname(__file__), "qa_result.json"), "w"), indent=1)
    v = verdicts(res)
    for name, ok, detail in v:
        print(("PASS " if ok else "FAIL ") + name + ("" if ok else "  -> " + detail))
    print(f"\n{sum(ok for _, ok, _ in v)}/{len(v)} checks passed")
    sys.exit(0 if all(ok for _, ok, _ in v) else 1)

if __name__ == "__main__":
    asyncio.run(main())
