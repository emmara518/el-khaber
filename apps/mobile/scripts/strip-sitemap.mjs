#!/usr/bin/env node
/**
 * Expo Router emits a development-only `/_sitemap` page into the static
 * web export. It exposes the route inventory and must not ship to users.
 *
 * Removing the emitted file is stronger than a runtime route block: the
 * server has nothing to serve (404). CI additionally asserts the artifact
 * is absent after every web export.
 */

import { existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(here, '..', 'dist-web');

const targets = [
  join(outputDir, '_sitemap.html'),
  join(outputDir, '_sitemap'),
  join(outputDir, '_sitemap.txt'),
];

let removed = 0;
for (const target of targets) {
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
    removed += 1;
    console.log(`[strip-sitemap] removed ${target}`);
  }
}

if (removed === 0) {
  console.log('[strip-sitemap] no sitemap artifact present');
}
