/**
 * Real API `TechnicianMessagesDataSource` (T-G).
 *
 * DISCOVERED CONTRACT GAP (reported, NOT invented around): the backend
 * has no "list my conversations" endpoint and no last-message/unread
 * tracking. Conversations are 1:1 with service requests, created
 * lazily on open (docs/07 §11), so the list is composed from the
 * technician's role-scoped GET /service-requests — the orders assigned
 * to this technician. Opening a row resolves the real conversation
 * through the shared chat adapter.
 *
 * Honest field mapping: order reference, appliance and timestamp are
 * real; `lastMessageAr` has no backing API and renders empty rather
 * than fabricated. The customer identity is not exposed (privacy by
 * contract) → the generic label is used.
 */

import { getApi } from '../../../lib/api-client';
import { formatArDateTime } from '../../../lib/api-format';
import { buildQuery, drainPages } from '../../../lib/api-query';
import { categoryNameAr } from '../../../lib/catalog-reference';
import { CUSTOMER_NAME_FALLBACK_AR, initialsOf } from '../../../lib/request-labels';

import type { TechnicianMessagesDataSource, TechnicianMessagesViewModel } from './technician-messages-types';
import type { ServiceRequestSummaryDto } from '@khabir/shared-types';

export class ApiTechnicianMessagesDataSource implements TechnicianMessagesDataSource {
  async getConversations(_input: { role: 'technician' }): Promise<TechnicianMessagesViewModel> {
    const summaries = await drainPages<ServiceRequestSummaryDto>((page, limit) =>
      getApi()
        .request<ServiceRequestSummaryDto[]>(
          'GET',
          `/service-requests${buildQuery({ page, limit })}`,
        )
        .then((res) => ({ items: res.data, meta: res.meta })),
    );
    // A thread exists once a technician is assigned (non-pending).
    const assigned = summaries.filter((s) => s.technicianId !== null);
    const conversations = await Promise.all(
      assigned.map(async (summary) => ({
        id: summary.id,
        peerNameAr: CUSTOMER_NAME_FALLBACK_AR,
        initialsAr: initialsOf(CUSTOMER_NAME_FALLBACK_AR),
        applianceAr: await categoryNameAr(summary.applianceCategoryId),
        // No last-message API exists (reported gap).
        lastMessageAr: '',
        timeAr: formatArDateTime(summary.updatedAt),
        orderRefAr: summary.problemTitle ?? summary.problemDescription,
      })),
    );
    return { conversations };
  }
}
