/**
 * Unit tests for the central authorization policy.
 * Source: docs/10_ENGINEERING_RULES.md §15, §22.
 */

import { describe, expect, it } from 'vitest';

import { can, type Actor } from '../src/common/policy/can';

const userActor: Actor = { kind: 'user', id: 'u1', role: 'customer', status: 'active' };
const suspendedUser: Actor = { kind: 'user', id: 'u2', role: 'customer', status: 'suspended' };
const adminActor: Actor = { kind: 'admin', id: 'a1', role: 'super_admin', status: 'active' };
const anon: Actor = { kind: 'anonymous' };

describe('central policy', () => {
  it('allows public auth actions for everyone', () => {
    for (const action of ['auth:register', 'auth:login', 'auth:refresh', 'auth:logout', 'auth:forgot-password', 'auth:reset-password'] as const) {
      expect(can(anon, action)).toBe(true);
      expect(can(userActor, action)).toBe(true);
      expect(can(adminActor, action)).toBe(true);
    }
  });

  it('allows me:read for active users only', () => {
    expect(can(userActor, 'me:read')).toBe(true);
    expect(can(suspendedUser, 'me:read')).toBe(false);
    expect(can(adminActor, 'me:read')).toBe(false);
    expect(can(anon, 'me:read')).toBe(false);
  });

  it('allows admin actions only for active admins', () => {
    expect(can(adminActor, 'admin:login')).toBe(true);
    expect(can(adminActor, 'admin:me')).toBe(true);
    expect(can(userActor, 'admin:login')).toBe(false);
    expect(can(anon, 'admin:login')).toBe(false);
  });

  it('denies unknown actions for every actor', () => {
    // @ts-expect-error — exercising the default-deny branch
    expect(can(userActor, 'unknown:action')).toBe(false);
  });
});
