// The three rooms of the Moonlight Archive, as data: where the shelves, tables, plants
// and pillars stand (every one of them blocks both walking and sight), where each warden
// patrols, where the player starts and where the Dawn Door waits. Patrol paths are
// written to stay in the open lanes between the shelves, so a patient player can learn
// every route.
//
// Cover kinds: 'shelf' (a bookcase), 'table' (a reading table with a lamp), 'plant' (a
// potted fern) and 'pillar' (a stone column). A warden with a one-point path is a
// sentinel: it stands there and sweeps its gaze from side to side.

export const LEVELS = [
  {
    name: 'Room I — The Reading Room',
    intro: 'Cross the reading room and slip out of the Dawn Door, unseen.',
    start: { x: 92, y: 612 },
    exit: { x: 1136, y: 26, w: 104, h: 60 },
    rugs: [
      { x: 340, y: 92, w: 820, h: 268, tone: 'A' },
      { x: 340, y: 412, w: 820, h: 238, tone: 'B' },
    ],
    cover: [
      { kind: 'shelf', x: 280, y: 108, w: 40, h: 236 },
      { kind: 'shelf', x: 280, y: 428, w: 40, h: 196 },
      { kind: 'shelf', x: 560, y: 108, w: 40, h: 236 },
      { kind: 'shelf', x: 560, y: 428, w: 40, h: 196 },
      { kind: 'shelf', x: 840, y: 108, w: 40, h: 236 },
      { kind: 'shelf', x: 840, y: 428, w: 40, h: 196 },
      { kind: 'table', x: 408, y: 306, w: 128, h: 42 },
      { kind: 'table', x: 688, y: 306, w: 128, h: 42 },
      { kind: 'table', x: 968, y: 306, w: 128, h: 42 },
      { kind: 'plant', x: 150, y: 120, w: 54, h: 54 },
      { kind: 'plant', x: 1090, y: 560, w: 54, h: 54 },
    ],
    wardens: [
      { path: [[170, 74], [1050, 74]] },
      { path: [[1164, 640], [1164, 180]] },
    ],
  },
  {
    name: 'Room II — The Long Stacks',
    intro: 'The stacks are staggered and the wardens cross. Time the gaps.',
    start: { x: 84, y: 84 },
    exit: { x: 1140, y: 624, w: 104, h: 66 },
    rugs: [
      { x: 120, y: 226, w: 1040, h: 86, tone: 'B' },
      { x: 120, y: 540, w: 900, h: 130, tone: 'A' },
    ],
    cover: [
      { kind: 'shelf', x: 150, y: 170, w: 330, h: 38 },
      { kind: 'shelf', x: 630, y: 170, w: 330, h: 38 },
      { kind: 'shelf', x: 330, y: 330, w: 330, h: 38 },
      { kind: 'shelf', x: 810, y: 330, w: 300, h: 38 },
      { kind: 'shelf', x: 150, y: 500, w: 330, h: 38 },
      { kind: 'shelf', x: 630, y: 500, w: 330, h: 38 },
      { kind: 'table', x: 520, y: 386, w: 110, h: 40 },
      { kind: 'plant', x: 1150, y: 120, w: 54, h: 54 },
      { kind: 'plant', x: 84, y: 600, w: 54, h: 54 },
    ],
    wardens: [
      { path: [[120, 269], [1160, 269]] },
      { path: [[1160, 445], [120, 445]] },
      { path: [[1064, 560]], sweep: true },
    ],
  },
  {
    name: 'Room III — The Vault of Dawn',
    intro: 'One sentinel watches the Dawn Door itself. Make it look away.',
    start: { x: 70, y: 360 },
    exit: { x: 588, y: 26, w: 104, h: 60 },
    rugs: [
      { x: 300, y: 300, w: 680, h: 160, tone: 'A' },
      { x: 330, y: 96, w: 620, h: 90, tone: 'B' },
    ],
    cover: [
      { kind: 'shelf', x: 180, y: 140, w: 38, h: 200 },
      { kind: 'shelf', x: 180, y: 420, w: 38, h: 200 },
      { kind: 'shelf', x: 1062, y: 140, w: 38, h: 200 },
      { kind: 'shelf', x: 1062, y: 420, w: 38, h: 200 },
      { kind: 'shelf', x: 330, y: 240, w: 240, h: 38 },
      { kind: 'shelf', x: 710, y: 240, w: 240, h: 38 },
      { kind: 'shelf', x: 330, y: 470, w: 240, h: 38 },
      { kind: 'shelf', x: 710, y: 470, w: 240, h: 38 },
      { kind: 'pillar', x: 520, y: 330, w: 46, h: 46 },
      { kind: 'pillar', x: 714, y: 330, w: 46, h: 46 },
      { kind: 'table', x: 452, y: 140, w: 120, h: 42 },
      { kind: 'table', x: 708, y: 556, w: 120, h: 42 },
      { kind: 'plant', x: 250, y: 620, w: 54, h: 54 },
      { kind: 'plant', x: 976, y: 620, w: 54, h: 54 },
      { kind: 'plant', x: 613, y: 596, w: 54, h: 54 },
    ],
    wardens: [
      { path: [[140, 84], [1140, 84]] },
      { path: [[300, 404], [980, 404]] },
      { path: [[140, 640], [140, 120]] },
      { path: [[640, 150]], sweep: true },
    ],
  },
];
