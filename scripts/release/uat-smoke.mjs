#!/usr/bin/env node
/**
 * Read-only UAT smoke verification.
 *
 *   node scripts/release/uat-smoke.mjs \
 *     --api https://<api-host>/api/v1 \
 *     --web https://<web-host> \
 *     --expected-sha <40-char release SHA>
 *
 * What it proves:
 *   - API liveness (/health), readiness (/ready), and build identity (/version)
 *   - the running commit matches the intended release SHA
 *   - the web app responds, has a non-empty Arabic title, and the exported
 *     sitemap is gone (404)
 *
 * What it does NOT prove:
 *   - rendered `<main>` landmark, RTL layout, or interaction quality. Those
 *     require a browser pass (see docs/releases/UAT-DEPLOYMENT-GATE.md).
 *
 * Every request is a GET. The script never authenticates, never writes data,
 * and never prints environment values.
 */

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return '';
  const value = args[i + 1];
  if (value === undefined || value.startsWith('--')) {
    console.error(`--${name} requires a value`);
    process.exit(2);
  }
  return value.replace(/\/$/, '');
}

const apiBase = arg('api');
const webBase = arg('web');
const expectedSha = arg('expected-sha').toLowerCase();

if (apiBase === '' || webBase === '') {
  console.error('Usage: node scripts/release/uat-smoke.mjs --api <base> --web <url> [--expected-sha <sha>]');
  process.exit(2);
}

const results = [];
function record(name, status, detail) {
  results.push({ name, status, detail });
  console.log(`${status === 'pass' ? 'PASS' : status === 'warn' ? 'WARN' : 'FAIL'}  ${name}${detail ? ` - ${detail}` : ''}`);
}

async function getJson(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000),
    headers: { accept: 'application/json' },
  });
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  return { response, body, text };
}

async function main() {
  let commit = 'unknown';

  try {
    const health = await getJson(`${apiBase}/health`);
    if (health.response.status === 200 && health.body?.data?.status === 'ok') {
      record('api.health', 'pass', 'status=ok');
    } else {
      record('api.health', 'fail', `HTTP ${health.response.status}`);
    }
  } catch (error) {
    record('api.health', 'fail', error instanceof Error ? error.message : 'request failed');
  }

  try {
    const ready = await getJson(`${apiBase}/ready`);
    if (ready.response.status === 200 && ready.body?.data?.status === 'ready') {
      record('api.ready', 'pass', 'database+migrations+schema ok');
    } else {
      record('api.ready', 'fail', `HTTP ${ready.response.status}`);
    }
  } catch (error) {
    record('api.ready', 'fail', error instanceof Error ? error.message : 'request failed');
  }

  try {
    const version = await getJson(`${apiBase}/version`);
    commit = typeof version.body?.data?.commit === 'string' ? version.body.data.commit : 'unknown';
    if (version.response.status === 200 && commit !== 'unknown') {
      record('api.version', 'pass', `commit=${commit}`);
    } else {
      record('api.version', 'warn', 'commit not exposed (HTTP ' + version.response.status + ')');
    }
  } catch (error) {
    record('api.version', 'fail', error instanceof Error ? error.message : 'request failed');
  }

  if (expectedSha === '') {
    record('api.commit-match', 'warn', 'no --expected-sha supplied; deployment provenance UNVERIFIED');
  } else if (commit === 'unknown') {
    record('api.commit-match', 'fail', 'running commit is unknown; cannot verify release SHA');
  } else if (expectedSha.startsWith(commit) || commit.startsWith(expectedSha.slice(0, commit.length))) {
    record('api.commit-match', 'pass', `${commit} matches expected ${expectedSha.slice(0, 12)}`);
  } else {
    record('api.commit-match', 'fail', `running ${commit} != expected ${expectedSha.slice(0, 12)}`);
  }

  try {
    const response = await fetch(webBase, {
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
      headers: { accept: 'text/html' },
    });
    const html = await response.text();
    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? '';
    if (response.status === 200 && title.includes('الخبير')) {
      record('web.title', 'pass', title);
    } else {
      record('web.title', 'fail', `HTTP ${response.status}; title='${title.slice(0, 60)}'`);
    }
    const mainCount = (html.match(/<main[\s>]/gi) ?? []).length;
    if (mainCount === 1) {
      record('web.main-static', 'pass', 'one <main> in served HTML');
    } else {
      record(
        'web.main-static',
        'warn',
        `${mainCount} <main> in served HTML (client-rendered app; confirm in a browser)`,
      );
    }
  } catch (error) {
    record('web.load', 'fail', error instanceof Error ? error.message : 'request failed');
  }

  try {
    const response = await fetch(`${webBase}/_sitemap`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000),
    });
    if (response.status === 404) {
      record('web.sitemap-removed', 'pass', 'HTTP 404');
    } else {
      record('web.sitemap-removed', 'fail', `HTTP ${response.status} (expected 404)`);
    }
  } catch (error) {
    record('web.sitemap-removed', 'fail', error instanceof Error ? error.message : 'request failed');
  }

  const failed = results.filter((item) => item.status === 'fail');
  console.log('');
  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        apiBase,
        webBase,
        expectedSha: expectedSha || null,
        runningCommit: commit,
        passed: results.filter((item) => item.status === 'pass').length,
        warnings: results.filter((item) => item.status === 'warn').length,
        failed: failed.length,
      },
      null,
      2,
    ),
  );

  process.exitCode = failed.length === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
