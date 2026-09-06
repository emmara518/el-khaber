/**
 * Role resolution for the role-aware app shell.
 *
 * Pure functions (no React, no router) so the routing contract is
 * unit-testable. The authenticated role ALWAYS comes from the
 * session user (`useAuthStore().user.role`); the account-type choice
 * made during registration is only an intent passed to the existing
 * register call and is never trusted after authentication.
 *
 * Source: docs/03_USER_FLOWS.md §2–§5, docs/10_ENGINEERING_RULES.md §14–§15.
 */

import type { Role } from '@khabir/shared-types';

export type AuthStatus = 'unknown' | 'anonymous' | 'authenticated';

/** Group segment (without parentheses) that owns the current route. */
export type RouteGroup = 'customer' | 'technician' | 'merchant' | 'public';

const ROLE_HOME: Record<Role, '/(customer)' | '/(technician)' | '/(merchant)'> = {
  customer: '/(customer)',
  technician: '/(technician)',
  merchant: '/(merchant)',
};

const GROUP_FOR_ROLE: Record<Role, RouteGroup> = {
  customer: 'customer',
  technician: 'technician',
  merchant: 'merchant',
};

export function isRole(value: unknown): value is Role {
  return value === 'customer' || value === 'technician' || value === 'merchant';
}

/** Home route for an authenticated role. Returns null for unknown roles. */
export function getHomeForRole(role: unknown): string | null {
  if (!isRole(role)) return null;
  return ROLE_HOME[role];
}

/** Group that an authenticated role is allowed to visit. */
export function getGroupForRole(role: unknown): RouteGroup | null {
  if (!isRole(role)) return null;
  return GROUP_FOR_ROLE[role];
}

export interface SessionSnapshot {
  status: AuthStatus;
  role: unknown;
}

/**
 * Resolve where the app should be.
 *
 * Returns the route to navigate to, or null when the current location
 * is already correct and no navigation should happen.
 *
 * - `unknown` (bootstrapping) → `/` (Splash owns the loading state).
 * - `anonymous` inside a role group → `/login`.
 * - `anonymous` on a public route → null (stay).
 * - `authenticated` with a known role outside its group → its home.
 * - `authenticated` with an unknown role → `/login` (safe recovery;
 *   the caller signs out first).
 */
export function resolveRouteForSession(
  session: SessionSnapshot,
  currentGroup: RouteGroup,
): string | null {
  if (session.status === 'unknown') {
    return currentGroup === 'public' ? null : '/';
  }
  if (session.status === 'anonymous') {
    return currentGroup === 'public' ? null : '/login';
  }
  const group = getGroupForRole(session.role);
  if (group === null) {
    // Invalid/unknown role: recover through the auth flow, never
    // through a role shell.
    return '/login';
  }
  if (currentGroup !== group) {
    return getHomeForRole(session.role);
  }
  return null;
}

/**
 * Derive the current group from expo-router segments.
 * Segments look like `["(technician)", "orders"]` or `["login"]`.
 */
export function groupForSegments(segments: Array<string | undefined>): RouteGroup {
  const first = segments[0];
  if (first === '(customer)') return 'customer';
  if (first === '(technician)') return 'technician';
  if (first === '(merchant)') return 'merchant';
  return 'public';
}
