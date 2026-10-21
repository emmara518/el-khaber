/**
 * Real API `TechnicianHomeDataSource` (Task 10J; revised for 10J-R1).
 *
 * Composed from documented, role-scoped reads only:
 * - GET /me — account identity (phone),
 * - GET /technician/profile — the technician's OWN profile (identity,
 *   verification, availability, rating, services, service areas),
 * - GET /service-requests (technician scope) — the real incoming and
 *   active previews,
 * - GET /technician/stats — server-derived request counters,
 * - GET /appliance-categories — appliance labels + slugs.
 *
 * The earlier indirect self-profile resolution (id discovered through
 * the request list) and the derived "areasAr: []" gap are both gone:
 * the self-profile endpoint is authoritative. The daily completed
 * counter is the only client-derived value because the documented stats
 * DTO exposes no per-day count.
 */

import { getApi } from '../../../lib/api-client';
import { formatArDateTime, isToday } from '../../../lib/api-format';
import { buildQuery, drainPages } from '../../../lib/api-query';
import { categoryNameAr, categorySlugById } from '../../../lib/catalog-reference';
import {
  CUSTOMER_NAME_FALLBACK_AR,
  initialsOf,
  REQUEST_STATUS_LABELS_AR,
} from '../../../lib/request-labels';

import { availabilityLabelAr } from './technician-home-types';

import type {
  TechnicianAvailabilityStatus,
  TechnicianHomeDataSource,
  TechnicianHomeViewModel,
  TechnicianVerification,
} from './technician-home-types';
import type {
  MeDto,
  ServiceRequestSummaryDto,
  TechnicianSelfProfileDto,
  TechnicianStatsDto,
} from '@khabir/shared-types';

/** Backend verification → the screen's 3-state model. */
function mapVerification(status: TechnicianSelfProfileDto['verificationStatus']): TechnicianVerification {
  switch (status) {
    case 'verified':
      return 'verified';
    case 'pending':
      return 'pending';
    case 'rejected':
    case 'suspended':
      return 'action_required';
    default:
      return 'action_required';
  }
}

export class ApiTechnicianHomeDataSource implements TechnicianHomeDataSource {
  async getHome(_input: { role: 'technician' }): Promise<TechnicianHomeViewModel> {
    const api = getApi();
    const [me, self, summaries, stats] = await Promise.all([
      api.request<MeDto>('GET', '/me').then((res) => res.data),
      api.request<TechnicianSelfProfileDto>('GET', '/technician/profile').then((res) => res.data),
      drainPages<ServiceRequestSummaryDto>((page, limit) =>
        api
          .request<ServiceRequestSummaryDto[]>(
            'GET',
            `/service-requests${buildQuery({ page, limit })}`,
          )
          .then((res) => ({ items: res.data, meta: res.meta })),
      ),
      api.request<TechnicianStatsDto>('GET', '/technician/stats').then((res) => res.data),
    ]);

    const incomingPreviews = await Promise.all(
      summaries
        .filter((s) => s.status === 'pending')
        .map(async (s) => ({
          id: s.id,
          customerNameAr: CUSTOMER_NAME_FALLBACK_AR, // privacy by contract
          applianceAr: await categoryNameAr(s.applianceCategoryId),
          applianceSlug: await categorySlugById(s.applianceCategoryId),
          problemAr: s.problemTitle ?? s.problemDescription,
          timeAr: s.scheduledAt !== null ? formatArDateTime(s.scheduledAt) : formatArDateTime(s.createdAt),
        })),
    );

    const activeSummary =
      summaries.find((s) => s.status === 'in_progress') ??
      summaries.find((s) => s.status === 'on_the_way') ??
      summaries.find((s) => s.status === 'accepted');
    const active =
      activeSummary !== undefined
        ? {
            id: activeSummary.id,
            customerNameAr: CUSTOMER_NAME_FALLBACK_AR,
            applianceAr: await categoryNameAr(activeSummary.applianceCategoryId),
            applianceSlug: await categorySlugById(activeSummary.applianceCategoryId),
            taskAr: activeSummary.problemTitle ?? activeSummary.problemDescription,
            status: activeSummary.status,
            statusLabelAr: REQUEST_STATUS_LABELS_AR[activeSummary.status],
            startedAr: formatArDateTime(activeSummary.updatedAt),
          }
        : null;

    const name = self.displayName ?? me.phone ?? 'فني';
    const availabilityLabel = availabilityLabelAr(self.availabilityStatus);

    return {
      profile: {
        nameAr: name,
        initialsAr: initialsOf(name),
        specialtyAr: self.services[0]?.nameAr ?? '',
        areasAr: self.areas.map((a) => a.labelAr),
        rating: self.ratingAverage ?? 0,
        reviewCount: self.ratingCount,
        verification: mapVerification(self.verificationStatus),
        verificationNoteAr:
          self.verificationStatus === 'verified'
            ? 'تم التحقق من الهوية والخبرة من قبل فريق الخبير.'
            : '',
        availabilityLabelAr: availabilityLabel,
        available: self.availabilityStatus === 'available',
      },
      today: {
        newRequests: stats.pendingCount,
        inProgress: stats.inProgressCount,
        onTheWay: stats.onTheWayCount,
        // No per-day counter exists in the stats DTO — derived from the
        // real bounded list, never invented.
        completedToday: summaries.filter((s) => s.status === 'completed' && isToday(s.updatedAt)).length,
      },
      incoming: incomingPreviews,
      active,
      role: 'technician',
    };
  }

  /**
   * WP-4: technician self-service availability. Only available | unavailable
   * are writable (the API rejects `busy`). The server response is the truth —
   * callers must adopt the returned status (no divergent optimistic state).
   */
  async setAvailability(input: {
    role: 'technician';
    available: boolean;
  }): Promise<{ availabilityStatus: TechnicianAvailabilityStatus }> {
    const updated = await getApi()
      .request<TechnicianSelfProfileDto>('PATCH', '/technician/profile', {
        availability_status: input.available ? 'available' : 'unavailable',
      })
      .then((res) => res.data);
    return { availabilityStatus: updated.availabilityStatus };
  }
}
