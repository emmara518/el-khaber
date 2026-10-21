/**
 * Customer Profile — summary contracts (Batch A).
 *
 * Identity basics + service counters. Subscription is an ENTRY point
 * only in this phase (full logic belongs to a later phase per the
 * Phase-2 brief §16); the menu models it as a "coming soon" row so
 * no business behavior is implied.
 *
 * WP-01: optional profile photo (upload/delete through the multipart
 * avatar endpoints; readback from GET /me).
 */

import type { PickedPhoto } from '../../../lib/profile-photo';

export interface CustomerProfileSummary {
  readonly displayNameAr: string;
  readonly initialsAr: string;
  readonly phoneAr: string;
  readonly cityAr: string;
  readonly districtAr: string;
  readonly memberSinceAr: string;
  readonly activeOrdersCount: number;
  readonly completedOrdersCount: number;
  readonly supportHoursAr: string;
  /**
   * WP-01: server-issued public avatar URL (GET /me `avatarUrl`) or
   * null when absent. Never a storage key.
   */
  readonly avatarUrl: string | null;
}

export interface CustomerProfileDataSource {
  getProfile(input: { role: 'customer' }): Promise<CustomerProfileSummary>;
  uploadAvatar(input: { role: 'customer'; photo: PickedPhoto }): Promise<CustomerProfileSummary>;
  deleteAvatar(input: { role: 'customer' }): Promise<CustomerProfileSummary>;
}
