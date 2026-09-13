/**
 * Real API `TechnicianProfileDataSource` (Task 10J).
 *
 * DISCOVERED CONTRACT GAP (reported — the integration path is
 * intentionally NOT faked): docs/07 §16 documents self-service
 * technician endpoints (GET/PATCH /technician/profile, services,
 * submit-verification) but none are implemented backend-side (only
 * the PUBLIC discovery reads exist).
 *
 * What this adapter does with REAL endpoints:
 * - getProfile: GET /me (identity) + the role-scoped request list to
 *   resolve the technician's own public-profile id, then the public
 *   GET /technicians/:id for the real displayName/bio/experience/
 *   services/rating/verification. With no requests (brand-new
 *   technician) it returns the honest empty profile.
 *
 * What it refuses to fabricate:
 * - saveProfile/submitVerificationProfile have no backend endpoints
 *   → they throw the existing typed ProfileSaveError with an explicit
 *   unavailability message instead of pretending success. Onboarding
 *   persistence for technicians is a CTO decision (see report).
 */

import { getApi } from '../../../lib/api-client';
import { drainPages } from '../../../lib/api-query';
import { getTechnicianPublic } from '../../../lib/catalog-reference';
import { categorySlugById } from '../../../lib/catalog-reference';
import { initialsOf } from '../../../lib/request-labels';

import { ProfileSaveError } from './mock-technician-profile-data-source';

import type {
  TechnicianProfile,
  TechnicianProfileDataSource,
  TechnicianProfileDraft,
  TechnicianVerificationStatus,
} from './technician-profile-types';
import type { ApplianceSlug } from '../../customer/home/data/customer-home-types';
import type {
  MeDto,
  ServiceRequestSummaryDto,
  TechnicianPublicDto,
} from '@khabir/shared-types';


export { ProfileSaveError };

const SELF_UPDATE_UNAVAILABLE_AR =
  'تحديث ملف الفني غير متاح حاليًا في الواجهة البرمجية (نقطة نهاية غير منفذة)';

/** Backend verification → the screen's 4-state model. */
function mapVerification(status: TechnicianPublicDto['verificationStatus']): TechnicianVerificationStatus {
  switch (status) {
    case 'verified':
      return 'approved';
    case 'pending':
      return 'pending';
    case 'rejected':
      return 'rejected';
    case 'suspended':
      return 'action_required';
    default:
      return 'action_required';
  }
}

export async function mapSelfProfile(
  me: MeDto,
  tech: TechnicianPublicDto | null,
): Promise<TechnicianProfile> {
  if (tech === null) {
    // Brand-new technician: real identity only, everything else empty.
    return {
      displayNameAr: '',
      initialsAr: '',
      phoneAr: me.phone ?? '',
      bioAr: '',
      experienceYears: 0,
      specialtiesAr: [],
      appliances: [],
      servicesAr: [],
      areasAr: [], // service areas not publicly exposed (reported gap)
      verification: 'pending',
      verificationNoteAr: '',
      rating: 0,
      reviewCount: 0,
      completedCount: 0,
    };
  }
  const displayName = tech.displayName ?? '';
  const specialtiesAr: string[] = [];
  const servicesAr: string[] = [];
  const appliances = new Set<ApplianceSlug>();
  for (const entry of tech.services) {
    servicesAr.push(entry.service.nameAr);
    if (!specialtiesAr.includes(entry.service.nameAr)) specialtiesAr.push(entry.service.nameAr);
    const slug = await categorySlugById(entry.service.applianceCategoryId);
    if (slug === 'washing_machine' || slug === 'refrigerator' || slug === 'air_conditioner') {
      appliances.add(slug);
    }
  }
  return {
    displayNameAr: displayName,
    initialsAr: initialsOf(displayName),
    phoneAr: me.phone ?? '',
    bioAr: tech.bio ?? '',
    experienceYears: tech.experienceYears,
    specialtiesAr,
    appliances: [...appliances],
    servicesAr,
    areasAr: [], // reported gap
    verification: mapVerification(tech.verificationStatus),
    verificationNoteAr:
      tech.verificationStatus === 'verified' ? 'تم التحقق من بياناتك.' : '',
    rating: tech.ratingAverage ?? 0,
    reviewCount: tech.ratingCount,
    completedCount: tech.completedServicesCount,
  };
}

export class ApiTechnicianProfileDataSource implements TechnicianProfileDataSource {
  async getProfile(_input: { role: 'technician' }): Promise<TechnicianProfile> {
    const api = getApi();
    const [me, summaries] = await Promise.all([
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
    const selfId = summaries.find((s) => s.technicianId !== null)?.technicianId ?? null;
    const tech = selfId !== null ? await getTechnicianPublic(selfId) : null;
    return mapSelfProfile(me, tech);
  }

  async saveProfile(_input: {
    role: 'technician';
    profile: TechnicianProfileDraft;
  }): Promise<TechnicianProfile> {
    // No PATCH /technician/profile endpoint exists (reported gap) —
    // refuse honestly instead of fabricating a save.
    throw new ProfileSaveError(SELF_UPDATE_UNAVAILABLE_AR);
  }

  async submitVerificationProfile(_input: {
    role: 'technician';
    profile: TechnicianProfileDraft;
  }): Promise<TechnicianProfile> {
    // No submit-verification endpoint exists (reported gap) — refuse
    // honestly; verification is admin-authoritative server-side.
    throw new ProfileSaveError(SELF_UPDATE_UNAVAILABLE_AR);
  }
}
