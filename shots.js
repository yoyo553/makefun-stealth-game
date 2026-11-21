// The screenshot scenes behind ?shot=start|play|alert|end. Each one runs the real rules
// forward from a fresh world — the play scene steers the player along a fixed route
// through Room I, the alert scene stages a near-catch at the edge of a warden's
// lamplight — so the frame is what the game really looks like, and the same scene always
// gives the same frame.

import { STEP } from './config.js';
import { SCREEN_TITLE, SCREEN_WIN } from './render.js';

const IDLE = { moveX: 0, moveY: 0, tiptoe: false, throwAt: null };

function hud(overrides = {}) {
  return {
    totalTime: 0, nearMisses: 0, throws: 0,
    best: null, roomAge: 99, mouse: null,
    ...overrides,
  };
}

/** One step of steering input: walk (or tiptoe) from the player toward `target`. */
function steer(state, target, tiptoe) {
  const dx = target.x - state.player.x;
  const dy = target.y - state.player.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return { moveX: 0, moveY: 0, tiptoe, throwAt: null };
  return { moveX: dx / dist, moveY: dy / dist, tiptoe, throwAt: null };
}

function stepSeconds(world, seconds, inputFor) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) world.step(STEP, inputFor(i));
}

/** The play scene's route: out of the corner, up the first aisle, across the middle, east. */
const ROUTE = [
  { x: 250, y: 612 },
  { x: 250, y: 390 },
  { x: 700, y: 390 },
  { x: 700, y: 486 },
  { x: 986, y: 486 },
];

function stagePlay(world) {
  world.reset(0);
  let waypoint = 0;
  stepSeconds(world, 13, () => {
    const target = ROUTE[Math.min(waypoint, ROUTE.length - 1)];
    const dx = target.x - world.state.player.x;
    const dy = target.y - world.state.player.y;
    if (Math.hypot(dx, dy) < 16 && waypoint < ROUTE.length - 1) waypoint += 1;
    const nearEnd = waypoint >= ROUTE.length - 2;
    return steer(world.state, ROUTE[waypoint], nearEnd);
  });
  return { screen: 'play', meta: hud({ totalTime: 13 }) };
}

function stageAlert(world) {
  world.reset(0);
  stepSeconds(world, 2, () => IDLE);
  world.stage((state) => {
    state.player.x = 1104;
    state.player.y = 452;
    state.player.faceX = 0.4;
    state.player.faceY = -1;
    const warden = state.wardens[1];
    warden.x = 1164;
    warden.y = 352;
    warden.facing = Math.PI / 2;
    warden.awareness = 0.58;
    warden.mode = 'patrol';
  });
  const creep = { moveX: 0, moveY: 0, tiptoe: true, throwAt: null };
  stepSeconds(world, 0.4, () => creep);
  return { screen: 'play', meta: hud({ totalTime: 41, nearMisses: 1 }) };
}

function stageEnd(world) {
  world.reset(2);
  stepSeconds(world, 3, () => IDLE);
  world.stage((state) => {
    state.player.x = state.level.exit.x + state.level.exit.w / 2;
    state.player.y = state.level.exit.y + state.level.exit.h / 2;
    state.escaped = true;
    // The run is over and nobody is watching any more: calm every warden so the HUD rests.
    for (const warden of state.wardens) warden.awareness = 0;
    state.detection = 0;
    state.anyoneSees = false;
  });
  return { screen: SCREEN_WIN, meta: hud({ totalTime: 226, nearMisses: 4, throws: 6, best: 226 }) };
}

function stageTitle(world) {
  world.reset(0);
  stepSeconds(world, 4, () => IDLE);
  return { screen: SCREEN_TITLE, meta: hud() };
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the HUD numbers
 * to show. Any name other than play, alert or end is the title.
 */
export function stageShot(name, world) {
  if (name === 'play') return stagePlay(world);
  if (name === 'alert') return stageAlert(world);
  if (name === 'end') return stageEnd(world);
  return stageTitle(world);
}
