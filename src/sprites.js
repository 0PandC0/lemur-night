// All pixel art, generated in code at startup (no image files).
import { K, LW, LH, FLOOR } from './config.js';
import { make, flip } from './pixel.js';

export const SPR = {};

// ---------------------------------------------------------------- the lemur
// Front-facing, big-eyed and happy, arms out, with a big bushy tail.
// The sprite is 27 px wide: the tail hangs off the left and the waving arms stick out both sides.
const LEMUR_TOP = [
  '.......KKK.........KKK.',
  '......KeFK.KKKKKKK.KFeK',
  '......KeFFFFFFCFFFFFFeK',
  '......KFFFFFFCCCFFFFFFK',
  '......KFWEEFFFCFFFWEEFK',
  '......KFEEEFFFCFFFEEEFK',
  '......KFEEEFFCPCFFEEEFK',
  '......KFFFFCCMMMCCFFFFK',
  '.......KFFCCCMTMCCCFFK.',
  '........KFCCCCCCCCCFK..',
  '.......KFCCCCCCCCCCCFK.',
  '.......KFCCCCCCCCCCCFK.',
  '.......KFCCCCCCCCCCCFK.',
  '.......KFFCCCCCCCCCFFK.',
  '........KFFCCCCCCCFFK..',
  '........KFFFFFFFFFFFK..',
];
const LEGS_A = ['........KFFK.....KFFK..', '........KKKK.....KKKK..'];
const LEGS_B = ['.......KFFK.......KFFK.', '.......KKKK.......KKKK.'];
export const LEMUR_PAL = {
  K, F: '#b07a3c', f: '#7a4a22', C: '#f0dcac', E: '#1a120c', W: '#ffffff', P: '#e88f98',
  e: '#6a3a22', M: '#3a1a14', T: '#e06a7a',
};
/** Where to draw the 23 px sprite so its body lines up with the lemur's 17 px box (tail side differs). */
export const LEMUR_OFFSET = { right: -6, left: -4 };

function lemur(legs) {
  return make(27, 18, (p) => {
    const { rect, ell } = p;
    // big bushy tail behind the lower left, with a curl
    ell(4, 12, 4, 5, K); ell(4, 12, 3, 4, LEMUR_PAL.F); ell(4, 13, 2, 2, '#9a6230'); ell(3, 12, 1, 1, LEMUR_PAL.F); rect(2, 9, 2, 1, '#d8a868');
    // arms out wide and waving, cream hands
    const arm = (pts) => {
      pts.forEach(([x, y]) => rect(x - 1, y - 1, 3, 3, K));
      pts.forEach(([x, y], i) => rect(x, y, 1, 1, i >= pts.length - 2 ? LEMUR_PAL.C : LEMUR_PAL.F));
    };
    arm([[8, 10], [7, 10], [6, 9], [5, 8], [4, 7], [3, 6]]);
    arm([[20, 10], [21, 10], [22, 9], [23, 8], [24, 7], [25, 6]]);
    p.map(0, 0, LEMUR_TOP.concat(legs).map((r) => r + '....'), LEMUR_PAL);
  });
}
SPR.lemurA = lemur(LEGS_A);
SPR.lemurB = lemur(LEGS_B);
SPR.lemurAL = flip(SPR.lemurA);
SPR.lemurBL = flip(SPR.lemurB);

/** Curled up asleep: the "game over" pose. */
SPR.sleep = make(22, 13, (p) => {
  const { rect, blob, ell } = p;
  blob(11, 8, 9, 4, LEMUR_PAL.F);
  ell(10, 9, 6, 2, LEMUR_PAL.C);
  // tail wrapped around the front
  for (let x = 3; x <= 19; x++) { rect(x, 12, 1, 1, K); rect(x, 11, 1, 1, LEMUR_PAL.f); }
  rect(2, 10, 1, 2, K); rect(20, 10, 1, 2, K);
  // head + ear
  blob(16, 5, 4, 3, LEMUR_PAL.F);
  rect(17, 1, 2, 1, K); rect(16, 2, 1, 1, K); rect(19, 2, 1, 1, K); rect(17, 2, 2, 1, LEMUR_PAL.P);
  // closed eye and nose
  rect(15, 5, 2, 1, K); rect(20, 6, 1, 1, LEMUR_PAL.P);
});

