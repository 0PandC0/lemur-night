// The single mutable game state, shared by every module.
import { store } from './store.js';

export const G = {
  // flow: 'title' | 'play' | 'clear' | 'dead' | 'win'
  state: 'title',
  stateT: 0,
  paused: null,
  night: 1,
  nightT: 0,
  nightLen: 18,

  // the lemur
  px: 51.5,
  facing: 1,
  walkT: 0,
  hp: 100,
  shield: 0,
  hasBeetle: false,
  beetleUsed: false,
  invuln: 0,
  reviveT: 0,
  slowT: 0,

  // the world
  items: [],      // falling dangers ('hz') and power-ups ('pu')
  beams: [],      // fossa pounce columns
  warns: [],      // "!" markers before a fast streak
  boss: null,
  puPlan: [],     // planned power-up drop times for this night
  spawnT: 0,
  burstT: 0,
  streakT: 0,
  campX: 51.5,
  campT: 0,
  uid: 0,

  // effects
  parts: [],
  floats: [],
  banner: null,
  shake: 0,
  flash: 0,
  dayFlash: 0,

  // results
  clearT: 0,
  deadT: 0,
  lastKiller: '',
  lastHeal: 0,
  wonHp: 0,
  best: store.get('lemur-best', 0),
  newBest: false,

  // input + display
  keys: { left: false, right: false },
  drag: { active: false, x: 0, startX: 0, startPx: 0 },
  touch: ('ontouchstart' in window) || navigator.maxTouchPoints > 0,
  S: 3,

  offlineReady: false,   // every game file is cached, so it will also run with no connection

  // test hooks (only reachable through the #dev build)
  ghost: false,
  noCamp: false,
  frozen: false,
};
