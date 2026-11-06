// What falls, what helps, and the text that goes with it.

export const BOSS_NAME = 'THE FOSSA';

/**
 * Falling dangers.
 * hit:   hitbox inside the sprite [x, y, w, h]
 * speed: multiplier on the night's fall speed
 * sway:  drifts side to side (px amplitude)   zig: zig-zags faster (px amplitude)
 */
export const HAZARDS = {
  coconut:   { dmg: 20, name: 'A FALLING COCONUT',  hit: [1, 1, 11, 11] },
  branch:    { dmg: 18, name: 'A SNAPPED BRANCH',   hit: [1, 1, 28, 10], sway: 6 },
  snake:     { dmg: 24, name: 'A TREE BOA',         hit: [2, 1, 9, 27], speed: 1.15 },
  nest:      { dmg: 24, name: 'A HORNET NEST',      hit: [3, 3, 18, 21], speed: 0.85 },
  owl:       { dmg: 18, name: 'A HUNGRY OWL',       hit: [1, 3, 20, 12], zig: 10 },
  chameleon: { dmg: 20, name: 'A GRUMPY CHAMELEON', hit: [1, 1, 20, 13] },
  // boss attacks
  seed:      { dmg: 22, name: BOSS_NAME, hit: [1, 1, 7, 7], speed: 1.25 },
  thorns:    { dmg: 22, name: BOSS_NAME, hit: [0, 1, 24, 10] },
  wasp:      { dmg: 18, name: BOSS_NAME, hit: [1, 1, 8, 6], zig: 14 },
  pounce:    { dmg: 28, name: BOSS_NAME },
};

/** Which dangers can appear on a given night. */
export function poolFor(night) {
  const p = ['coconut', 'branch'];
  if (night >= 3) p.push('snake');
  if (night >= 5) p.push('nest');
  if (night >= 8) p.push('owl');
  if (night >= 12) p.push('chameleon');
  return p;
}

export const POWERUPS = {
  fig:     { banner: ['RIPE FIG!', 'SUGAR RUSH - TIME SLOWS'], fg: '#f0d8ff', bg: 'rgba(50,16,70,0.9)' },
  leaf:    { banner: ['LEAF SHIELD!', 'BLOCKS 2 HITS'], fg: '#d8ffd0', bg: 'rgba(10,50,20,0.9)' },
  cricket: { banner: ['CRUNCHY SNACK', '+30 HP'], fg: '#eaffc8', bg: 'rgba(30,60,10,0.9)' },
  beetle:  { banner: ['GOLDEN BEETLE!', 'EXTRA LIFE STORED'], fg: '#fff3b0', bg: 'rgba(60,40,0,0.9)' },
};

export const TEXT = {
  title: 'LEMUR',
  title2: 'NIGHT',
  tagline: ['LOVES FIGS.', 'FEARS EVERYTHING.'],
  dodge: 'DODGE THESE',
  grab: 'GRAB THESE',
  night1: ['NIGHT 1', 'STAY ALERT'],
  finalNight: ['FINAL NIGHT', 'ONE MORE SUNRISE'],
  storm: ['STORM NIGHT', 'RAIN AND WIND - WATCH OUT'],
  bossIntro: ['!! DANGER !!', 'A FOSSA IS HUNTING'],
  bossFight: ['BOSS FIGHT', 'SURVIVE UNTIL IT GIVES UP'],
  bossRage: ['FURIOUS!', 'THE WHOLE FOREST JOINS IN'],
  bossDown: 'THE FOSSA GAVE UP',
  revive: ['STILL GOING!', 'THE GOLDEN BEETLE SAVED YOU'],
  survived: (n) => 'NIGHT ' + n + ' SURVIVED',
  next: (n) => 'ON TO NIGHT ' + n + '!',
  gameOver: ['LIGHTS OUT'],
  won: ['30 NIGHTS', 'SURVIVED'],
};
