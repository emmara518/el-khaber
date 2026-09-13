/**
 * Real API `CustomerProfileDataSource` (Task 10J).
 *
 * Endpoints: GET /me (identity — docs/07 §5) and the role-scoped
 * GET /service-requests list for the real order counters.
 *
 * Normalization at this boundary:
 * - the API exposes no customer display name / city / district
 *   (registration collects contact + password only — docs/06 §3), so
 *   the profile shows the honest generic identity and empty location
 *   fields instead of invented ones (reported gap),
 * - `memberSinceAr` derives from the real `createdAt`,
 * - counters derive from the bounded drained request list (real
 *   statuses),
 * - support hours remain static product copy (not API data).
 */

import { getApi } from '../../../lib/api-client';
import { formatArYear } from '../../../lib/api-format';
import { drainPages } from '../../../lib/api-query';
import { isActiveStatus } from '../../../lib/request-labels';

import type { CustomerProfileDataSource, CustomerProfileSummary } from './customer-profile-types';
import type { MeDto, ServiceRequestSummaryDto } from '@khabir/shared-types';

/** Static help copy — presentation text, not API data. */
const SUPPORT_HOURS_AR = 'فريق الدعم متاح يوميًا من ٩ صباحًا حتى ١٠ مساءً.';

export class ApiCustomerProfileDataSource implements CustomerProfileDataSource {
  async getProfile(_input: { role: 'customer' }): Promise<CustomerProfileSummary> {
    const api = getApi();
    const [me, requests] = await Promise.all([
      api.request<MeDto>('GET', '/me').then((res) => res.data),
      drainPages<ServiceRequestSummaryDto>((page, limit) =>
        api
          .request<ServiceRequestSummaryDto[]>(
            'GET',
            `/service-requests?page=${String(page)}&limit=${String(limit)}`,
          )
          .then((res) => ({ items: res.data, meta: res.meta })),
      ),
    ]);
    const activeOrdersCount = requests.filter((r) => isActiveStatus(r.status)).length;
    const completedOrdersCount = requests.filter((r) => r.status === 'completed').length;
    const phoneAr = me.phone ?? me.email ?? '';
    return {
      // No customer-name API exists — honest generic identity (gap).
      displayNameAr: 'عميل',
      initialsAr: 'ع',
      phoneAr,
      cityAr: '',
      districtAr: '',
      memberSinceAr:
        me.createdAt.length > 0 ? `عضو منذ ${formatArYear(me.createdAt)}` : '',
      activeOrdersCount,
      completedOrdersCount,
      supportHoursAr: SUPPORT_HOURS_AR,
    };
  }
}