// ---------------------------------------------------------------- small icons
SPR.heart = make(7, 7, (p) => p.map(0, 0,
  ['.KK.KK.', 'KRRKRRK', 'KRWRRRK', 'KRRRRRK', '.KRRRK.', '..KRK..', '...K...'],
  { K, R: '#ff7a4a', W: '#ffd2b8' }));

// ---------------------------------------------------------------- falling dangers
SPR.coconut = make(13, 13, (p) => {
  const { rect, blob } = p;
  blob(6, 6, 5, 5, '#7a4a26');
  [[3, 3], [8, 2], [9, 7], [4, 9], [6, 5]].forEach(([x, y]) => rect(x, y, 2, 1, '#5a3418'));
  rect(3, 2, 2, 1, '#a8703e'); rect(2, 3, 1, 2, '#a8703e');
  // the three "eyes" of a coconut
  rect(5, 8, 1, 1, '#2a160a'); rect(7, 8, 1, 1, '#2a160a'); rect(6, 10, 1, 1, '#2a160a');
});

SPR.branch = make(30, 12, (p) => {
  const { rect, ell } = p;
  // leaves first so the stick sits on top
  const leaf = (cx, cy, rx, ry) => { ell(cx, cy, rx + 1, ry + 1, K); ell(cx, cy, rx, ry, '#3f9a3a'); rect(cx - rx + 1, cy, rx * 2 - 1, 1, '#6cc25a'); };
  leaf(8, 3, 4, 2); leaf(21, 9, 4, 2); leaf(14, 2, 2, 1);
  for (let x = 1; x <= 27; x++) {
    const y = Math.round(7 - x * 0.12);
    rect(x, y - 2, 1, 4, K); rect(x, y - 1, 1, 2, '#7a4a26'); if (x % 5 === 0) rect(x, y - 1, 1, 1, '#a8703e');
  }
  // snapped, splintered end
  rect(27, 2, 1, 2, '#e0c08a'); rect(28, 3, 1, 2, '#e0c08a'); rect(28, 2, 1, 1, K); rect(29, 3, 1, 3, K);
});

SPR.snake = make(13, 29, (p) => {
  const { rect, ell } = p;
  const xs = [];
  for (let y = 1; y <= 22; y++) xs.push([Math.round(6 + Math.sin(y * 0.33) * 3), y]);
  xs.forEach(([x, y]) => ell(x, y, 3, 1, K));
  xs.forEach(([x, y], i) => { ell(x, y, 2, 0, '#3f9a3a'); if (i % 5 === 2) rect(x, y, 1, 1, '#1f5a24'); if (i % 5 === 0) rect(x - 1, y, 1, 1, '#8ad070'); });
  // head at the bottom, tongue out
  const hx = xs[xs.length - 1][0];
  ell(hx, 24, 4, 3, K); ell(hx, 24, 3, 2, '#4fb04a');
  rect(hx - 2, 23, 1, 1, '#ffd23f'); rect(hx + 2, 23, 1, 1, '#ffd23f');
  rect(hx, 27, 1, 2, '#ff3b5a'); rect(hx - 1, 28, 1, 1, '#ff3b5a'); rect(hx + 1, 28, 1, 1, '#ff3b5a');
});

SPR.nest = make(24, 25, (p) => {
  const { rect, ell } = p;
  rect(11, 0, 2, 4, K); rect(11, 0, 1, 4, '#7a4a26');
  ell(12, 13, 9, 10, K); ell(12, 13, 8, 9, '#b8a27a');
  for (let y = 6; y <= 20; y += 3) for (let x = 4; x <= 20; x++) if (Math.abs(x - 12) / 8 + Math.abs(y - 13) / 9.5 < 1.15) rect(x, y, 1, 1, '#8a7656');
  ell(12, 19, 2, 2, '#2a1a10');
  rect(6, 8, 2, 1, '#d8c49c');
  // two angry hornets
  const hornet = (x, y) => { rect(x, y, 3, 2, '#ffd23f'); rect(x + 1, y, 1, 2, K); rect(x, y - 1, 2, 1, '#ffffff'); };
  hornet(0, 4); hornet(20, 9);
});

