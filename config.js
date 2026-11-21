// Every tuning number and colour for Moonlight Archive in one place. The library is a
// fixed 1280x720 logical room; the renderer scales it to the window, so no rule below
// depends on the size of the screen it happens to be shown on.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best (fastest) full run is kept between visits, this browser only. */
export const BEST_KEY = 'moonlight-archive.best';

export const PLAYER = {
  radius: 13,
  walkSpeed: 150,
  tiptoeSpeed: 82,
  stepInterval: 0.36,
  stepNoiseRadius: 120,
  // stepInterval: seconds between footstep ripples while walking (tiptoeing makes none).
  // stepNoiseRadius: how far a walking footstep carries; a warden inside it turns to look.
};

export const WARDEN = {
  radius: 14,
  patrolSpeed: 64,
  investigateSpeed: 96,
  pauseSeconds: 1.1,
  sweepAngle: 0.7,
  sweepSpeed: 0.9,
  // pauseSeconds: how long a warden stands at a patrol point before walking on.
  // sweepAngle: radians a paused warden's gaze sweeps to each side of the path direction.
};

export const VISION = {
  range: 218,
  halfAngle: 0.62,
  fillRate: 1.35,
  decayRate: 0.3,
  unseenGrace: 0.8,
  suspiciousAt: 0.32,
  // fillRate: awareness gained per second at point blank, before distance and stance scale it.
  // decayRate: awareness lost per second once the player has been out of sight for the grace period.
  // suspiciousAt: at this awareness a warden shows "?" and stops to stare.
};

export const BOOKMARK = {
  throwRange: 280,
  noiseRadius: 215,
  cooldown: 1.1,
  flightSeconds: 0.45,
  // throwRange: how far from the player a tossed bookmark can land.
  // noiseRadius: how far its papery flutter carries; wardens inside it come to look.
};

export const PALETTE = {
  // Room.
  backdrop: '#0d0f16',
  floor: '#181b29',
  floorAlt: '#1d2133',
  rugA: '#221d38',
  rugB: '#27202c',
  wall: '#39415f',
  wallEdge: '#5b6691',
  // Furniture.
  shelf: '#5a4232',
  shelfEdge: '#7d5c40',
  table: '#6b4e35',
  tableEdge: '#8a6845',
  lamp: '#ffd98a',
  plant: '#2e6b46',
  plantLight: '#3f915f',
  pillar: '#4a5170',
  pillarEdge: '#6a7396',
  // Actors.
  player: '#3fd2c5',
  playerHood: '#17705f',
  warden: '#ece5d3',
  wardenCap: '#333d5e',
  // Vision cones (RGB triplets, filled with alpha by the renderer).
  coneCalm: '255, 198, 92',
  coneWary: '255, 145, 66',
  coneAlert: '255, 84, 74',
  // Exit and text.
  exit: '#ffd166',
  exitGlow: '255, 209, 102',
  text: '#eef1f5',
  muted: '#9aa3b8',
  panel: 'rgba(13, 16, 26, 0.86)',
  danger: '#ff5449',
};
