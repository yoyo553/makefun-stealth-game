// A small seeded random source (mulberry32) plus a position hash. The world never calls
// Math.random: a seed fully decides a run, which is what makes the screenshot scenes in
// shots.js come out the same every time they are staged.

const MULBERRY_STEP = 0x6d2b79f5;
const HASH_MULTIPLIER = 1274126177;

/** Return a function giving the next pseudo-random number in [0, 1) for `seed`. */
export function createRandom(seed) {
  let state = seed >>> 0;
  return function nextRandom() {
    state = (state + MULBERRY_STEP) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable 0..1 value from two integers, for decoration that must not flicker between frames. */
export function hash01(a, b) {
  let h = (a * 374761393 + b * 668265263) >>> 0;
  h = (Math.imul(h ^ (h >>> 13), HASH_MULTIPLIER)) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
