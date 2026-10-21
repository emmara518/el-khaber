/**
 * Self-technician profile-id resolution (Task 10J).
 *
 * DISCOVERED CONTRACT GAP: docs/07 §16 documents self-service
 * technician endpoints (GET/PATCH /technician/profile, services,
 * stats) but none are implemented backend-side (Task 10C–10I
 * delivered only the PUBLIC discovery reads). A technician's own
 * public-profile id is therefore not directly readable; the adapter
 * layer resolves it from the role-scoped request list: any summary
 * targeted at (pending) or assigned (non-pending) to this technician
 * carries `technicianId` — which IS the technician-profile id.
 *
 * Resolution is a real, documented read (GET /service-requests,
 * docs/07 §7) with NO side effects; it caches a stable promise and
 * resets on failure so a later retry re-resolves.
 */

import { getApi } from './api-client';
import { drainPages } from './api-query';

import type { ServiceRequestSummaryDto } from '@khabir/shared-types';

let selfIdPromise: Promise<string | null> | null = null;

/** The signed-in technician's public-profile id (null when unknown). */
export function getSelfTechnicianProfileId(): Promise<string | null> {
  if (selfIdPromise === null) {
    selfIdPromise = (async () => {
      const summaries = await drainPages<ServiceRequestSummaryDto>((page, limit) =>
        getApi()
          .request<ServiceRequestSummaryDto[]>(
            'GET',
            `/service-requests?page=${String(page)}&limit=${String(limit)}`,
          )
          .then((res) => ({ items: res.data, meta: res.meta })),
      );
      const own = summaries.find((s) => s.technicianId !== null);
      return own?.technicianId ?? null;
    })().catch((err: unknown) => {
      selfIdPromise = null; // allow a later retry to re-resolve
      throw err;
    });
  }
  return selfIdPromise;
}
