/**
 * Central authorization policy. This is the single source of truth for
 * "is this user allowed to do this action?".
 *
 * Design (per docs/05_TECH_ARCHITECTURE.md §5, §7 and docs/10_ENGINEERING_RULES.md §15):
 *   can(user, action, resource?) -> boolean
 *
 * Rules:
 *   - Roles are server-authoritative. The client's role claim is never
 *     trusted. The `user` argument must be the server-side record.
 *   - The frontend is never the security boundary. UI hiding is a UX
 *     concern, not an authorization concern.
 *   - Ownership checks must be performed before policy evaluation when
 *     the action targets a specific resource.
 *
 * Task #002 establishes the central function and role checks. Domain
 * actions (technician request transitions, review creation, etc.) are
 * added in later product modules.
 */

import { ForbiddenException } from '../errors';

import type { Role, UserStatus } from '@khabir/shared-types';


export type Actor =
  | { kind: 'user'; id: string; role: Role; status: UserStatus }
  | { kind: 'admin'; id: string; role: 'super_admin' | 'operations_admin' | 'content_admin' | 'support_admin'; status: UserStatus }
  | { kind: 'anonymous' };

export type Action =
  | 'auth:register'
  | 'auth:login'
  | 'auth:refresh'
  | 'auth:logout'
  | 'auth:forgot-password'
  | 'auth:reset-password'
  | 'me:read'
  | 'admin:login'
  | 'admin:me';

export interface PolicyContext {
  /** Optional resource reference for ownership/tenant checks. */
  resource?: { ownerId?: string };
}

export function can(actor: Actor, action: Action, _ctx: PolicyContext = {}): boolean {
  if (action === 'auth:register' || action === 'auth:login' || action === 'auth:refresh' ||
      action === 'auth:logout' || action === 'auth:forgot-password' || action === 'auth:reset-password') {
    return true;
  }

  if (action === 'me:read') {
    return actor.kind === 'user' && actor.status === 'active';
  }

  if (action === 'admin:login' || action === 'admin:me') {
    return actor.kind === 'admin' && actor.status === 'active';
  }

  return false;
}

export function authorize(actor: Actor, action: Action, ctx: PolicyContext = {}): void {
  if (!can(actor, action, ctx)) {
    throw new ForbiddenException();
  }
}
