// Boot and the one loop. Input is read every frame, the world advances in fixed 1/60 s
// steps, and the renderer paints what is there. The game moves between screens: title,
// play, paused, caught, room clear and the final win. Totals (time, near misses,
// bookmarks tossed) live here, accumulated from the world's events, so a room can be
// retried without losing the run.
//
// ?seed=N fixes the wardens' small timing variations. ?shot=start|play|alert|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  EVENT_CAUGHT,
  EVENT_ESCAPED,
  EVENT_PING,
  EVENT_STEP,
  EVENT_THROW,
  EVENT_WARY,
} from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import {
  createRenderer,
  SCREEN_CAUGHT,
  SCREEN_CLEAR,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
} from './render.js';
import { createSound } from './sound.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const sound = createSound();

function readBest() {
  try {
    const value = Number.parseFloat(window.localStorage.getItem(BEST_KEY) ?? '');
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best time then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.meta);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, (x, y) => renderer.toField(x, y));
  const totals = { time: 0, nearMisses: 0, throws: 0 };
  const runState = { screen: SCREEN_TITLE, best: readBest(), roomAge: 99, accumulator: 0, last: performance.now() };

  function announce(message) {
    status.textContent = message;
  }

  function meta() {
    return {
      totalTime: totals.time,
      nearMisses: totals.nearMisses,
      throws: totals.throws,
      best: runState.best,
      roomAge: runState.roomAge,
      mouse: runState.screen === SCREEN_PLAY ? input.mouse() : null,
    };
  }

  function startRun() {
    totals.time = 0;
    totals.nearMisses = 0;
    totals.throws = 0;
    world.reset(0);
    runState.roomAge = 0;
    runState.screen = SCREEN_PLAY;
    announce('Room I. Reach the Dawn Door unseen.');
  }

  function startRoom(levelIndex) {
    world.reset(levelIndex);
    runState.roomAge = 0;
    runState.screen = SCREEN_PLAY;
  }

  function handleEvents(events) {
    if (events & EVENT_STEP) sound.footstep();
    if (events & EVENT_THROW) sound.toss();
    if (events & EVENT_PING) sound.ping();
    if (events & EVENT_WARY) {
      sound.wary();
      totals.nearMisses += 1;
    }
    if (events & EVENT_CAUGHT) {
      sound.caught();
      runState.screen = SCREEN_CAUGHT;
      announce('Spotted. You were caught in the lamplight.');
      return;
    }
    if (!(events & EVENT_ESCAPED)) return;
    sound.escaped();
    if (world.state.levelIndex >= 2) {
      runState.screen = SCREEN_WIN;
      if (runState.best === null || totals.time < runState.best) {
        runState.best = totals.time;
        saveBest(runState.best);
      }
      announce('The archive sleeps on. You crossed all three rooms unseen.');
    } else {
      runState.screen = SCREEN_CLEAR;
      announce('Room cleared, unseen.');
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) sound.unlock();
    const screen = runState.screen;
    if (screen === SCREEN_TITLE && (actions & ACTION_CONFIRM)) {
      input.clearThrow();
      startRun();
    } else if (screen === SCREEN_CAUGHT && (actions & (ACTION_CONFIRM | ACTION_RESTART))) {
      input.clearThrow();
      startRoom(world.state.levelIndex);
    } else if (screen === SCREEN_CLEAR && (actions & ACTION_CONFIRM)) {
      input.clearThrow();
      startRoom(world.state.levelIndex + 1);
    } else if (screen === SCREEN_WIN && (actions & ACTION_CONFIRM)) {
      input.clearThrow();
      startRun();
    } else if (screen === SCREEN_PLAY && (actions & ACTION_PAUSE)) {
      runState.screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (screen === SCREEN_PAUSED && (actions & (ACTION_PAUSE | ACTION_CONFIRM))) {
      input.clearThrow();
      runState.screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function stepWorld() {
    const screen = runState.screen;
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { moveX: 0, moveY: 0, tiptoe: false, throwAt: null });
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    totals.time += STEP;
    runState.roomAge += STEP;
    const direction = input.direction();
    const events = world.step(STEP, {
      moveX: direction.x,
      moveY: direction.y,
      tiptoe: input.tiptoe(),
      throwAt: input.takeThrow(),
    });
    if (events & EVENT_THROW) totals.throws += 1;
    handleEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min((now - runState.last) / 1000, MAX_FRAME);
    runState.accumulator += elapsed;
    runState.last = now;
    handleActions();
    const active = runState.screen === SCREEN_TITLE || runState.screen === SCREEN_PLAY;
    if (active) {
      while (runState.accumulator >= STEP &&
        (runState.screen === SCREEN_TITLE || runState.screen === SCREEN_PLAY)) {
        stepWorld();
        runState.accumulator -= STEP;
      }
    } else {
      runState.accumulator = 0;
    }
    renderer.draw(world.state, runState.screen, meta());
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && runState.screen === SCREEN_PLAY) {
      runState.screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Moonlight Archive. Press Enter or click to slip in.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