SPR.owl = make(22, 17, (p) => {
  const { rect, ell, map } = p;
  // spread wings
  map(0, 3, [
    'KK..................KK',
    'KBK................KBK',
    'KBBK..............KBBK',
    'KBBBK............KBBBK',
    '.KBBBK..........KBBBK.',
    '..KBBBK........KBBBK..',
    '...KKKK........KKKK...',
  ], { K, B: '#7a4a2a' });
  ell(11, 9, 6, 7, K); ell(11, 9, 5, 6, '#a8703e'); ell(11, 11, 3, 3, '#e0c08a');
  // face disc with big eyes
  ell(8, 6, 2, 2, '#ffd23f'); ell(14, 6, 2, 2, '#ffd23f');
  rect(8, 6, 1, 1, K); rect(14, 6, 1, 1, K);
  rect(11, 8, 1, 2, '#ff9a3c');
  rect(7, 2, 2, 1, K); rect(14, 2, 2, 1, K);
  rect(9, 15, 1, 2, '#ff9a3c'); rect(13, 15, 1, 2, '#ff9a3c');
});

SPR.chameleon = make(22, 15, (p) => {
  const { rect, ell } = p;
  // curled tail
  ell(4, 9, 3, 3, K); ell(4, 9, 2, 2, '#3fbf6a'); rect(4, 9, 1, 1, K);
  ell(12, 7, 7, 4, K); ell(12, 7, 6, 3, '#3fbf6a'); rect(8, 5, 8, 1, '#8af0a0');
  rect(7, 3, 9, 1, K); rect(8, 2, 6, 1, '#2e9a50'); // crest
  ell(18, 6, 3, 3, K); ell(18, 6, 2, 2, '#3fbf6a');
  ell(18, 5, 1, 1, '#ffd23f'); rect(18, 5, 1, 1, K); // turret eye
  rect(20, 8, 1, 1, '#ff6a8a');
  [[8, 11], [14, 11]].forEach(([x, y]) => { rect(x, y, 2, 3, K); rect(x, y, 1, 2, '#2e9a50'); });
});

// ---------------------------------------------------------------- boss + boss attacks
SPR.seed = make(9, 9, (p) => p.map(0, 0, [
  '....K....', '..KKBKK..', '.KBBBBBK.', 'KBBLBBBBK', 'KKBBBBBKK', '.KBBBBLK.', '.KBBBBBK.', '..KKBKK..', '....K....',
], { K, B: '#8a5a2a', L: '#c8925a' }));

SPR.thorns = make(24, 12, (p) => {
  const { rect } = p;
  for (let x = 0; x < 24; x++) { rect(x, 5, 1, 4, K); rect(x, 6, 1, 2, '#4a6a2a'); if (x % 3 === 0) rect(x, 6, 1, 1, '#6a8a3a'); }
  [2, 8, 14, 20].forEach((x, i) => { const up = i % 2 === 0; rect(x, up ? 2 : 9, 1, 3, K); rect(x + 1, up ? 1 : 11, 1, 1, K); });
  [[5, 3], [17, 9]].forEach(([x, y]) => { rect(x, y, 2, 2, K); rect(x, y, 1, 1, '#ff3b5a'); });
  rect(0, 4, 1, 6, K); rect(23, 4, 1, 6, K);
});

SPR.wasp = make(10, 8, (p) => p.map(0, 0, [
  '...WW.WW..', '...WWKWW..', '.KKKKKKKK.', 'KYKYKYKYYK', 'KYKYKYKYYK', '.KKKKKKKK.', '..K...K...', '..........',
], { K, Y: '#ffd23f', W: '#e6f4ff' }));

/** The fossa: Madagascar's real lemur predator. Faces right. */
SPR.fossa = make(48, 26, (p) => {
  const { rect, ell } = p;
  const C = '#a5703f', D = '#7a4a26', L = '#d8a878';
  // long tail curling down on the left
  for (let i = 0; i < 16; i++) { const x = 13 - i, y = 12 + Math.round(Math.sin(i / 5) * 4 + i * 0.35); ell(x, y, 2, 2, K); }
  for (let i = 0; i < 16; i++) { const x = 13 - i, y = 12 + Math.round(Math.sin(i / 5) * 4 + i * 0.35); ell(x, y, 1, 1, i > 12 ? D : C); }
  // legs
  [[16, 1], [22, 0], [30, 0], [35, 1]].forEach(([x]) => { rect(x - 1, 16, 4, 8, K); rect(x, 16, 2, 7, D); });
  // long low body
  ell(25, 13, 13, 5, K); ell(25, 13, 12, 4, C); rect(15, 9, 20, 1, D); ell(25, 15, 9, 1, L);
  // head
  ell(40, 10, 6, 5, K); ell(40, 10, 5, 4, C); ell(43, 12, 3, 2, L);
  rect(46, 11, 1, 2, K);
  // round ears
  ell(37, 4, 2, 2, K); ell(37, 4, 1, 1, D); ell(42, 4, 2, 2, K); ell(42, 4, 1, 1, D);
  // glowing eyes
  rect(39, 8, 2, 2, '#ffe14a'); rect(43, 8, 2, 2, '#ffe14a'); rect(40, 9, 1, 1, K); rect(44, 9, 1, 1, K);
  // teeth
  rect(42, 14, 1, 1, '#ffffff'); rect(44, 14, 1, 1, '#ffffff');
});

