/**
 * Mock `CustomerProfileDataSource` (Batch A).
 *
 * Identity matches the Home fixture (أحمد / القاهرة / حي مدينة نصر);
 * counters match the Requests fixture (3 non-final + 1 completed…
 * active counts derive from pending/accepted/on_the_way/in_progress).
 */

import {
  type CustomerProfileDataSource,
  type CustomerProfileSummary,
} from './customer-profile-types';

import type { PickedPhoto } from '../../../lib/profile-photo';

const PROFILE_FIXTURE: CustomerProfileSummary = {
  displayNameAr: 'أحمد',
  initialsAr: 'أ',
  phoneAr: '01xxxxxxxxx',
  cityAr: 'القاهرة',
  districtAr: 'حي مدينة نصر',
  memberSinceAr: 'عضو منذ ٢٠٢٤',
  activeOrdersCount: 3,
  completedOrdersCount: 1,
  supportHoursAr: 'فريق الدعم متاح يوميًا من ٩ صباحًا حتى ١٠ مساءً.',
  // WP-01: the mock carries no photo (null readback + failed-upload path
  // are exercised through the error tests, not fixtures).
  avatarUrl: null,
};

export class MockCustomerProfileDataSource implements CustomerProfileDataSource {
  async getProfile(_input: { role: 'customer' }): Promise<CustomerProfileSummary> {
    return JSON.parse(JSON.stringify(PROFILE_FIXTURE)) as CustomerProfileSummary;
  }

  async uploadAvatar(_input: {
    role: 'customer';
    photo: PickedPhoto;
  }): Promise<CustomerProfileSummary> {
    return JSON.parse(JSON.stringify(PROFILE_FIXTURE)) as CustomerProfileSummary;
  }

  async deleteAvatar(_input: { role: 'customer' }): Promise<CustomerProfileSummary> {
    return JSON.parse(JSON.stringify(PROFILE_FIXTURE)) as CustomerProfileSummary;
  }
}
