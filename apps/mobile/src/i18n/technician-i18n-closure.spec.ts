/**
 * Technician i18n closure guard (mirrors the Customer guard).
 *
 * Every `t('…')` key referenced anywhere in the Technician surface must
 * resolve to a real translation. A key that reaches the `translate`
 * fallback (`translate(key) === key`) would be rendered verbatim to the
 * technician — the closure policy forbids that.
 */

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { translate } from './use-i18n';

const TECHNICIAN_ROOTS = [
  path.resolve(__dirname, '../features/technician'),
  path.resolve(__dirname, '../../app/(technician)'),
];

function collectSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(full);
    return entry.isFile() && full.endsWith('.tsx') ? [full] : [];
  });
}

function referencedKeys(source: string): string[] {
  const keys: string[] = [];
  // Word boundary avoids matching the tail of calls like
  // `statusBrandAsset('pending')` / `applianceBrandAsset('...')`.
  const re = /\bt\(\s*'([^']+)'\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    if (match[1] !== undefined) keys.push(match[1]);
  }
  return keys;
}

describe('i18n closure — no raw keys in Technician surface', () => {
  const files = TECHNICIAN_ROOTS.flatMap((root) => collectSourceFiles(root));
  const refs = files.flatMap((file) =>
    referencedKeys(fs.readFileSync(file, 'utf8')).map((key) => ({ file, key })),
  );

  it('scans at least one technician source file', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('every referenced translation key resolves', () => {
    const unresolved = refs.filter(({ key }) => translate(key) === key);
    expect(unresolved).toEqual([]);
  });
});
