/**
 * Mock `CustomerProfileDataSource` (Batch A).
 *
 * Identity matches the Home fixture (أحمد / الرياض / حي النزهة);
 * counters match the Requests fixture (3 non-final + 1 completed…
 * active counts derive from pending/accepted/on_the_way/in_progress).
 */

import {
  type CustomerProfileDataSource,
  type CustomerProfileSummary,
} from './customer-profile-types';

const PROFILE_FIXTURE: CustomerProfileSummary = {
  displayNameAr: 'أحمد',
  initialsAr: 'أ',
  phoneAr: '05xxxxxxxx',
  cityAr: 'الرياض',
  districtAr: 'حي النزهة',
  memberSinceAr: 'عضو منذ ٢٠٢٤',
  activeOrdersCount: 3,
  completedOrdersCount: 1,
  supportHoursAr: 'فريق الدعم متاح يوميًا من ٩ صباحًا حتى ١٠ مساءً.',
};

export class MockCustomerProfileDataSource implements CustomerProfileDataSource {
  async getProfile(_input: { role: 'customer' }): Promise<CustomerProfileSummary> {
    return JSON.parse(JSON.stringify(PROFILE_FIXTURE)) as CustomerProfileSummary;
  }
}
