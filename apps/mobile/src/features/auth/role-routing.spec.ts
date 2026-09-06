/**
 * Phase 1 tests: auth route guard + role resolution.
 *
 * Covers: unauthenticated routing, authenticated customer /
 * technician / merchant routing, cross-role denial (an authenticated
 * user can never stay in another role's group), invalid-role safe
 * recovery, and bootstrap (unknown) handling.
 */

import { describe, expect, it } from 'vitest';

import {
  getGroupForRole,
  getHomeForRole,
  groupForSegments,
  isRole,
  resolveRouteForSession,
} from './role-routing';

describe('role predicate', () => {
  it('accepts only the three locked roles', () => {
    expect(isRole('customer')).toBe(true);
    expect(isRole('technician')).toBe(true);
    expect(isRole('merchant')).toBe(true);
    expect(isRole('vendor')).toBe(false);
    expect(isRole('admin')).toBe(false);
    expect(isRole(null)).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });

  it('maps each role to its own home', () => {
    expect(getHomeForRole('customer')).toBe('/(customer)');
    expect(getHomeForRole('technician')).toBe('/(technician)');
    expect(getHomeForRole('merchant')).toBe('/(merchant)');
    expect(getHomeForRole('vendor')).toBeNull();
    expect(getHomeForRole(null)).toBeNull();
  });

  it('never maps a role to another role group', () => {
    expect(getGroupForRole('customer')).toBe('customer');
    expect(getGroupForRole('technician')).toBe('technician');
    expect(getGroupForRole('merchant')).toBe('merchant');
    expect(getGroupForRole('admin')).toBeNull();
  });
});

describe('segment grouping', () => {
  it('classifies route groups', () => {
    expect(groupForSegments(['(customer)'])).toBe('customer');
    expect(groupForSegments(['(technician)', 'orders'])).toBe('technician');
    expect(groupForSegments(['(merchant)'])).toBe('merchant');
    expect(groupForSegments(['login'])).toBe('public');
    expect(groupForSegments([])).toBe('public');
  });
});

describe('route guard', () => {
  it('keeps bootstrapping sessions on Splash', () => {
    // Public route (Splash itself): no navigation while unknown.
    expect(resolveRouteForSession({ status: 'unknown', role: null }, 'public')).toBeNull();
    // Stale deep route during bootstrap: back to Splash.
    expect(resolveRouteForSession({ status: 'unknown', role: null }, 'customer')).toBe('/');
  });

  it('keeps anonymous users on public routes, pushes them out of shells', () => {
    expect(resolveRouteForSession({ status: 'anonymous', role: null }, 'public')).toBeNull();
    expect(resolveRouteForSession({ status: 'anonymous', role: null }, 'customer')).toBe('/login');
    expect(resolveRouteForSession({ status: 'anonymous', role: null }, 'technician')).toBe('/login');
    expect(resolveRouteForSession({ status: 'anonymous', role: null }, 'merchant')).toBe('/login');
  });

  it('routes each authenticated role to its own home from public routes', () => {
    expect(resolveRouteForSession({ status: 'authenticated', role: 'customer' }, 'public')).toBe('/(customer)');
    expect(resolveRouteForSession({ status: 'authenticated', role: 'technician' }, 'public')).toBe('/(technician)');
    expect(resolveRouteForSession({ status: 'authenticated', role: 'merchant' }, 'public')).toBe('/(merchant)');
  });

  it('keeps an authenticated user inside its own shell without redirect loops', () => {
    expect(resolveRouteForSession({ status: 'authenticated', role: 'customer' }, 'customer')).toBeNull();
    expect(resolveRouteForSession({ status: 'authenticated', role: 'technician' }, 'technician')).toBeNull();
    expect(resolveRouteForSession({ status: 'authenticated', role: 'merchant' }, 'merchant')).toBeNull();
  });

  it('denies cross-role shells (never trusts a local role flag)', () => {
    expect(resolveRouteForSession({ status: 'authenticated', role: 'customer' }, 'technician')).toBe('/(customer)');
    expect(resolveRouteForSession({ status: 'authenticated', role: 'technician' }, 'merchant')).toBe('/(technician)');
    expect(resolveRouteForSession({ status: 'authenticated', role: 'merchant' }, 'customer')).toBe('/(merchant)');
  });

  it('recovers invalid/unknown roles through the auth flow, never a shell', () => {
    expect(resolveRouteForSession({ status: 'authenticated', role: 'vendor' }, 'customer')).toBe('/login');
    expect(resolveRouteForSession({ status: 'authenticated', role: null }, 'public')).toBe('/login');
    expect(resolveRouteForSession({ status: 'authenticated', role: 'admin' }, 'merchant')).toBe('/login');
  });
});
