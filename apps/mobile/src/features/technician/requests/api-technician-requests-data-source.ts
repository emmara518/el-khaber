/**
 * Real API `TechnicianRequestsDataSource` (Task 10J).
 *
 * Endpoints (docs/07 §7, role-scoped, JWT identity):
 * - GET /service-requests — technician scope: pending requests
 *   targeted at this technician + every non-pending assigned one,
 * - POST /service-requests/:id/accept|reject|start|complete — the
 *   documented transition routes; every mutation is a single atomic
 *   guarded write (the loser of a race receives 409).
 *
 * Normalization:
 * - customer names are NOT exposed by the API (privacy by contract)
 *   → generic 'العميل' label — never an invented name,
 * - appliance labels resolve through the public categories reference,
 * - `locationAr` is enriched from the request detail (the summary has
 *   no location) for the bounded visible window only, cached,
 * - `advanceStatus` maps the T-D forward chain onto the real routes:
 *   accepted|on_the_way → start (on_the_way→in_progress), and
 *   in_progress → complete,
 * - stale/invalid transitions map onto the existing RequestActionError
 *   codes (STALE for CONFLICT races, INVALID for
 *   INVALID_STATE_TRANSITION, NOT_FOUND for 404).
 */

import { getApi } from '../../../lib/api-client';
import { formatArDateTime } from '../../../lib/api-format';
import { buildQuery, drainPages } from '../../../lib/api-query';
import { categoryNameAr } from '../../../lib/catalog-reference';
import { CUSTOMER_NAME_FALLBACK_AR, REQUEST_STATUS_LABELS_AR } from '../../../lib/request-labels';

import {
  RequestActionError,
  type TechnicianRequestsDataSource,
} from './mock-technician-requests-data-source';

import type { TechnicianRequest } from './technician-request-types';
import type {
  ServiceRequestDto,
  ServiceRequestSummaryDto,
} from '@khabir/shared-types';

/** Summary → card model (location enriched separately, cached). */
export async function mapTechnicianRequest(
  summary: ServiceRequestSummaryDto,
  locationAr: string,
): Promise<TechnicianRequest> {
  const applianceAr = await categoryNameAr(summary.applianceCategoryId);
  const problemAr =
    summary.problemTitle ?? summary.problemDescription.split('\n')[0]?.slice(0, 80) ?? '';
  return {
    id: summary.id,
    customerNameAr: CUSTOMER_NAME_FALLBACK_AR, // privacy by contract
    applianceAr,
    problemAr,
    descriptionAr: summary.problemDescription,
    locationAr,
    timeAr: summary.scheduledAt !== null ? formatArDateTime(summary.scheduledAt) : '',
    createdAr: formatArDateTime(summary.createdAt),
    appointmentAr: summary.scheduledAt !== null ? formatArDateTime(summary.scheduledAt) : null,
    status: summary.status,
    statusLabelAr: REQUEST_STATUS_LABELS_AR[summary.status],
  };
}

/** Real detail location → the existing single-line location label. */
export function locationArOf(dto: ServiceRequestDto): string {
  return [dto.location.label, dto.location.city, dto.location.addressText]
    .filter((part): part is string => part !== null && part.trim().length > 0)
    .join(' – ');
}

/** Map a detail DTO (transition result) onto the card model. */
export async function mapTechnicianRequestFromDetail(
  dto: ServiceRequestDto,
): Promise<TechnicianRequest> {
  return mapTechnicianRequest(
    {
      applianceCategoryId: dto.applianceCategoryId,
      createdAt: dto.createdAt,
      faultId: dto.faultId,
      id: dto.id,
      problemDescription: dto.problemDescription,
      problemTitle: dto.problemTitle,
      scheduledAt: dto.scheduledAt,
      serviceId: dto.serviceId,
      status: dto.status,
      technicianId: dto.technicianId,
      updatedAt: dto.updatedAt,
    },
    locationArOf(dto),
  );
}


export class ApiTechnicianRequestsDataSource implements TechnicianRequestsDataSource {
  private readonly detailCache = new Map<string, Promise<ServiceRequestDto>>();

