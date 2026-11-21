// Hand-in program for "Moonlight Archive" (Node 22, standard library only). The game is
// the static site under game/: one page plus ES modules, no build step, no network. This
// program copies game/ and screenshots/ into the output directory and writes dossier.json
// there, built by buildDossier from the vendored make.fun library, exactly as the grader
// expects. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// To play locally, run `node serve.ts` and open http://localhost:8080/game/index.html.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const GAME_TITLE = 'Moonlight Archive';
const HAND_IN_DIRS = ['game', 'screenshots'];

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyDir(name) {
  const source = join(root, name);
  if (!existsSync(source)) return;
  const target = join(outDir, name);
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
for (const dir of HAND_IN_DIRS) copyDir(dir);

// The caps mirror the scorer's own limits (reference/gate.json): at most four screenshots
// of 256 KiB each, at most 993 files and 48 MiB under game/, no game path over 1,000
// bytes, and the dossier text capped at 160 KiB. Only text_max_bytes shapes the bytes
// written; the rest refuse an entry the scorer would refuse anyway.
const dossierOptions = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};
const dossier = buildDossier(outDir, dossierOptions);
writeFileSync(join(outDir, 'dossier.json'), dossier);

console.log(`${GAME_TITLE}: game, screenshots and dossier.json written to ${outDir}`);
