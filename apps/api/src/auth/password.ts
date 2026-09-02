/**
 * Password hashing using argon2id. argon2id is the OWASP-recommended
 * password hashing algorithm as of this writing. Never log, return, or
 * persist plaintext passwords.
 *
 * Source: docs/05_TECH_ARCHITECTURE.md §6, docs/10_ENGINEERING_RULES.md §24.
 */

import argon2 from 'argon2';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plaintext: string): Promise<string> {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error('hashPassword: empty input');
  }
  return argon2.hash(plaintext, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, plaintext: string): Promise<boolean> {
  if (typeof hash !== 'string' || hash.length === 0) {
    return false;
  }
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    return false;
  }
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    return false;
  }
}
