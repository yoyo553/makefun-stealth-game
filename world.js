// The simulation: one room of the archive, advanced in fixed slices. The player creeps,
// walks (and is heard), or tosses a bookmark to pull a warden's gaze away; the wardens
// walk their patrols, pause, sweep, investigate noises and stare when something catches
// their eye. A warden whose awareness fills up catches the player; a player who reaches
// the Dawn Door unseen has escaped the room. Nothing here knows about screens or pixels:
// main.js owns the screens, render.js owns the drawing, and this file owns the rules.

import { BOOKMARK, FIELD, PLAYER, VISION, WARDEN } from './config.js';
import { LEVELS } from './levels.js';
import { angleDifference, buildSegments, lineOfSight, turnToward } from './vision.js';

export const EVENT_STEP = 1;
export const EVENT_PING = 2;
export const EVENT_THROW = 4;
export const EVENT_WARY = 8;
export const EVENT_CAUGHT = 16;
export const EVENT_ESCAPED = 32;

const WALL_INSET = 24;
const TURN_SPEED = 2.6;

function clamp(value, low, high) {
  if (value < low) return low;
  if (value > high) return high;
  return value;
}

function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

/** Does a circle at (x, y) overlap any cover rectangle (grown by the circle's radius)? */
function circleHitsCover(level, x, y, radius) {
  for (const rect of level.cover) {
    const nearX = clamp(x, rect.x, rect.x + rect.w);
    const nearY = clamp(y, rect.y, rect.y + rect.h);
    const dx = x - nearX;
    const dy = y - nearY;
    if (dx * dx + dy * dy < radius * radius) return true;
  }
  return false;
}

/** Move a circle by (dx, dy), sliding along cover and the room's walls. Returns the new spot. */
function slideMove(level, x, y, radius, dx, dy) {
  const minX = WALL_INSET + radius;
  const maxX = FIELD.width - WALL_INSET - radius;
  const minY = WALL_INSET + radius;
  const maxY = FIELD.height - WALL_INSET - radius;
  let nextX = clamp(x + dx, minX, maxX);
  if (circleHitsCover(level, nextX, y, radius)) nextX = x;
  let nextY = clamp(y + dy, minY, maxY);
  if (circleHitsCover(level, nextX, nextY, radius)) nextY = y;
  return { x: nextX, y: nextY };
}

function makeWarden(level, spec, random) {
  const start = spec.path[0];
  const sentinel = spec.path.length === 1;
  const exitCentre = {
    x: level.exit.x + level.exit.w / 2,
    y: level.exit.y + level.exit.h / 2,
  };
  let homeFacing;
  if (sentinel) {
    homeFacing = Math.atan2(exitCentre.y - start[1], exitCentre.x - start[0]);
  } else {
    homeFacing = Math.atan2(spec.path[1][1] - start[1], spec.path[1][0] - start[0]);
  }
  return {
    x: start[0],
    y: start[1],
    facing: homeFacing,
    homeFacing,
    sentinel,
    path: spec.path,
    speed: spec.speed ?? WARDEN.patrolSpeed,
    pathIndex: sentinel ? 0 : 1,
    mode: 'patrol',
    pauseTimer: 0,
    lookTimer: 0,
    target: null,
    awareness: 0,
    unseenTimer: 0,
    seesPlayer: false,
    sweepSeed: random() * Math.PI * 2,
    wasWary: false,
  };
}

