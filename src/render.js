// Everything drawn to the canvas. Logical coordinates are 120x213; the context is scaled by G.S.
import { G } from './state.js';
import { LW, LH, FLOOR, PY, PW, K, FONT, TUNE, NIGHTS, AUTHOR, MILESTONES, isStorm, rankFor } from './config.js';
import { TEXT } from './content.js';
import { SPR, GLOW, RUSH, bgFor, LEMUR_OFFSET } from './sprites.js';
import { isMuted, music } from './audio.js';

let ctx = null;
export function setContext(c) { ctx = c; }

// ---------------------------------------------------------------- primitives
export function txt(t, x, y, s, c = '#ffffff', align = 'center', shadow = true) {
  ctx.font = `${s}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (shadow) { const o = s >= 7 ? 1 : 0.5; ctx.fillStyle = K; ctx.fillText(t, x + o, y + o); }
  ctx.fillStyle = c;
  ctx.fillText(t, x, y);
}
export function textWidth(t, s) { ctx.font = `${s}px ${FONT}`; return ctx.measureText(t).width; }
const draw = (sp, x, y, sc = 1) => ctx.drawImage(sp, Math.round(x), Math.round(y), sp.width * sc, sp.height * sc);
const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
function box(x, y, w, h, fill, line = K) {
  rect(x + 1, y, w - 2, 1, line); rect(x + 1, y + h - 1, w - 2, 1, line);
  rect(x, y + 1, 1, h - 2, line); rect(x + w - 1, y + 1, 1, h - 2, line);
  rect(x + 1, y + 1, w - 2, h - 2, fill);
}
const blink = (t, hz) => Math.floor(t * hz) % 2 === 0;

// ---------------------------------------------------------------- scene
const FIREFLIES = Array.from({ length: 18 }, (_, i) => ({ x: (i * 37 + 11) % LW, y: 30 + ((i * 53) % 150), p: i * 0.9 }));
function fireflies(t) {
  for (const f of FIREFLIES) {
    const b = 0.25 + 0.75 * Math.max(0, Math.sin(t * 1.4 + f.p));
    ctx.fillStyle = `rgba(216,255,112,${b})`;
    ctx.fillRect(Math.round(f.x + Math.sin(t * 0.5 + f.p) * 4), Math.round(f.y + Math.cos(t * 0.4 + f.p) * 3), 1, 1);
  }
}
function rain(t) {
  ctx.fillStyle = 'rgba(170,200,255,0.35)';
  for (let i = 0; i < 46; i++) {
    const x = Math.round(((i * 29 + t * 50) % 140) - 10), y = Math.round((i * 53 + t * 230) % LH);
    ctx.fillRect(x, y, 1, 2); ctx.fillRect(x - 1, y + 2, 1, 2);
  }
}
function scene(t) {
  const storm = isStorm(G.night);
  draw(bgFor(G.night, storm, false), 0, 0);
  if (!storm) fireflies(t);
  if (!G.boss && G.state === 'play' && G.nightT > G.nightLen - TUNE.dawn) {
    const k = Math.min(1, (G.nightT - (G.nightLen - TUNE.dawn)) / 1.2);
    rect(0, 0, LW, LH, `rgba(255,170,120,${0.16 * k})`);
  }
  if (G.dayFlash > 0) { ctx.globalAlpha = Math.min(1, G.dayFlash / 0.4); draw(bgFor(1, false, true), 0, 0); ctx.globalAlpha = 1; }
}

// ---------------------------------------------------------------- actors
function drawLemur(t) {
  if (G.invuln > 0 && Math.floor(t * 14) % 2 && G.state === 'play') return;
  const frame = G.walkT > 0 && Math.floor(G.walkT * 8) % 2 ? 'B' : 'A';
  const sp = SPR['lemur' + frame + (G.facing < 0 ? 'L' : '')], bob = frame === 'B' ? -1 : 0;
  draw(sp, G.px + (G.facing < 0 ? LEMUR_OFFSET.left : LEMUR_OFFSET.right), PY + bob);
  const cx = G.px + PW / 2;
  if (G.shield > 0) {
    // a leaf umbrella held overhead
    const wob = Math.round(Math.sin(t * 6));
    draw(SPR.leaf, cx - 9, PY - 14 + wob);
    if (G.shield > 1) rect(cx + 6, PY - 13 + wob, 2, 2, '#d8ffd0');
  }
  if (G.reviveT > 0) {
    for (let k = 0; k < 12; k++) {
      const q = k * Math.PI / 6 + t;
      for (let d = 14; d < 30; d += 3) rect(Math.round(cx + Math.cos(q) * d), Math.round(PY + 9 + Math.sin(q) * d), 1, 1, 'rgba(255,220,90,0.8)');
    }
  }
}

function drawItems(t) {
  for (const o of G.items) {
    if (o.kind === 'pu') {
      const gl = GLOW[o.type], pulse = Math.sin(t * 5) > 0 ? 1 : 0;
      draw(gl, o.x + o.w / 2 - gl.width / 2, o.y + o.h / 2 - gl.height / 2 - pulse);
    }
    draw(SPR[o.type], o.x, o.y);
  }
}

function drawPounces(t) {
  for (const bm of G.beams) {
    if (!bm.firing) {
      rect(bm.x, 16, bm.w, FLOOR - 16, 'rgba(255,120,60,0.10)');
      for (let y = 18; y < FLOOR; y += 6) { rect(bm.x, y, 1, 3, '#ff8a4a'); rect(bm.x + bm.w - 1, y, 1, 3, '#ff8a4a'); }
      if (blink(t, 10)) txt('!', bm.x + bm.w / 2, FLOOR - 14, 9, '#ff8a4a');
      if (bm.t < 0.6) txt('POUNCE!', Math.max(16, Math.min(LW - 16, bm.x + bm.w / 2)), 58, 5, '#ffd23f');
    } else {
      rect(bm.x, 16, bm.w, FLOOR - 16, 'rgba(255,200,170,0.25)');
      const fl = Math.floor(t * 30) % 2;
      [3, 8, 13].forEach((dx) => { rect(bm.x + dx - 1, 16, 4, FLOOR - 16, fl ? '#ff8a6a' : '#ffb08a'); rect(bm.x + dx, 16, 2, FLOOR - 16, '#ffffff'); });
      rect(bm.x - 1, FLOOR - 2, bm.w + 2, 3, '#ffd23f');
    }
  }
}

function drawWarns(t) {
  for (const w of G.warns) {
    if (Math.floor(t * 12) % 2) continue;
    const cx = Math.round(w.x + w.w / 2);
    txt('!', cx, 24, 9, '#ffd23f');
    rect(cx - 2, 30, 5, 1, '#ffd23f'); rect(cx - 1, 31, 3, 1, '#ffd23f'); rect(cx, 32, 1, 1, '#ffd23f');
  }
}

function drawBoss(t) {
  const b = G.boss;
  if (!b) return;
  // the branch it prowls along
  rect(0, b.y + 23, LW, 4, K); rect(0, b.y + 24, LW, 2, '#5a3a24');
  if (b.phase === 'down' && Math.floor(t * 20) % 2) return;
  const jx = b.rage && Math.floor(t * 20) % 3 === 0 ? (Math.random() < 0.5 ? -1 : 1) : 0;
  const L = b.dir < 0 ? 'L' : '';
  const sp = b.flashT > 0 ? SPR['fossaFlash' + L] : b.rage && Math.floor(t * 6) % 2 ? SPR['fossaRage' + L] : SPR['fossa' + L];
  draw(sp, b.x + jx, b.y);
  if (b.phase === 'intro' && Math.floor(t * 4) % 2) rect(0, 0, LW, LH, 'rgba(255,90,40,0.12)');
}

// ---------------------------------------------------------------- HUD + banner
function drawHUD() {
  rect(0, 0, LW, 15, 'rgba(6,14,14,0.8)');
  txt('NIGHT ' + G.night, 3, 6, 7, '#ffffff', 'left');
  if (G.boss) txt('BOSS', 3, 12.5, 4, '#ff8a6a', 'left');
  else if (isStorm(G.night)) txt('STORM', 3, 12.5, 4, '#9ec8ff', 'left');
  draw(SPR.heart, 52, 3);
  box(60, 3, 57, 7, '#2a2020');
  const pct = Math.max(0, G.hp) / 100, col = pct > 0.6 ? '#2ecc55' : pct > 0.3 ? '#ffd23f' : '#ff4a4a';
  if (pct > 0) { rect(61, 4, Math.round(55 * pct), 5, col); rect(61, 4, Math.round(55 * pct), 1, 'rgba(255,255,255,0.45)'); }
  if (G.shield > 0) txt('SHIELD x' + G.shield, 61, 12.5, 4, '#8af07a', 'left');
  if (G.hasBeetle) draw(SPR.beetleMini, LW - 9, 8);
  if (G.boss) {
    rect(0, 15, LW, 5, 'rgba(6,14,14,0.85)');
    txt('HUNGER', 2, 17.6, 4, '#ffb08a', 'left', false);
    box(21, 15, 97, 5, '#2a2020');
    const hp = Math.max(0, G.boss.hp) / TUNE.bossHunger;
    if (hp > 0) rect(22, 16, Math.round(95 * hp), 3, G.boss.rage ? '#ff3b3b' : '#ffb08a');
  } else {
    const dawn = G.nightT > G.nightLen - TUNE.dawn;
    rect(0, 15, LW, 1, 'rgba(255,255,255,0.12)');
    rect(0, 15, Math.round(LW * Math.min(1, G.nightT / G.nightLen)), 1, dawn ? '#ffb07a' : '#d8ff70');
  }
}

function drawBanner() {
  const b = G.banner;
  if (!b) return;
  ctx.globalAlpha = Math.max(0, Math.min(1, b.t * 6, (b.life - b.t) * 4));
  const w = Math.min(LW - 4, Math.ceil(Math.max(textWidth(b.big, 8), textWidth(b.small, 4))) + 14), x = Math.round(LW / 2 - w / 2), y = 74;
  box(x, y, w, 24, b.bg, b.fg);
  txt(b.big, LW / 2, y + 9, 8, b.fg);
  txt(b.small, LW / 2, y + 18, 4, '#ffffff', 'center', false);
  ctx.globalAlpha = 1;
}

function soundToggles() {
  const m = isMuted();
  txt(m ? 'SOUND OFF' : 'SOUND ON', LW - 3, 5, 4, m ? '#7a8a8a' : '#ffffff', 'right', false);
  txt(music.on ? 'MUSIC ON' : 'MUSIC OFF', LW - 3, 11.5, 4, music.on ? '#ffffff' : '#7a8a8a', 'right', false);
}
function credit(y) { if (AUTHOR) txt('LEMUR NIGHT BY ' + AUTHOR, LW / 2, y, 4, '#6a8a88', 'center', false); }

// ---------------------------------------------------------------- screens
function drawTitle(t) {
  draw(bgFor(1, false, false), 0, 0);
  fireflies(t);
  txt(TEXT.title, LW / 2, 26, 20, '#ffd23f');
  txt(TEXT.title2, LW / 2, 44, 11, '#ffffff');
  txt(TEXT.tagline[0], LW / 2, 54, 4, '#bfe0d0', 'center', false);
  txt(TEXT.tagline[1], LW / 2, 60, 4, '#bfe0d0', 'center', false);
  txt(TEXT.dodge, LW / 2, 70, 4, '#ff9a7a', 'center', false);
  const bob = (k) => Math.round(Math.sin(t * 1.8 + k) * 1.5);
  let x = 6;
  ['coconut', 'branch', 'owl', 'nest'].forEach((k, i) => { const sp = SPR[k]; draw(sp, x, 108 - sp.height + bob(i)); x += sp.width + 6; });
  txt(TEXT.grab, LW / 2, 118, 4, '#8af07a', 'center', false);
  x = 11;
  ['fig', 'leaf', 'cricket', 'beetle'].forEach((k, i) => {
    const sp = SPR[k], gl = GLOW[k], y = 149 - sp.height + bob(i + 4);
    draw(gl, x + sp.width / 2 - gl.width / 2, y + sp.height / 2 - gl.height / 2);
    draw(sp, x, y);
    x += sp.width + 9;
  });
  if (blink(t, 2)) txt(G.touch ? 'TAP TO START' : 'PRESS SPACE', LW / 2, 165, 7, '#ffffff');
  draw(SPR.lemurA, 51 + LEMUR_OFFSET.right, PY);
  txt(G.touch ? 'DRAG ANYWHERE TO MOVE' : 'ARROWS / A D OR DRAG', LW / 2, 206, 4, '#ffffff', 'center', false);
  txt(G.best > NIGHTS ? 'BEST: LEGEND' : G.best ? 'BEST: NIGHT ' + G.best : '30 NIGHTS. GOOD LUCK.', 3, 5, 4, '#ffd23f', 'left', false);
  soundToggles();
}

function drawClear(t) {
  rect(0, 0, LW, LH, 'rgba(8,18,18,0.72)');
  txt(TEXT.survived(G.night), LW / 2, 30, 6, '#2ecc55');
  // victory dance on the branch
  const hop = Math.round(Math.abs(Math.sin(G.clearT * 7)) * 7), turn = Math.floor(G.clearT * 3.5) % 2;
  const sp = SPR[(turn ? 'lemurB' : 'lemurA') + (turn ? 'L' : '')];
  draw(sp, LW / 2 - (turn ? 12 : 15) * 2, 62 - hop, 2);
  rect(LW / 2 - 26, 98, 52, 3, K); rect(LW / 2 - 26, 99, 52, 1, '#7a5034');
  if (blink(G.clearT, 3)) { draw(SPR.note, LW / 2 - 30, 52 - hop / 2); draw(SPR.note, LW / 2 + 24, 46 + hop / 2); }
  if (G.clearT > 0.15) txt(TEXT.next(G.night + 1), LW / 2, 115, 8, '#ffd23f');
  if (MILESTONES[G.night]) txt(MILESTONES[G.night], LW / 2, 130, 4, '#bff3ff', 'center', false);
  if (G.lastHeal > 0) txt('+' + G.lastHeal + ' HP (NAP)', LW / 2, 142, 4, '#8af5a8', 'center', false);
  if (isStorm(G.night + 1)) txt('STORM INCOMING', LW / 2, 153, 4, '#9ec8ff', 'center', false);
  if (G.clearT > 0.6 && blink(G.clearT, 3)) txt(G.touch ? 'TAP TO SKIP' : 'SPACE TO SKIP', LW / 2, 172, 4, '#ffffff', 'center', false);
}

function card(y, h, line) { box(8, y, 104, h, '#16282a', K); rect(10, y + 2, 100, 1, line); rect(10, y + h - 3, 100, 1, line); }

function drawDead(t) {
  rect(0, 0, LW, LH, `rgba(6,10,14,${0.8 * Math.min(1, G.deadT / 0.6)})`);
  if (G.deadT < 0.9) {
    draw(SPR.sleep, G.px - 2, PY + 5);
    if (G.deadT > 0.3) txt('Z', G.px + 16, PY - 2 - G.deadT * 8, 5, '#bfe0ff');
    return;
  }
  card(18, 184, '#ff8a6a');
  txt(TEXT.gameOver[0], LW / 2, 32, 10, '#ff8a6a');
  draw(SPR.sleep, LW / 2 - 22, 50, 2);
  txt('Z', LW / 2 + 22, 48 + Math.round(Math.sin(t * 2) * 2), 6, '#bfe0ff');
  txt('z', LW / 2 + 29, 42 + Math.round(Math.sin(t * 2 + 1) * 2), 5, '#bfe0ff');
  txt('MADE IT TO', LW / 2, 86, 4, '#bfe0d0', 'center', false);
  txt('NIGHT ' + G.night, LW / 2, 98, 12, '#ffffff');
  txt('RANK', LW / 2, 113, 4, '#bfe0d0', 'center', false);
  txt(rankFor(G.night, false), LW / 2, 121, 6, '#ffd23f');
  txt('TAKEN OUT BY:', LW / 2, 134, 4, '#bfe0d0', 'center', false);
  txt(G.lastKiller, LW / 2, 142, 4, '#ffb08a', 'center', false);
  txt(G.newBest ? 'NEW BEST!' : 'BEST: ' + (G.best > NIGHTS ? 'LEGEND' : 'NIGHT ' + G.best), LW / 2, 155, 4, G.newBest ? '#2ecc55' : '#ffffff', 'center', false);
  box(28, 163, 64, 14, '#2ecc55');
  txt('PLAY AGAIN', LW / 2, 170.5, 6, '#ffffff');
  txt('SCREENSHOT & SHARE YOUR NIGHT', LW / 2, 190, 4, '#6a8a88', 'center', false);
  credit(207);
  soundToggles();
}

function drawWin(t) {
  rect(0, 0, LW, LH, 'rgba(8,18,18,0.85)');
  if (Math.random() < 0.6) G.parts.push({ x: Math.random() * LW, y: 0, vx: 0, vy: 20, life: 2.5, age: 0, c: ['#ffd23f', '#fff3b0', '#d8ff70'][Math.random() * 3 | 0] });
  for (const p of G.parts) rect(Math.round(p.x), Math.round(p.y), 1, 1, p.c);
  card(18, 184, '#ffd23f');
  txt(TEXT.won[0], LW / 2, 32, 10, '#ffffff');
  txt(TEXT.won[1], LW / 2, 44, 10, '#ffffff');
  draw(SPR.moon, LW / 2 - 25, 53 + Math.round(Math.sin(t * 2)), 3);
  txt('RANK', LW / 2, 112, 4, '#bfe0d0', 'center', false);
  const rank = rankFor(NIGHTS, true).split(' ');
  txt(rank[0], LW / 2, 122, 9, '#ffd23f');
  txt(rank[1], LW / 2, 133, 9, '#ffd23f');
  txt('HP LEFT: ' + G.wonHp + '%', LW / 2, 146, 4, '#8af5a8', 'center', false);
  box(28, 160, 64, 14, '#2ecc55');
  txt('PLAY AGAIN', LW / 2, 167.5, 6, '#ffffff');
  txt('SCREENSHOT & FLEX IT', LW / 2, 190, 4, '#6a8a88', 'center', false);
  credit(207);
  soundToggles();
}

// ---------------------------------------------------------------- frame
export function render(t) {
  const S = G.S;
  ctx.setTransform(S, 0, 0, S, 0, 0);
  ctx.imageSmoothingEnabled = false;
  rect(0, 0, LW, LH, '#06100e');
  if (G.state === 'title') return drawTitle(t);

  const sx = G.shake > 0 ? Math.round((Math.random() * 2 - 1) * 1.5) : 0, sy = G.shake > 0 ? Math.round((Math.random() * 2 - 1) * 1.5) : 0;
  ctx.setTransform(S, 0, 0, S, sx * S, sy * S);
  scene(t);
  drawPounces(t);
  drawBoss(t);
  drawItems(t);
  drawWarns(t);
  if (G.state !== 'dead') drawLemur(t);
  if (isStorm(G.night) && G.state === 'play') rain(t);
  for (const p of G.parts) { ctx.globalAlpha = Math.max(0, 1 - p.age / p.life); rect(Math.round(p.x), Math.round(p.y), 1, 1, p.c); }
  ctx.globalAlpha = 1;
  if (G.slowT > 0) { ctx.globalAlpha = Math.min(1, G.slowT * 2); draw(RUSH, 0, 0); ctx.globalAlpha = 1; }
  for (const f of G.floats) { ctx.globalAlpha = Math.max(0, 1 - f.age / f.life); txt(f.t, f.x, f.y, 6, f.c); }
  ctx.globalAlpha = 1;
  if (G.flash > 0) rect(0, 0, LW, LH, `rgba(255,60,40,${G.flash * 0.5})`);

  ctx.setTransform(S, 0, 0, S, 0, 0);
  drawHUD();
  drawBanner();
  if (G.paused) {
    rect(0, 0, LW, LH, 'rgba(6,14,14,0.7)');
    txt('PAUSED', LW / 2, 96, 11, '#ffd23f');
    txt(G.touch ? 'TAP TO RESUME' : 'PRESS P TO RESUME', LW / 2, 112, 4, '#ffffff');
  }
  if (G.state === 'clear') drawClear(t);
  if (G.state === 'dead') drawDead(t);
  if (G.state === 'win') drawWin(t);
}