/** Same sprite with a colour wash over its opaque pixels (rage / hit flash). */
function tint(src, col) {
  return make(src.width, src.height, (p) => {
    p.g.drawImage(src, 0, 0);
    p.g.globalCompositeOperation = 'source-atop';
    p.g.fillStyle = col;
    p.g.fillRect(0, 0, src.width, src.height);
  });
}
SPR.fossaL = flip(SPR.fossa);
SPR.fossaRage = tint(SPR.fossa, 'rgba(255,40,30,0.38)');
SPR.fossaRageL = flip(SPR.fossaRage);
SPR.fossaFlash = tint(SPR.fossa, 'rgba(255,255,255,0.6)');
SPR.fossaFlashL = flip(SPR.fossaFlash);

SPR.note = make(5, 7, (p) => p.map(0, 0, ['..KKK', '..KWK', '..K.K', '..K..', 'KKK..', 'KWK..', 'KKK..'], { K, W: '#ffffff' }));

// ---------------------------------------------------------------- power-ups
SPR.fig = make(15, 16, (p) => {
  const { rect, ell, sparkle } = p;
  ell(7, 10, 5, 5, K); ell(7, 10, 4, 4, '#7a3a8a');
  rect(6, 3, 3, 3, K); rect(7, 4, 1, 2, '#7a3a8a');
  ell(5, 8, 1, 1, '#a868b8');
  rect(7, 1, 1, 3, '#3f9a3a'); rect(8, 0, 3, 2, '#3f9a3a'); rect(8, 0, 1, 1, K);
  [[5, 12], [9, 11], [7, 13]].forEach(([x, y]) => rect(x, y, 1, 1, '#c070d0'));
  sparkle(13, 4, '#fff3b0');
});

SPR.leaf = make(19, 17, (p) => {
  const { rect, ell } = p;
  ell(9, 8, 8, 6, K); ell(9, 8, 7, 5, '#3fbf4a');
  for (let x = 3; x <= 15; x++) rect(x, 8, 1, 1, '#1f7a2a');
  [[5, 6], [8, 5], [11, 5], [14, 6]].forEach(([x, y]) => rect(x, y, 1, 2, '#1f7a2a'));
  [[6, 10], [10, 10], [13, 10]].forEach(([x, y]) => rect(x, y, 1, 2, '#1f7a2a'));
  rect(4, 5, 3, 1, '#8af07a');
  rect(9, 14, 1, 3, K); rect(9, 14, 1, 2, '#7a4a26');
});

SPR.cricket = make(19, 13, (p) => {
  const { rect, ell } = p;
  // big hind leg
  rect(3, 3, 7, 1, K); rect(2, 4, 1, 6, K); rect(4, 4, 5, 1, '#5aa83a');
  ell(9, 7, 6, 3, K); ell(9, 7, 5, 2, '#7ac84a'); rect(5, 6, 8, 1, '#a8e070');
  ell(15, 6, 2, 2, K); ell(15, 6, 1, 1, '#7ac84a'); rect(16, 5, 1, 1, K);
  rect(16, 2, 1, 3, K); rect(17, 0, 1, 2, K); rect(18, 0, 1, 1, K); // antenna
  [[7, 10], [11, 10], [13, 10]].forEach(([x, y]) => { rect(x, y, 1, 3, K); });
});

