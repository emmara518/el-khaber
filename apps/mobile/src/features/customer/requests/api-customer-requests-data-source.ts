/**
 * Real API `CustomerRequestsDataSource` (Task 10J).
 *
 * Replaces the Batch-A mock at runtime behind the SAME interface.
 * Endpoint: GET /service-requests (role-scoped, paginated, optional
 * documented `status` filter). The screen filters client-side with
 * `filterRequestsByStatus`, so the adapter drains the bounded page
 * window (§19) to keep filters/counts correct — no silent truncation.
 *
 * Data-shape normalization at this boundary (docs/07 §7):
 * - appliance name resolved from the public categories reference,
 * - technician display name resolved from the public profile
 *   (privacy-safe: the API exposes no customer identifiers),
 * - `brandAndModel`: NOT part of the API contract → stays empty
 *   (FRONTEND/API CONTRACT GAP — no brand/model fields exist).
 *
 * Source: docs/07_API.md §7, §19.
 */

import { getApi } from '../../../lib/api-client';
import { formatArDateTime } from '../../../lib/api-format';
import { buildQuery, drainPages } from '../../../lib/api-query';
import { categoryNameAr, getTechnicianPublic } from '../../../lib/catalog-reference';
import {
  initialsOf,
  REQUEST_STATUS_LABELS_AR,
  TECHNICIAN_NAME_FALLBACK_AR,
} from '../../../lib/request-labels';

import type {
  CustomerRequestItem,
  CustomerRequestsDataSource,
  CustomerRequestsViewModel,
  CustomerRequestStatus,
} from './customer-requests-types';
import type { ServiceRequestSummaryDto } from '@khabir/shared-types';

/** Map a lifecycle status onto the Batch-A display enum (identical union). */
function toDisplayStatus(status: ServiceRequestSummaryDto['status']): CustomerRequestStatus {
  return status;
}

export async function mapRequestItem(summary: ServiceRequestSummaryDto): Promise<CustomerRequestItem> {
  const status = toDisplayStatus(summary.status);
  const applianceAr = await categoryNameAr(summary.applianceCategoryId);
  let technicianNameAr: string;
  let technicianInitialsAr: string;
  if (summary.technicianId === null) {
    technicianNameAr = 'بانتظار تعيين فني';
    technicianInitialsAr = '؟';
  } else {
    const tech = await getTechnicianPublic(summary.technicianId);
    const name = tech?.displayName ?? TECHNICIAN_NAME_FALLBACK_AR;
    technicianNameAr = `الفني: ${name}`;
    technicianInitialsAr = initialsOf(name);
  }
  return {
    id: summary.id,
    applianceAr,
    taskAr: summary.problemTitle ?? summary.problemDescription,
    brandAndModel: '', // not part of the API contract (see header)
    technicianNameAr,
    technicianInitialsAr,
    status,
    statusLabelAr: REQUEST_STATUS_LABELS_AR[status],
    scheduledLabelAr:
      summary.scheduledAt !== null ? formatArDateTime(summary.scheduledAt) : '',
  };
}

export class ApiCustomerRequestsDataSource implements CustomerRequestsDataSource {
  async getRequests(_input: { role: 'customer' }): Promise<CustomerRequestsViewModel> {
    const api = getApi();
    const summaries = await drainPages<ServiceRequestSummaryDto>((page, limit) =>
      api
        .request<ServiceRequestSummaryDto[]>(
          'GET',
          `/service-requests${buildQuery({ page, limit })}`,
        )
        .then((res) => ({ items: res.data, meta: res.meta })),
    );
    const requests = await Promise.all(summaries.map(mapRequestItem));
    return { requests };
  }
}
