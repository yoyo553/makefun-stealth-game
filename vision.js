// Sight, worked out with rays. Every wall and piece of cover is a rectangle; its four
// edges are segments, and a vision cone is the fan of rays a warden casts across its field
// of view, each stopped by the first segment it meets. The same ray test answers the
// plainer question the detection rules ask: can this warden actually see the player, or is
// a shelf in the way?

import { FIELD } from './config.js';

/** The four edges of a rectangle as segments {x1, y1, x2, y2}. */
function rectSegments(rect, out) {
  const right = rect.x + rect.w;
  const bottom = rect.y + rect.h;
  out.push(
    { x1: rect.x, y1: rect.y, x2: right, y2: rect.y },
    { x1: right, y1: rect.y, x2: right, y2: bottom },
    { x1: right, y1: bottom, x2: rect.x, y2: bottom },
    { x1: rect.x, y1: bottom, x2: rect.x, y2: rect.y },
  );
}

/** All blocking segments of a level: its cover plus the room's own border. */
export function buildSegments(level) {
  const segments = [];
  for (const rect of level.cover) rectSegments(rect, segments);
  rectSegments({ x: 0, y: 0, w: FIELD.width, h: FIELD.height }, segments);
  return segments;
}

/**
 * Distance from (ox, oy) along `angle` to the nearest segment, or `maxDist` when nothing
 * is hit. Standard ray/segment intersection: solve o + t*d = a + u*(b-a) for t >= 0,
 * 0 <= u <= 1.
 */
export function rayDistance(ox, oy, angle, segments, maxDist) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = maxDist;
  for (const s of segments) {
    const sx = s.x2 - s.x1;
    const sy = s.y2 - s.y1;
    const denom = dx * sy - dy * sx;
    if (Math.abs(denom) < 1e-9) continue;
    const ax = s.x1 - ox;
    const ay = s.y1 - oy;
    const t = (ax * sy - ay * sx) / denom;
    const u = (ax * dy - ay * dx) / denom;
    if (t >= 0 && t < best && u >= 0 && u <= 1) best = t;
  }
  return best;
}

/** True when nothing blocks the straight line from (x1, y1) to (x2, y2). */
export function lineOfSight(x1, y1, x2, y2, segments) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  if (dist < 1e-6) return true;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  return rayDistance(x1, y1, angle, segments, dist) >= dist - 0.5;
}

/**
 * The polygon of a vision cone: the warden's position, then the end of a ray every few
 * degrees across the cone, each ray stopped by the first wall it meets. Drawn filled, it
 * is the pool of lamplight a player must stay out of.
 */
export function conePolygon(x, y, facing, range, halfAngle, segments) {
  const STEP_ANGLE = 0.045;
  const points = [{ x, y }];
  for (let a = -halfAngle; a <= halfAngle + 1e-6; a += STEP_ANGLE) {
    const angle = facing + a;
    const d = rayDistance(x, y, angle, segments, range);
    points.push({ x: x + Math.cos(angle) * d, y: y + Math.sin(angle) * d });
  }
  return points;
}

/** Smallest signed difference between two angles, in (-PI, PI]. */
export function angleDifference(from, to) {
  let diff = (to - from) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/** Turn `facing` toward `target` by at most `maxTurn`. */
export function turnToward(facing, target, maxTurn) {
  const diff = angleDifference(facing, target);
  if (Math.abs(diff) <= maxTurn) return target;
  return facing + Math.sign(diff) * maxTurn;
}
