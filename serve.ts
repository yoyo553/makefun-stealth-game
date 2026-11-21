// A tiny static file server for local play-testing (Node 22, standard library only).
// `node serve.ts --port 8080` serves this repository, so the game plays at
// http://localhost:8080/game/index.html. It refuses paths outside the repository and is
// a development convenience only, not part of the entry the grader runs.

import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const portArg = process.argv.find((a) => a.startsWith('--port='));
const port = portArg ? Number.parseInt(portArg.slice('--port='.length), 10) || 8080 : 8080;

const MIME_BY_EXTENSION = {
  html: 'text/html',
  js: 'application/javascript',
  json: 'application/json',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = url.pathname === '/' ? '/game/index.html' : url.pathname;
  const filePath = join(repoRoot, pathname);
  if (!existsSync(filePath) || !filePath.startsWith(repoRoot)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const data = readFileSync(filePath);
  const ext = filePath.split('.').pop() ?? '';
  const type = MIME_BY_EXTENSION[ext] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  res.end(data);
});
server.listen(port, () => console.log('Listening on http://localhost:' + port));
