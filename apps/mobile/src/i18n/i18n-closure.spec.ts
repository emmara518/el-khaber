/**
 * Customer i18n closure guard (TASK-001).
 *
 * Two guarantees:
 *  1. The Fault Guide empty-appliances keys resolve to Arabic copy
 *     (regression guard for ISSUE-001 — missing keys rendered raw).
 *  2. Every `t('…')` key referenced anywhere in the Customer surface
 *     resolves to a real translation. A key that reaches the `translate`
 *     fallback (`translate(key) === key`) would be rendered verbatim to
 *     the customer — the closure policy forbids that.
 */

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { translate } from './use-i18n';

const CUSTOMER_ROOTS = [
  path.resolve(__dirname, '../features/customer'),
  path.resolve(__dirname, '../../app/(customer)'),
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
  const re = /t\(\s*'([^']+)'\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    if (match[1] !== undefined) keys.push(match[1]);
  }
  return keys;
}

describe('i18n closure — fault empty-appliances', () => {
  const keys = ['fault.noAppliances.title', 'fault.noAppliances.body', 'fault.noAppliances.action'];

  it.each(keys)('defines %s with non-empty Arabic copy', (key) => {
    const value = translate(key);
    expect(value).not.toBe(key); // not the raw-key fallback
    expect(value.trim().length).toBeGreaterThan(0);
    expect(/[\u0600-\u06FF]/.test(value)).toBe(true); // contains Arabic
  });
});

describe('i18n closure — no raw keys in Customer surface', () => {
  const files = CUSTOMER_ROOTS.flatMap((root) => collectSourceFiles(root));
  const refs = files.flatMap((file) =>
    referencedKeys(fs.readFileSync(file, 'utf8')).map((key) => ({ file, key })),
  );

  it('scans at least one customer source file', () => {
    expect(files.length).toBeGreaterThan(0);
    expect(refs.length).toBeGreaterThan(0);
  });

  it('every referenced translation key resolves', () => {
    const unresolved = refs.filter(({ key }) => translate(key) === key);
    expect(unresolved).toEqual([]);
  });
});