SPR.beetle = make(16, 15, (p) => {
  const { rect, ell, sparkle } = p;
  [[3, 6], [3, 9], [12, 6], [12, 9]].forEach(([x, y]) => rect(x < 8 ? x - 2 : x + 1, y, 2, 1, K));
  ell(7, 4, 2, 2, K); ell(7, 4, 1, 1, '#c98a0e');
  rect(5, 1, 1, 2, K); rect(9, 1, 1, 2, K);
  ell(7, 9, 5, 5, K); ell(7, 9, 4, 4, '#ffcf3a'); rect(7, 6, 1, 8, '#c98a0e');
  rect(4, 7, 1, 3, '#fff6b8');
  sparkle(14, 3, '#fff3b0'); sparkle(1, 13, '#fff3b0');
});
SPR.beetleMini = make(7, 7, (p) => p.map(0, 0,
  ['..KKK..', '.KYYYK.', 'KYWKYYK', 'KYYKYYK', 'KYYKYYK', '.KYKYK.', '..KKK..'],
  { K, Y: '#ffcf3a', W: '#fff6b8' }));

/** Trophy for finishing all 30 nights. */
SPR.moon = make(17, 17, (p) => {
  const { rect, ell, sparkle } = p;
  ell(8, 8, 7, 7, K); ell(8, 8, 6, 6, '#ffd23f'); ell(6, 6, 3, 3, '#fff3b0');
  [[10, 10, 1], [5, 11, 1], [11, 5, 0]].forEach(([x, y, r]) => ell(x, y, r, r, '#e0a82a'));
  sparkle(15, 2, '#ffffff'); sparkle(1, 15, '#ffffff');
});

// ---------------------------------------------------------------- glows behind power-ups
function glow(r, col) {
  return make(r * 2 + 1, r * 2 + 1, (p) => {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      const d = i * i + j * j;
      if (d <= r * r) p.rect(r + i, r + j, 1, 1, d <= r * r * 0.55 ? col(0.26) : col(0.13));
    }
  });
}
export const GLOW = {
  fig: glow(13, (a) => `rgba(220,140,255,${a})`),
  leaf: glow(13, (a) => `rgba(130,240,120,${a})`),
  cricket: glow(13, (a) => `rgba(200,255,120,${a})`),
  beetle: glow(12, (a) => `rgba(255,210,80,${a})`),
};

// ---------------------------------------------------------------- backgrounds
// one palette per stretch of 8 nights: [sky top, sky bottom, tree silhouettes]
const WEEKS = [
  [[10, 30, 44], [26, 72, 76], '#0c2a2c'],
  [[14, 22, 50], [34, 56, 96], '#101c38'],
  [[30, 16, 46], [74, 40, 90], '#1c1030'],
  [[8, 14, 18], [30, 44, 40], '#06100e'],
];
export const weekOf = (n) => Math.min(3, Math.floor((n - 1) / 8));

function baobab(p, x, base, h, w, col) {
  const { rect, ell } = p;
  const top = base - h;
  // fat, slightly bulging trunk
  for (let y = top; y < base; y++) {
    const bulge = Math.round(1.5 * Math.sin(Math.PI * (y - top) / h));
    rect(x - w - bulge, y, (w + bulge) * 2, 1, col);
  }
  // short thick branches with leaf tufts: the classic baobab crown
  for (let k = -2; k <= 2; k++) {
    const ex = x + k * 5, ey = top - 5 - (k % 2 ? 2 : 0);
    const n = 6;
    for (let i = 0; i <= n; i++) rect(Math.round(x + k * 2 + (ex - x - k * 2) * i / n) - 1, Math.round(top + (ey - top) * i / n), 2, 2, col);
    ell(ex, ey - 1, 3, 2, col);
  }
}

function branchFloor(p, light) {
  const { rect } = p;
  const bark = light ? '#8a5a36' : '#4a301e', top = light ? '#c08858' : '#7a5034', dark = light ? '#6a4228' : '#382414';
  rect(0, FLOOR, LW, LH - FLOOR, bark);
  rect(0, FLOOR, LW, 1, top);
  for (let x = 0; x < LW; x += 9) rect(x + ((x / 9) % 2) * 3, FLOOR + 4 + ((x / 9) % 3), 5, 1, dark);
  [[18, FLOOR + 8], [77, FLOOR + 6]].forEach(([x, y]) => { rect(x, y, 3, 2, dark); rect(x + 1, y, 1, 1, top); });
}

