/**
 * Real API `ConversationsDataSource` (Task 10J) — messages tab list.
 *
 * DISCOVERED CONTRACT GAP (reported, NOT invented around): the backend
 * has NO "list my conversations" endpoint and no unread/last-message
 * tracking. Conversations are 1:1 with service requests and are
 * created lazily when opened (docs/07 §11), so the adapter composes
 * the list from the role-scoped GET /service-requests (real orders
 * with a technician) WITHOUT side effects — opening a thread resolves
 * the real conversation through the chat adapter.
 *
 * Honest field mapping: technician identity, order reference and
 * timestamp are real; `lastMessageAr`/`unreadCount`/`online` have no
 * backing API and render as empty/0/false rather than fabricated.
 */

import { getApi } from '../../../lib/api-client';
import { formatArDateTime } from '../../../lib/api-format';
import { buildQuery, drainPages } from '../../../lib/api-query';
import { categoryNameAr, getTechnicianPublic } from '../../../lib/catalog-reference';
import { initialsOf, TECHNICIAN_NAME_FALLBACK_AR } from '../../../lib/request-labels';

import type { ConversationsDataSource, ConversationsViewModel } from './conversations-types';
import type { ServiceRequestSummaryDto } from '@khabir/shared-types';

export class ApiConversationsDataSource implements ConversationsDataSource {
  async getConversations(_input: { role: 'customer' }): Promise<ConversationsViewModel> {
    const summaries = await drainPages<ServiceRequestSummaryDto>((page, limit) =>
      getApi()
        .request<ServiceRequestSummaryDto[]>(
          'GET',
          `/service-requests${buildQuery({ page, limit })}`,
        )
        .then((res) => ({ items: res.data, meta: res.meta })),
    );
    // Threads exist for orders that already have a technician.
    const withTechnician = summaries.filter((s) => s.technicianId !== null);
    const conversations = await Promise.all(
      withTechnician.map(async (summary) => {
        const [applianceAr, tech] = await Promise.all([
          categoryNameAr(summary.applianceCategoryId),
          summary.technicianId !== null ? getTechnicianPublic(summary.technicianId) : null,
        ]);
        const name = tech?.displayName ?? TECHNICIAN_NAME_FALLBACK_AR;
        const specialty = tech?.services[0]?.service.nameAr ?? applianceAr;
        return {
          id: summary.id,
          technicianNameAr: name,
          initialsAr: initialsOf(name),
          specialtyAr: specialty,
          // No last-message/unread API exists (reported gap).
          lastMessageAr: '',
          timeAr: formatArDateTime(summary.updatedAt),
          unreadCount: 0,
          orderRefAr: summary.problemTitle ?? summary.problemDescription,
          online: false,
        };
      }),
    );
    return { conversations };
  }
}
