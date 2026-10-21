#!/usr/bin/env node
/*
 * Expo `export:embed` entry-file shim for Android release builds on Windows.
 *
 * CONTEXT
 * - The React Native Gradle plugin deliberately passes `--entry-file` (and
 *   the other bundle paths) *relative to the JS root* on Windows, to work
 *   around Gradle mishandling absolute paths with spaces
 *   (facebook/react-native#36076, `File.cliPath()` relativization).
 * - In a monorepo, `resolveAppEntry` returns an entry that lives OUTSIDE the
 *   app dir (pnpm virtual store:
 *   `<workspace>/node_modules/.pnpm/expo-router@.../node_modules/expo-router/entry.js`),
 *   so the relativized flag looks like
 *   `..\..\node_modules\.pnpm\expo-router@...\entry.js`.
 * - `@expo/cli@0.22` (Expo SDK 52) forwards that relative entry verbatim as
 *   Metro's `mainModuleName`, and Metro resolves it against the Metro
 *   *workspace* root (`getMetroServerRoot()` → pnpm workspace root), where
 *   the `..\..` escapes the drive → `:app:createBundleReleaseJsAndAssets`
 *   fails with `Unable to resolve module ... from <workspace>/.`.
 *   Debug builds are unaffected (bundling is skipped for debuggable variants).
 *
 * FIX (backport of upstream expo/expo#40563 `ensureAbsoluteEntryFile`, which
 * fixed this in newer CLI releases for "Windows and monorepos", issue
 * expo/expo#39738): absolutize a relative `--entry-file` against the current
 * working directory — which Gradle sets to the JS root (`apps/mobile`) —
 * before delegating to the real Expo CLI. Absolute entries are passed
 * through untouched, so POSIX behavior is unchanged.
 *
 * WIRED VIA: `android/app/build.gradle` → `react { cliFile = ... }`.
 * No machine-specific paths, no env hacks, no install-model changes.
 */
'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

function resolveRealExpoCli() {
  // Resolve exactly the way `android/app/build.gradle` does, so this shim
  // can never drift from the project's locked Expo version.
  const expoPkg = require.resolve('expo/package.json', { paths: [process.cwd()] });
  return require.resolve('@expo/cli', { paths: [expoPkg] });
}

function absolutizeEntryFile(argv) {
  const out = argv.slice();
  for (let i = 0; i < out.length; i++) {
    if (out[i] === '--entry-file' && i + 1 < out.length && !path.isAbsolute(out[i + 1])) {
      // Upstream parity: expo/expo#40563 `path.join(process.cwd(), entryFile)`.
      out[i + 1] = path.join(process.cwd(), out[i + 1]);
    } else if (out[i].startsWith('--entry-file=')) {
      const value = out[i].slice('--entry-file='.length);
      if (value && !path.isAbsolute(value)) {
        out[i] = `--entry-file=${path.join(process.cwd(), value)}`;
      }
    }
  }
  return out;
}

function main() {
  let realCli;
  try {
    realCli = resolveRealExpoCli();
  } catch (error) {
    console.error(`[expo-export-embed-cli] Could not resolve @expo/cli: ${error.message}`);
    process.exit(1);
  }
  const args = absolutizeEntryFile(process.argv.slice(2));
  const result = spawnSync(process.execPath, [realCli, ...args], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

main();