const bgCache = {};
/** sky = false gives the same scene without the moon/sun, used to extend the forest sideways on wide screens. */
export function bgFor(night, storm, daylight, sky = true) {
  const key = (daylight ? 'day' : `${weekOf(night)}-${storm ? 1 : 0}`) + (sky ? '' : '-side');
  if (bgCache[key]) return bgCache[key];
  const c = make(LW, LH, (p) => {
    const { rect, ell } = p;
    if (daylight) {
      for (let y = 0; y < LH; y++) { const t = y / LH; rect(0, y, LW, 1, `rgb(${150 + t * 60 | 0},${210 + t * 25 | 0},${240 - t * 30 | 0})`); }
      if (sky) ell(100, 34, 6, 6, '#fff3a0');
      [[20, 150, 30, 5], [70, 158, 24, 4], [104, 148, 34, 6]].forEach(([x, b, h, w]) => baobab(p, x, FLOOR, h + (b - 150), w, '#7aa070'));
      branchFloor(p, true);
      return;
    }
    const [top, bot, trees] = WEEKS[weekOf(night)];
    const dim = storm ? 0.7 : 1;
    for (let y = 0; y < LH; y++) {
      const t = y / LH, ch = (i) => Math.round((top[i] + t * (bot[i] - top[i])) * dim);
      rect(0, y, LW, 1, `rgb(${ch(0)},${ch(1)},${ch(2)})`);
    }
    if (!sky) { /* no moon on the side panels */ } else if (!storm) { ell(105, 36, 7, 7, '#2a3a3a'); ell(105, 36, 6, 6, '#f4f0d0'); ell(103, 34, 2, 2, '#e0dcb8'); ell(107, 38, 1, 1, '#e0dcb8'); }
    else { // moon behind storm clouds
      ell(105, 36, 6, 6, '#8a8ea0');
      [[93, 38, 12, 4], [112, 33, 10, 4], [60, 28, 16, 4], [20, 40, 18, 5]].forEach(([x, y, rx, ry]) => ell(x, y, rx, ry, '#2a2e3c'));
    }
    [[16, 30, 6], [60, 22, 4], [98, 34, 7]].forEach(([x, h, w]) => baobab(p, x, FLOOR, h + 18, w, trees));
    // hanging leaves along the top edge
    for (let x = -2; x < LW; x += 7) { const h = 3 + ((x * 7) % 5); ell(x + 3, 15, 3, h, trees); }
    branchFloor(p, false);
  });
  return (bgCache[key] = c);
}

/** A strip of leafy canopy, tiled along the top of the play area so falling things drop out of the leaves. */
const canopyCache = {};
export function canopyFor(night) {
  const w = weekOf(night);
  if (canopyCache[w]) return canopyCache[w];
  const dark = WEEKS[w][2], [top] = WEEKS[w], lit = `rgb(${top[0] + 22},${top[1] + 34},${top[2] + 26})`;
  return (canopyCache[w] = make(LW, 16, (p) => {
    const { ell, rect } = p;
    let seed = 7 + w;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    rect(0, 0, LW, 4, dark);
    // overlapping leaf clumps with a ragged lower edge
    for (let x = -4; x < LW + 6; x += 5) ell(x, 3 + (rnd() * 3 | 0), 3 + (rnd() * 2 | 0), 3 + (rnd() * 4 | 0), dark);
    // a few lit leaf tips catching the moonlight
    for (let i = 0; i < 26; i++) { const x = rnd() * LW | 0, y = 2 + (rnd() * 6 | 0); rect(x, y, 2, 1, lit); }
  }));
}

/** Purple "sugar rush" vignette shown while the fig's slow-motion is active. */
export const RUSH = make(LW, LH, (p) => {
  const { rect, sparkle } = p;
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  p.g.fillStyle = 'rgba(200,120,255,0.12)';
  p.g.fillRect(0, 0, LW, LH);
  for (let x = 0; x < LW; x++) {
    const d = 2 + (rnd() * 4 | 0); rect(x, 0, 1, d, '#e6c8ff'); rect(x, d, 1, 1, '#b07ae0');
    const b = 2 + (rnd() * 4 | 0); rect(x, LH - b, 1, b, '#e6c8ff'); rect(x, LH - b - 1, 1, 1, '#b07ae0');
  }
  for (let y = 0; y < LH; y++) {
    const d = 2 + (rnd() * 4 | 0); rect(0, y, d, 1, '#e6c8ff'); rect(d, y, 1, 1, '#b07ae0');
    const b = 2 + (rnd() * 4 | 0); rect(LW - b, y, b, 1, '#e6c8ff'); rect(LW - b - 1, y, 1, 1, '#b07ae0');
  }
  [[10, 60], [108, 70], [6, 130], [112, 170], [20, 190], [100, 110]].forEach(([x, y]) => sparkle(x, y, '#ffffff'));
});
