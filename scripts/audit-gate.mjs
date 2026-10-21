#!/usr/bin/env node
/**
 * Fail-closed production dependency audit gate.
 *
 * Rules:
 * - Any critical advisory fails the build.
 * - Any high advisory fails the build unless its GitHub advisory ID is
 *   allowlisted in security/audit-allowlist.json.
 * - Allowlist entries MUST carry a justification, an owner and an expiry
 *   date. Expired entries fail the build, so the allowlist self-destructs.
 * - Moderate/low findings are reported but do not fail the gate.
 *
 * The gate reads the machine-readable advisory IDs from the package
 * manager output. A human-readable accepted-risks document is NOT a
 * substitute for this check.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const allowlistPath = resolve(root, 'security/audit-allowlist.json');

const SEVERITIES = new Set(['critical', 'high']);

function loadAllowlist() {
  const raw = JSON.parse(readFileSync(allowlistPath, 'utf8'));
  const entries = Array.isArray(raw.entries) ? raw.entries : [];
  const byId = new Map();
  const today = new Date().toISOString().slice(0, 10);
  const problems = [];

  for (const entry of entries) {
    const missing = ['id', 'package', 'justification', 'owner', 'expiresAt'].filter(
      (key) => typeof entry[key] !== 'string' || entry[key].trim() === '',
    );
    if (missing.length > 0) {
      problems.push(`allowlist entry ${entry.id ?? '<no id>'} missing: ${missing.join(', ')}`);
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.expiresAt)) {
      problems.push(`allowlist entry ${entry.id} has invalid expiresAt (YYYY-MM-DD required)`);
      continue;
    }
    if (entry.expiresAt < today) {
      problems.push(
        `allowlist entry ${entry.id} (${entry.package}) expired on ${entry.expiresAt}; review or remediate`,
      );
      continue;
    }
    byId.set(entry.id, entry);
  }

  return { byId, problems };
}

function runAudit() {
  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  try {
    return execFileSync(command, ['audit', '--prod', '--json'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
      shell: process.platform === 'win32',
    });
  } catch (error) {
    // pnpm exits non-zero when findings exist; stdout still holds the report.
    if (typeof error.stdout === 'string' && error.stdout.trim().startsWith('{')) {
      return error.stdout;
    }
    throw error;
  }
}

function collectFindings(report) {
  const advisories = report.advisories ?? {};
  const findings = new Map();

  for (const advisory of Object.values(advisories)) {
    if (!SEVERITIES.has(advisory.severity)) continue;
    const id = advisory.github_advisory_id ?? advisory.id ?? 'unknown';
    const key = `${advisory.severity}:${advisory.module_name}:${id}`;
    if (!findings.has(key)) {
      findings.set(key, {
        id,
        severity: advisory.severity,
        package: advisory.module_name,
        vulnerable: advisory.vulnerable_versions,
        patched: advisory.patched_versions,
        title: advisory.title,
      });
    }
  }

  return [...findings.values()];
}

const { byId, problems } = loadAllowlist();
if (problems.length > 0) {
  console.error('Audit allowlist is invalid:');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const report = JSON.parse(runAudit());
const findings = collectFindings(report);

const violations = [];
for (const finding of findings) {
  const waiver = byId.get(finding.id);
  if (finding.severity === 'critical') {
    violations.push({ ...finding, reason: 'critical advisories are never waivable' });
    continue;
  }
  if (!waiver) {
    violations.push({ ...finding, reason: 'no allowlist entry' });
    continue;
  }
  if (waiver.package !== finding.package) {
    violations.push({
      ...finding,
      reason: `allowlist entry is for package '${waiver.package}', not '${finding.package}'`,
    });
  }
}

const metadata = report.metadata?.vulnerabilities ?? {};
console.log(
  `audit: ${metadata.critical ?? 0} critical, ${metadata.high ?? 0} high, ` +
    `${metadata.moderate ?? 0} moderate, ${metadata.low ?? 0} low (production deps)`,
);

for (const waiver of byId.values()) {
  console.log(`waived: ${waiver.id} ${waiver.package} until ${waiver.expiresAt} (${waiver.owner})`);
}

if (violations.length > 0) {
  console.error('\nSecurity audit gate FAILED:');
  for (const v of violations) {
    console.error(`  - [${v.severity}] ${v.package} ${v.vulnerable} (${v.id}): ${v.reason}`);
  }
  process.exit(1);
}

console.log('Security audit gate passed.');
