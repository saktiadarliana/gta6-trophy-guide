// Leonida Trophy Guide — hand-in program (Node 22, standard library only).
//
// The entry itself is plain static files in app/ (index.html, style.css, app.js and
// data/trophies.json): a browser opens app/index.html and the guide runs offline.
// This program only delivers those files: it copies app/ and screenshots/ from
// beside this file into the output directory and writes dossier.json there with
// buildDossier from the vendored make.fun library. vendor/makefun-frontend.ts is
// the kit's copy and must stay unchanged — the scorer rebuilds the dossier from
// the same library and compares the two byte for byte.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps mirror the scorer's gate: at most 4 screenshots of 256 KiB each, app/
// at most 993 files and 48 MiB, and the dossier text capped at 160 KiB.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
