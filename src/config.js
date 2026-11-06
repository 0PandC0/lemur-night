// Game-wide constants and difficulty tuning.
// Everything that controls how hard a night feels lives in TUNE, so balancing never means hunting through game code.

/** Logical resolution. The canvas is integer-scaled from this, so every sprite stays pixel-crisp. */
export const LW = 120;
export const LH = 213;
/** Top edge of the branch the lemur runs on. */
export const FLOOR = 198;
/** Top of the lemur sprite. */
export const PY = 180;
/** Player sprite size. */
export const PW = 17;
export const PH = 18;

export const NIGHTS = 30;
export const BOSS_NIGHT = 15;

/** Shared outline colour for all pixel art. */
export const K = '#141018';
export const FONT = '"Silkscreen", ui-monospace, monospace';

/** Optional credit shown on the title and result screens. Leave empty to hide it. */
export const AUTHOR = '';

export const TUNE = {
  // night length and the quiet "dawn" stretch at the end of every night
  nightLen: (n) => 18 + Math.min(7, n * 0.25),
  dawn: 3,
  // spawning
  spawnEvery: (n) => Math.max(0.24, 0.95 - (n - 1) * 0.025),
  fallSpeed: (n) => 36 + n * 2.0,
  dmgMul: (n) => 1 + (n - 1) * 0.025,
  stormSpawn: 0.75,
  stormSpeed: 6,
  burstFrom: 15, burstEvery: 7,
  streakFrom: 22, streakEvery: 5,
  // player
  playerSpeed: 125,
  restHeal: 4,
  // power-ups
  puSpeed: (n) => 40 + n * 0.8,
  puChance1: (n) => Math.max(0.55, 0.9 - n * 0.012),
  puChance2: (n) => (n <= 10 ? 0.25 : 0.15),
  beetleChance: 0.15, beetleFrom: 10,
  slowTime: 5, slowScale: 0.4,
  shieldHits: 2,
  snackHeal: 30,
  reviveHp: 45,
  // fairness: a gap this wide always stays open, nothing spawns too late to clear the lemur before dawn
  gapNeed: 20,
  clearMargin: 0.15,
  // anti-camping: standing still too long makes some spawns aim at you
  edgeSpread: 0.35, campTime: 2.5, campAim: 0.5,
  // boss
  bossHunger: 100,
  bossDrain: 100 / 32,
  bossPuHit: 12,
  bossWinHeal: 30,
};

/** Every 5th night is a storm night (more falling things, faster), except the boss night. The final night is a storm too. */
export const isStorm = (n) => n % 5 === 0 && n !== BOSS_NIGHT;

export const MILESTONES = {
  10: 'TEN NIGHTS DOWN',
  15: 'YOU OUTRAN THE FOSSA',
  20: 'TWENTY NIGHTS DOWN',
  25: 'FIVE TO GO',
  29: 'ONE LAST NIGHT',
};

export function rankFor(night, won) {
  if (won) return 'MOONLIGHT LEGEND';
  if (night <= 3) return 'TINY SNACK';
  if (night <= 7) return 'BRANCH HOPPER';
  if (night <= 14) return 'NIGHT RUNNER';
  if (night <= 21) return 'CANOPY SCOUT';
  return 'FOREST LEGEND';
}