export function createWorld(random) {
  const state = {
    levelIndex: 0,
    level: LEVELS[0],
    segments: [],
    time: 0,
    player: { x: 0, y: 0, tiptoe: false, moving: false, stepTimer: 0, faceX: 1, faceY: 0 },
    wardens: [],
    ripples: [],
    bookmarks: [],
    throwCooldown: 0,
    detection: 0,
    anyoneSees: false,
    caught: false,
    escaped: false,
    stats: { time: 0, nearMisses: 0, throws: 0 },
  };

  function reset(levelIndex) {
    state.levelIndex = levelIndex;
    state.level = LEVELS[levelIndex];
    state.segments = buildSegments(state.level);
    state.time = 0;
    state.player.x = state.level.start.x;
    state.player.y = state.level.start.y;
    state.player.tiptoe = false;
    state.player.moving = false;
    state.player.stepTimer = 0;
    state.wardens = state.level.wardens.map((spec) => makeWarden(state.level, spec, random));
    state.ripples = [];
    state.bookmarks = [];
    state.throwCooldown = 0;
    state.detection = 0;
    state.anyoneSees = false;
    state.caught = false;
    state.escaped = false;
  }

  function hearNoise(x, y, radius) {
    for (const warden of state.wardens) {
      if (distance(warden.x, warden.y, x, y) > radius) continue;
      if (warden.seesPlayer && warden.awareness > VISION.suspiciousAt) continue;
      warden.mode = 'investigate';
      warden.target = { x, y };
      warden.lookTimer = 0;
    }
  }

  function stepPlayer(dt, input, events) {
    const player = state.player;
    player.tiptoe = Boolean(input.tiptoe);
    const length = Math.hypot(input.moveX, input.moveY);
    player.moving = length > 0.01;
    if (player.moving) {
      const norm = Math.max(1, length);
      const speed = player.tiptoe ? PLAYER.tiptoeSpeed : PLAYER.walkSpeed;
      const dx = (input.moveX / norm) * speed * dt;
      const dy = (input.moveY / norm) * speed * dt;
      const moved = slideMove(state.level, player.x, player.y, PLAYER.radius, dx, dy);
      player.x = moved.x;
      player.y = moved.y;
      player.faceX = input.moveX / norm;
      player.faceY = input.moveY / norm;
      if (!player.tiptoe) {
        player.stepTimer -= dt;
        if (player.stepTimer <= 0) {
          player.stepTimer = PLAYER.stepInterval;
          state.ripples.push({
            x: player.x, y: player.y, r: 8,
            maxR: PLAYER.stepNoiseRadius, age: 0, life: 0.55, kind: 'step',
          });
          hearNoise(player.x, player.y, PLAYER.stepNoiseRadius);
          events |= EVENT_STEP;
        }
      }
    }
    state.throwCooldown = Math.max(0, state.throwCooldown - dt);
    if (input.throwAt && state.throwCooldown <= 0) {
      const dx = input.throwAt.x - player.x;
      const dy = input.throwAt.y - player.y;
      const dist = Math.hypot(dx, dy);
      const reach = dist > BOOKMARK.throwRange ? BOOKMARK.throwRange / dist : 1;
      state.bookmarks.push({
        fromX: player.x,
        fromY: player.y,
        x: player.x + dx * reach,
        y: player.y + dy * reach,
        t: 0,
        landed: false,
      });
      state.throwCooldown = BOOKMARK.cooldown;
      state.stats.throws += 1;
      events |= EVENT_THROW;
    }
    const exit = state.level.exit;
    const insideExit =
      player.x > exit.x && player.x < exit.x + exit.w &&
      player.y > exit.y && player.y < exit.y + exit.h;
    if (insideExit) {
      state.escaped = true;
      events |= EVENT_ESCAPED;
    }
    return events;
  }

  function stepBookmarks(dt, events) {
    for (const mark of state.bookmarks) {
      if (mark.landed) continue;
      mark.t += dt;
      if (mark.t < BOOKMARK.flightSeconds) continue;
      mark.landed = true;
      state.ripples.push({
        x: mark.x, y: mark.y, r: 10,
        maxR: BOOKMARK.noiseRadius, age: 0, life: 0.8, kind: 'ping',
      });
      hearNoise(mark.x, mark.y, BOOKMARK.noiseRadius);
      events |= EVENT_PING;
    }
    const linger = BOOKMARK.flightSeconds + 0.8;
    state.bookmarks = state.bookmarks.filter((mark) => !mark.landed || mark.t < linger);
    return events;
  }

  function stepWarden(dt, warden, events) {
    const player = state.player;
    const toPlayer = Math.atan2(player.y - warden.y, player.x - warden.x);
    const distToPlayer = distance(warden.x, warden.y, player.x, player.y);
    const inRange = distToPlayer <= VISION.range;
    const inAngle = Math.abs(angleDifference(warden.facing, toPlayer)) <= VISION.halfAngle;
    const hasLine = inRange && inAngle &&
      lineOfSight(warden.x, warden.y, player.x, player.y, state.segments);
    warden.seesPlayer = hasLine;

    if (warden.seesPlayer) {
      warden.unseenTimer = 0;
      const closeness = 1.25 - distToPlayer / VISION.range;
      const distanceScale = clamp(closeness, 0.3, 1.15);
      const stanceScale = player.tiptoe ? 0.45 : 1;
      const gain = dt * VISION.fillRate * distanceScale * stanceScale;
      warden.awareness = Math.min(1, warden.awareness + gain);
    } else {
      warden.unseenTimer += dt;
      if (warden.unseenTimer > VISION.unseenGrace) {
        warden.awareness = Math.max(0, warden.awareness - dt * VISION.decayRate);
      }
    }
    const wary = warden.awareness >= VISION.suspiciousAt;
    if (wary && !warden.wasWary) {
      events |= EVENT_WARY;
      state.stats.nearMisses += 1;
    }
    warden.wasWary = wary;
    if (warden.awareness >= 1) {
      state.caught = true;
      return events | EVENT_CAUGHT;
    }

    if (warden.seesPlayer && wary) {
      // Caught in the lamplight and stared at: the warden stops and watches the player.
      warden.facing = turnToward(warden.facing, toPlayer, TURN_SPEED * dt);
      return events;
    }

    if (warden.mode === 'investigate' && warden.target) {
      const dx = warden.target.x - warden.x;
      const dy = warden.target.y - warden.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 10 && warden.lookTimer <= 0) {
        warden.facing = turnToward(warden.facing, Math.atan2(dy, dx), TURN_SPEED * dt);
        const stepX = (dx / dist) * WARDEN.investigateSpeed * dt;
        const stepY = (dy / dist) * WARDEN.investigateSpeed * dt;
        const moved = slideMove(state.level, warden.x, warden.y, WARDEN.radius, stepX, stepY);
        warden.x = moved.x;
        warden.y = moved.y;
      } else {
        warden.lookTimer += dt;
        warden.facing += Math.sin(state.time * 1.7 + warden.sweepSeed) * 1.4 * dt;
        if (warden.lookTimer > 1.6) {
          warden.mode = 'patrol';
          warden.target = null;
          warden.lookTimer = 0;
          let nearest = 0;
          let nearestDist = Infinity;
          warden.path.forEach((point, index) => {
            const d = distance(point[0], point[1], warden.x, warden.y);
            if (d < nearestDist) {
              nearestDist = d;
              nearest = index;
            }
          });
          warden.pathIndex = nearest;
        }
      }
      return events;
    }

    if (warden.sentinel) {
      const sway = Math.sin(state.time * WARDEN.sweepSpeed + warden.sweepSeed);
      warden.facing = warden.homeFacing + sway * WARDEN.sweepAngle;
      return events;
    }

    if (warden.pauseTimer > 0) {
      warden.pauseTimer -= dt;
      return events;
    }
    const target = warden.path[warden.pathIndex];
    const dx = target[0] - warden.x;
    const dy = target[1] - warden.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) {
      warden.pathIndex = (warden.pathIndex + 1) % warden.path.length;
      warden.pauseTimer = WARDEN.pauseSeconds * (0.85 + random() * 0.3);
      return events;
    }
    warden.facing = turnToward(warden.facing, Math.atan2(dy, dx), TURN_SPEED * dt);
    const stepX = (dx / dist) * warden.speed * dt;
    const stepY = (dy / dist) * warden.speed * dt;
    const moved = slideMove(state.level, warden.x, warden.y, WARDEN.radius, stepX, stepY);
    warden.x = moved.x;
    warden.y = moved.y;
    return events;
  }

  function step(dt, input) {
    if (state.caught || state.escaped) return 0;
    let events = 0;
    state.time += dt;
    state.stats.time += dt;
    events = stepPlayer(dt, input, events);
    events = stepBookmarks(dt, events);
    for (const warden of state.wardens) {
      events = stepWarden(dt, warden, events);
      if (state.caught) break;
    }
    for (const ripple of state.ripples) {
      ripple.age += dt;
      ripple.r = ripple.maxR * Math.min(1, ripple.age / ripple.life);
    }
    state.ripples = state.ripples.filter((ripple) => ripple.age < ripple.life);
    let highest = 0;
    for (const warden of state.wardens) {
      if (warden.awareness > highest) highest = warden.awareness;
    }
    state.detection = highest;
    state.anyoneSees = state.wardens.some((warden) => warden.seesPlayer);
    return events;
  }

  /** Set the room's state directly, for staging screenshot scenes in shots.js. */
  function stage(mutator) {
    mutator(state);
  }

  reset(0);
  return { state, reset, step, stage };
}
