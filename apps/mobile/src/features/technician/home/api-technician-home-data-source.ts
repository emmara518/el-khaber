/**
 * Real API `TechnicianHomeDataSource` (Task 10J).
 *
 * Composed from documented reads only (docs/07 §5/§7/§6):
 * - GET /me — identity,
 * - GET /service-requests (technician scope) — the real incoming and
 *   active previews plus the operational counters,
 * - GET /technicians/:id — the technician's real public profile
 *   (resolved through the role-scoped request list — see
 *   lib/self-technician; no self-profile endpoint exists yet),
 * - GET /appliance-categories — appliance labels.
 *
 * DISCOVERED CONTRACT GAP (reported): docs/07 §16 documents
 * GET /technician/stats, but it is not implemented; the "today"
 * counters are derived CLIENT-SIDE from the real bounded request
 * list (pending count, in_progress count, completed-with-today-
 * updatedAt count). No ranking/earnings/availability logic is
 * invented anywhere.
 */

import { getApi } from '../../../lib/api-client';
import { formatArDateTime, isToday } from '../../../lib/api-format';
import { buildQuery, drainPages } from '../../../lib/api-query';
import { categoryNameAr, getTechnicianPublic } from '../../../lib/catalog-reference';
import {
  CUSTOMER_NAME_FALLBACK_AR,
  initialsOf,
  REQUEST_STATUS_LABELS_AR,
} from '../../../lib/request-labels';

import type {
  TechnicianHomeDataSource,
  TechnicianHomeViewModel,
  TechnicianVerification,
} from './technician-home-types';
import type {
  MeDto,
  ServiceRequestSummaryDto,
  TechnicianPublicDto,
} from '@khabir/shared-types';

/** Backend verification → the screen's 3-state model. */
function mapVerification(status: TechnicianPublicDto['verificationStatus']): TechnicianVerification {
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
    const [me, summaries] = await Promise.all([
      api.request<MeDto>('GET', '/me').then((res) => res.data),
      drainPages<ServiceRequestSummaryDto>((page, limit) =>
        api
          .request<ServiceRequestSummaryDto[]>(
            'GET',
            `/service-requests${buildQuery({ page, limit })}`,
          )
          .then((res) => ({ items: res.data, meta: res.meta })),
      ),
    ]);

    // Real public profile when any request reveals the profile id.
    const selfId = summaries.find((s) => s.technicianId !== null)?.technicianId ?? null;
    const tech = selfId !== null ? await getTechnicianPublic(selfId) : null;

    const incomingPreviews = await Promise.all(
      summaries
        .filter((s) => s.status === 'pending')
        .map(async (s) => ({
          id: s.id,
          customerNameAr: CUSTOMER_NAME_FALLBACK_AR, // privacy by contract
          applianceAr: await categoryNameAr(s.applianceCategoryId),
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
            taskAr: activeSummary.problemTitle ?? activeSummary.problemDescription,
            statusLabelAr: REQUEST_STATUS_LABELS_AR[activeSummary.status],
            startedAr: formatArDateTime(activeSummary.updatedAt),
          }
        : null;

    const name = tech?.displayName ?? (me.phone ?? 'فني');
    const availabilityLabel =
      tech?.availabilityStatus === 'available'
        ? 'متاح اليوم'
        : tech?.availabilityStatus === 'busy'
          ? 'مشغول حاليًا'
          : 'غير متاح';

    return {
      profile: {
        nameAr: name,
        initialsAr: initialsOf(name),
        specialtyAr: tech?.services[0]?.service.nameAr ?? '',
        areasAr: [], // service areas not publicly exposed (reported gap)
        rating: tech?.ratingAverage ?? 0,
        reviewCount: tech?.ratingCount ?? 0,
        verification: tech !== null ? mapVerification(tech.verificationStatus) : 'pending',
        verificationNoteAr: tech !== null && tech.verificationStatus === 'verified'
          ? 'تم التحقق من الهوية والخبرة من قبل فريق الخبير.'
          : '',
        availabilityLabelAr: availabilityLabel,
        available: tech?.availabilityStatus === 'available',
      },
      today: {
        newRequests: summaries.filter((s) => s.status === 'pending').length,
        inProgress: summaries.filter((s) => s.status === 'in_progress').length,
        completedToday: summaries.filter(
          (s) => s.status === 'completed' && isToday(s.updatedAt),
        ).length,
      },
      incoming: incomingPreviews,
      active,
      role: 'technician',
    };
  }
}
