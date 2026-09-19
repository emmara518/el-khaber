/**
 * Expo config plugin: Android release hardening for EL-KHABIR.
 *
 * Makes the git-ignored `android/` prebuild output reproducible by applying,
 * on every `expo prebuild`, the three release-critical customizations that
 * cannot be expressed in app.json:
 *
 *   1. `export:embed` entry-file shim — routes the React Gradle bundling step
 *      through `scripts/expo-export-embed-cli.js` (backport of upstream
 *      expo/expo#40563), fixing `:app:createBundleReleaseJsAndAssets` on
 *      Windows pnpm monorepos (expo/expo#39738). Without this, release
 *      bundling fails while debug builds (bundling skipped) keep working.
 *   2. Release signing from environment — `signingConfigs.release` reads
 *      MYAPP_UPLOAD_STORE_FILE/PASSWORD/KEY_ALIAS/KEY_PASSWORD and fails
 *      fast when any is missing, so a release can never silently ship
 *      debug-signed.
 *   3. Release network policy — `src/release` manifest overlay pins
 *      `usesCleartextTraffic="false"` with a system-anchors-only
 *      `network_security_config.xml`. Debug keeps dev HTTP behavior.
 *
 * All mods are anchor-guarded: if a future Expo template moves the anchor,
 * the mod warns (visible in prebuild output) instead of corrupting output.
 */

const fs = require('node:fs');
const path = require('node:path');

const { withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');

const SHIM_RELATIVE = '../../scripts/expo-export-embed-cli.js';

function warnOnce(tag, message) {
  console.warn(`[with-android-release-hardening] ${tag}: ${message}`);
}

/** 1 + 2 — patch android/app/build.gradle. */
function withReleaseBuildGradle(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      warnOnce('build.gradle', 'unexpected language, skipping groovy patches');
      return mod;
    }
    let src = mod.modResults.contents;

    // (1) Route bundling through the entry-file shim.
    const cliFileAnchor = /^\s*cliFile = new File\(\["node".*$/m;
    if (cliFileAnchor.test(src)) {
      src = src.replace(
        cliFileAnchor,
        `    cliFile = file("${SHIM_RELATIVE}") // with-android-release-hardening: entry-file shim (expo/expo#40563 backport)`,
      );
    } else {
      warnOnce('cliFile', 'anchor not found — export:embed shim NOT applied');
    }

    // (2) Release signing from environment (fail-fast, never debug-signed).
    // Mirrors the proven block in android/app/build.gradle exactly. The entry
    // is injected INSIDE the existing signingConfigs block (no duplicate block).
    const releaseSigningEntry = [
      '        release {',
      '            // Production/QA release signing is injected via environment variables',
      '            // (never committed). See docs/android-release-signing.md.',
      '            //   MYAPP_UPLOAD_STORE_FILE      - keystore path (absolute, or relative to android/app)',
      '            //   MYAPP_UPLOAD_STORE_PASSWORD  - keystore password',
      '            //   MYAPP_UPLOAD_KEY_ALIAS       - key alias',
      '            //   MYAPP_UPLOAD_KEY_PASSWORD    - key password',
      '            // A release build without these credentials fails fast on purpose:',
      '            // silently shipping a debug-signed "release" is worse than an error.',
      '            def uploadStoreFile = System.getenv("MYAPP_UPLOAD_STORE_FILE")',
      '            def uploadStorePassword = System.getenv("MYAPP_UPLOAD_STORE_PASSWORD")',
      '            def uploadKeyAlias = System.getenv("MYAPP_UPLOAD_KEY_ALIAS")',
      '            def uploadKeyPassword = System.getenv("MYAPP_UPLOAD_KEY_PASSWORD")',
      '            if (uploadStoreFile && uploadStorePassword && uploadKeyAlias && uploadKeyPassword) {',
      '                storeFile file(uploadStoreFile)',
      '                storePassword uploadStorePassword',
      '                keyAlias uploadKeyAlias',
      '                keyPassword uploadKeyPassword',
      '            } else {',
      '                throw new GradleException(',
      '                    "Release signing credentials are missing. Set MYAPP_UPLOAD_STORE_FILE, " +',
      '                    "MYAPP_UPLOAD_STORE_PASSWORD, MYAPP_UPLOAD_KEY_ALIAS and " +',
      '                    "MYAPP_UPLOAD_KEY_PASSWORD (see docs/android-release-signing.md).")',
      '            }',
      '        }',
    ].join('\n');
    if (!src.includes('MYAPP_UPLOAD_STORE_FILE')) {
      const signingAnchor = /^(\s*signingConfigs \{\n)/m;
      if (signingAnchor.test(src)) {
        src = src.replace(signingAnchor, `$1${releaseSigningEntry}\n`);
      } else {
        warnOnce('signing', 'signingConfigs anchor not found — env signing NOT applied');
      }
    }
    const releaseDebugAnchor = /(release \{\s*\n(?:.*\n)*?\s*)signingConfig signingConfigs\.debug/;
    if (releaseDebugAnchor.test(src)) {
      src = src.replace(
        releaseDebugAnchor,
        '$1signingConfig signingConfigs.release // with-android-release-hardening: never debug-signed',
      );
    }
    if (!src.includes('signingConfig signingConfigs.release')) {
      warnOnce('signing', 'release buildType still not on signingConfigs.release — check output');
    }

    mod.modResults.contents = src;
    return mod;
  });
}

const RELEASE_MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<!--
  Release-only manifest overlay (generated by with-android-release-hardening).
  Pins cleartext=false + a system-anchors-only network security config.
  Debug keeps dev HTTP via src/debug/AndroidManifest.xml.
-->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application
    android:usesCleartextTraffic="false"
    android:networkSecurityConfig="@xml/network_security_config" />
</manifest>
`;

const NETWORK_SECURITY_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by with-android-release-hardening. Release: HTTPS only. -->
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
`;

/** 3 — write src/release overlay files idempotently. */
function withReleaseNetworkPolicy(config) {
  return withDangerousMod(config, [
    'android',
    (mod) => {
      const appDir = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'release');
      const resXmlDir = path.join(appDir, 'res', 'xml');
      fs.mkdirSync(resXmlDir, { recursive: true });
      const manifestPath = path.join(appDir, 'AndroidManifest.xml');
      const nscPath = path.join(resXmlDir, 'network_security_config.xml');
      if (
        !fs.existsSync(manifestPath) ||
        fs.readFileSync(manifestPath, 'utf8') !== RELEASE_MANIFEST
      ) {
        fs.writeFileSync(manifestPath, RELEASE_MANIFEST);
      }
      if (!fs.existsSync(nscPath) || fs.readFileSync(nscPath, 'utf8') !== NETWORK_SECURITY_CONFIG) {
        fs.writeFileSync(nscPath, NETWORK_SECURITY_CONFIG);
      }
      return mod;
    },
  ]);
}

function withAndroidReleaseHardening(config) {
  config = withReleaseBuildGradle(config);
  config = withReleaseNetworkPolicy(config);
  return config;
}

module.exports = withAndroidReleaseHardening;