  async getRequests(_input: { role: 'technician' }): Promise<ReadonlyArray<TechnicianRequest>> {
    const summaries = await drainPages<ServiceRequestSummaryDto>((page, limit) =>
      getApi()
        .request<ServiceRequestSummaryDto[]>(
          'GET',
          `/service-requests${buildQuery({ page, limit })}`,
        )
        .then((res) => ({ items: res.data, meta: res.meta })),
    );
    // Location lives only on the detail DTO; enrich the bounded
    // visible window (cached so detail/action re-fetches stay deduped).
    const locations = await Promise.all(
      summaries.map(async (summary): Promise<string> => {
        if (summary.technicianId === null) return ''; // pending: not assigned yet
        try {
          const dto = await this.detail(summary.id);
          return locationArOf(dto);
        } catch {
          return ''; // location stays empty rather than fabricated
        }
      }),
    );
    return Promise.all(
      summaries.map(async (summary, index) => mapTechnicianRequest(summary, locations[index])),
    );
  }

  async acceptRequest(input: { role: 'technician'; requestId: string }): Promise<TechnicianRequest> {
    return this.mutate(input.requestId, 'accept');
  }

  async rejectRequest(input: { role: 'technician'; requestId: string }): Promise<TechnicianRequest> {
    return this.mutate(input.requestId, 'reject');
  }

  async advanceStatus(input: { role: 'technician'; requestId: string }): Promise<TechnicianRequest> {
    // Route resolved from the CURRENT server state at mutation time.
    return this.mutate(input.requestId, 'advance');
  }

  private detail(requestId: string): Promise<ServiceRequestDto> {
    const cached = this.detailCache.get(requestId);
    if (cached !== undefined) return cached;
    const promise = getApi()
      .request<ServiceRequestDto>('GET', `/service-requests/${requestId}`)
      .then((res) => res.data)
      .catch((err: unknown) => {
        this.detailCache.delete(requestId);
        throw err;
      });
    this.detailCache.set(requestId, promise);
    return promise;
  }

  private async mutate(
    requestId: string,
    action: 'accept' | 'reject' | 'advance',
  ): Promise<TechnicianRequest> {
    const path =
      action === 'accept'
        ? `/service-requests/${requestId}/accept`
        : action === 'reject'
          ? `/service-requests/${requestId}/reject`
          : null;
    try {
      let dto: ServiceRequestDto;
      if (path !== null) {
        dto = await getApi().request<ServiceRequestDto>('POST', path).then((res) => res.data);
      } else {
        // Forward chain: accepted|on_the_way → start; in_progress → complete.
        const current = await this.detail(requestId);
        if (current.status === 'in_progress') {
          dto = await getApi()
            .request<ServiceRequestDto>('POST', `/service-requests/${requestId}/complete`)
            .then((res) => res.data);
        } else if (current.status === 'accepted' || current.status === 'on_the_way') {
          dto = await getApi()
            .request<ServiceRequestDto>('POST', `/service-requests/${requestId}/start`)
            .then((res) => res.data);
        } else {
          // completed|cancelled|pending — no forward transition exists.
          throw new RequestActionError('INVALID', 'هذا الطلب مغلق ولا يقبل إجراءات جديدة.');
        }
      }
      return await mapTechnicianRequestFromDetail(dto);
    } catch (err: unknown) {
      throw this.toActionError(err);
    }
  }

  private toActionError(err: unknown): RequestActionError {
    if (err instanceof RequestActionError) return err;
    const status = (err as { status?: number }).status;
    const code = (err as { code?: unknown }).code;
    if (status === 404) {
      return new RequestActionError('NOT_FOUND', 'الطلب غير موجود');
    }
    if (code === 'INVALID_STATE_TRANSITION' || status === 409) {
      // Concurrent actor or stale render — the screen shows the safe
      // stale copy and the VM refreshes the server state (§20).
      return new RequestActionError('STALE');
    }
    return new RequestActionError('FAILED');
  }
}
