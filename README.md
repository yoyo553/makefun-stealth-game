# Moonlight Archive

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/yoyo553/makefun-stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/yoyo553/makefun-stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

An original top-down stealth game, built for make.fun's "best stealth game" bounty. The
library sleeps; its wardens do not. Creep through three rooms — the Reading Room, the Long
Stacks and the Vault of Dawn — and slip out of each room's Dawn Door without being seen.

## How to play

- **WASD / arrow keys** — move.
- **Shift** — tiptoe: slower, silent, and slower to be noticed.
- **Click** — toss a bookmark. Its papery flutter pulls a nearby warden's gaze away.
- **Esc / P** — pause. **R** — retry a room after being caught.

Each warden patrols a set route, sweeping a pool of lamplight (a vision cone) ahead of it.
Walls, shelves, tables and plants all block the light. Being seen fills the **SEEN**
meter; a warden who is only suspicious shows "?" and stares, so breaking line of sight in
time lets the meter drain and saves you. Walking is heard — footsteps ripple, and a warden
in earshot comes to look. Reaching the Dawn Door ends the room; crossing all three rooms
unseen wins the game.

## Running it locally

Needs Node.js 22.18 or later.

```
node serve.ts          # serves the repository at http://localhost:8080
```

Then open http://localhost:8080/game/index.html in a desktop browser and play. The game is
plain static files under `game/`: no build step, no network requests.

## Handing it in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` into the
output directory and writes `dossier.json` there, built with `buildDossier` from
`vendor/makefun-game.ts`:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `game/index.html` — the page: one canvas and a screen-reader status line
- `game/src/config.js` — every tuning number and colour
- `game/src/levels.js` — the three rooms as data: cover, patrols, exits
- `game/src/vision.js` — raycast sight: cone polygons and line-of-sight tests
- `game/src/world.js` — the simulation: movement, hearing, awareness, catching, escaping
- `game/src/input.js` — keyboard and mouse
- `game/src/render.js` — all drawing: the room, the lamplight, the HUD and the screens
- `game/src/sound.js` — small WebAudio sounds, synthesised, no audio files
- `game/src/shots.js` — the deterministic scenes behind the screenshots (`?shot=…`)
- `game/src/main.js` — boot, the fixed-step loop and the screen changes
- `screenshots/` — four real renders of the game: the title, play, a near-catch, the win
- `shots.json` — which scene and seed produced each screenshot

Referral code: {referral_code}

MIT licensed (see `LICENSE`). All names, art, levels and sounds are original to this game.
