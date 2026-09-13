/**
 * Real API `FaultGuideDataSource` (Task 10J).
 *
 * Endpoints (docs/07 §6, all PUBLIC, published-only semantics):
 * - appliances: GET /appliance-categories (active categories),
 * - symptoms:   GET /faults (published summaries, paginated),
 * - details:    GET /faults/:id (published content; draft/review/
 *   archived ids answer the SAME 404 as a missing resource).
 *
 * Data-shape normalization at this boundary (docs/07 §26 fault model):
 * - backend fault content is `summaryAr` + `guidanceAr` +
 *   `safetyNoteAr` + `whenToCallTechnicianAr` — single advisory texts,
 *   NOT the mock's multi-bullet arrays. The adapter maps each text to
 *   the existing single-item list slots (structure preserved, content
 *   verbatim, nothing invented),
 * - `severityLevel` is an open backend string with no documented
 *   value set → rendered only when the copy is already user-facing
 *   Arabic; otherwise the frequency chip stays empty,
 * - `actionAr` falls back to the documented escalation semantics
 *   (every result ends with an escalation to a qualified technician,
 *   docs/03 §7) ONLY when the fault provides no explicit
 *   when_to_call_technician text.
 *
 * The guide is drained once (bounded pages) and per-symptom details
 * are prefetched so the existing synchronous resolution machine keeps
 * working unchanged.
 */

import { getApi } from '../../../lib/api-client';
import { buildQuery, drainPages } from '../../../lib/api-query';
import { getApplianceCategories } from '../../../lib/catalog-reference';

import {
  type FaultAppliance,
  type FaultDetail,
  type FaultGuideData,
  type FaultGuideDataSource,
  type FaultSymptom,
} from './fault-guide-types';

import type { ApplianceSlug } from '../home/data/customer-home-types';
import type { FaultDto, FaultSummaryDto } from '@khabir/shared-types';

/** Documented escalation semantics (docs/03 §7) — used only as a fallback. */
const ESCALATION_FALLBACK_AR = 'إذا استمرت المشكلة، ابحث عن فني متخصص لفحص الجهاز.';

const KNOWN_SLUGS: ReadonlyArray<ApplianceSlug> = [
  'washing_machine',
  'refrigerator',
  'air_conditioner',
];

function isKnownSlug(value: string | null | undefined): value is ApplianceSlug {
  return value !== null && value !== undefined && (KNOWN_SLUGS as ReadonlyArray<string>).includes(value);
}

export function mapFaultDetail(dto: FaultDto): FaultDetail {
  return {
    symptomId: dto.id,
    possibleCausesAr: dto.summaryAr.trim().length > 0 ? [dto.summaryAr] : [],
    safeStepsAr: dto.guidanceAr.trim().length > 0 ? [dto.guidanceAr] : [],
    warningAr: dto.safetyNoteAr,
    actionAr:
      dto.whenToCallTechnicianAr !== null && dto.whenToCallTechnicianAr.trim().length > 0
        ? dto.whenToCallTechnicianAr
        : ESCALATION_FALLBACK_AR,
  };
}

export class ApiFaultGuideDataSource implements FaultGuideDataSource {
  async getGuide(_input: { role: 'customer' }): Promise<FaultGuideData> {
    const [categories, faults] = await Promise.all([
      getApplianceCategories(),
      drainPages<FaultSummaryDto>((page, limit) =>
        getApi()
          .request<FaultSummaryDto[]>(
            'GET',
            `/faults${buildQuery({ page, limit })}`,
            undefined,
            { auth: false },
          )
          .then((res) => ({ items: res.data, meta: res.meta })),
      ),
    ]);

    const appliances: FaultAppliance[] = [];
    for (const category of categories) {
      if (!isKnownSlug(category.slug)) continue;
      appliances.push({ slug: category.slug, titleAr: category.nameAr, taglineAr: '' });
    }

    const slugById = new Map(categories.map((c) => [c.id, c.slug]));
    const symptoms: FaultSymptom[] = [];
    for (const fault of faults) {
      const slug = slugById.get(fault.applianceCategoryId);
      if (!isKnownSlug(slug)) continue;
      symptoms.push({
        id: fault.id,
        applianceSlug: slug,
        titleAr: fault.nameAr,
        // severityLevel has no documented Arabic value set → empty chip.
        frequencyAr: '',
      });
    }

    // Prefetch the published content for every listed symptom so the
    // synchronous resolution machine (and NO_MATCH for ids without a
    // detail) keeps working against real data.
    const details = await Promise.all(
      symptoms.map(async (symptom): Promise<FaultDetail | null> => {
        try {
          const res = await getApi().request<FaultDto>(
            'GET',
            `/faults/${symptom.id}`,
            undefined,
            { auth: false },
          );
          return mapFaultDetail(res.data);
        } catch {
          return null; // not published / missing → resolvable as NO_MATCH
        }
      }),
    );

    return {
      appliances,
      symptoms,
      details: details.filter((detail): detail is FaultDetail => detail !== null),
    };
  }
}
