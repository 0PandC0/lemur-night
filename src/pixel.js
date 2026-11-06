// Tiny pixel-art toolkit: every sprite is drawn once into an offscreen canvas at startup.
import { K } from './config.js';

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Drawing helpers bound to one 2D context. */
export function painter(g) {
  const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  /** Outlined box with optional rounded (cut) corners. */
  const box = (x, y, w, h, fill, round = true) => {
    const o = round ? 1 : 0;
    rect(x + o, y, w - 2 * o, 1, K); rect(x + o, y + h - 1, w - 2 * o, 1, K);
    rect(x, y + o, 1, h - 2 * o, K); rect(x + w - 1, y + o, 1, h - 2 * o, K);
    rect(x + 1, y + 1, w - 2, h - 2, fill);
  };
  /** Paint a string map: each character is a palette key, '.' is transparent. */
  const map = (x, y, rows, pal) => rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== '.' && pal[ch]) rect(x + i, y + j, 1, 1, pal[ch]);
  }));
  /** Filled pixel ellipse. */
  const ell = (cx, cy, rx, ry, c) => {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
      if ((x * x) / (rx * rx || 1) + (y * y) / (ry * ry || 1) <= 1.05) rect(cx + x, cy + y, 1, 1, c);
    }
  };
  /** Outlined ellipse. */
  const blob = (cx, cy, rx, ry, c) => { ell(cx, cy, rx + 1, ry + 1, K); ell(cx, cy, rx, ry, c); };
  const sparkle = (x, y, c) => { rect(x, y - 1, 1, 3, c); rect(x - 1, y, 3, 1, c); };
  return { g, rect, box, map, ell, blob, sparkle };
}

export function make(w, h, draw) {
  const c = canvas(w, h);
  draw(painter(c.getContext('2d')));
  return c;
}

export function flip(src) {
  const c = canvas(src.width, src.height);
  const g = c.getContext('2d');
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}
