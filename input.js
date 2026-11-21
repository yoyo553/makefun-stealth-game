// Keyboard and mouse, gathered in one place. The world wants, each step: a move
// direction, a tiptoe flag and at most one bookmark toss. Menus want one-shot actions
// (confirm, pause, restart). Clicks arrive in window pixels and are converted to room
// coordinates by the `toField` callback main.js supplies, since only the renderer knows
// the scale.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;

const MOVE_KEYS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
  KeyW: [0, -1],
  KeyS: [0, 1],
};

const ACTION_KEYS = {
  Enter: ACTION_CONFIRM,
  Space: ACTION_CONFIRM,
  Escape: ACTION_PAUSE,
  KeyP: ACTION_PAUSE,
  KeyR: ACTION_RESTART,
};

function isShift(code) {
  return code === 'ShiftLeft' || code === 'ShiftRight';
}

export function createInput(canvas, toField) {
  const held = new Set();
  let queuedActions = 0;
  let pendingThrow = null;
  let mouseField = null;

  function onKeyDown(event) {
    const code = event.code;
    if (MOVE_KEYS[code] || isShift(code)) {
      held.add(code);
      event.preventDefault();
    }
    const action = ACTION_KEYS[code];
    if (action) queuedActions |= action;
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onBlur() {
    held.clear();
  }

  function onMouseMove(event) {
    mouseField = toField(event.clientX, event.clientY);
  }

  function onMouseDown(event) {
    const point = toField(event.clientX, event.clientY);
    mouseField = point;
    pendingThrow = point;
    queuedActions |= ACTION_CONFIRM;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);

  return {
    /** The held move direction, each axis in -1..1 (not normalised; the world does that). */
    direction() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const move = MOVE_KEYS[code];
        if (!move) continue;
        x += move[0];
        y += move[1];
      }
      return { x, y };
    },
    tiptoe() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    /** One-shot menu actions since the last call; reading them clears them. */
    takeActions() {
      const taken = queuedActions;
      queuedActions = 0;
      return taken;
    },
    /** The room point of the latest click not yet used as a bookmark toss, or null. */
    takeThrow() {
      const taken = pendingThrow;
      pendingThrow = null;
      return taken;
    },
    /** Discard a click without tossing (menus use clicks as "confirm"). */
    clearThrow() {
      pendingThrow = null;
    },
    mouse() {
      return mouseField;
    },
  };
}
