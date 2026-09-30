/**
 * Real API `TechnicianProfileDataSource` (Task 10J + 10J-R1 + WP-3).
 *
 * Self-service surface (docs/07 §16):
 * - getProfile: GET /technician/profile (+ /me for the account phone);
 *   professional coverage (specialties/appliances/services) is DERIVED
 *   from the attached services' catalog categories (WP-3) — never stored
 *   as profile text.
 * - saveProfile / submitVerificationProfile: PATCH /technician/profile for
 *   the editable fields, PATCH /me for the account phone (canonical,
 *   WP-1), and reconcile `/technician/services` to the selected catalog
 *   service UUIDs. Verification STATUS remains admin-owned (docs/09 §6).
 */

import { getApi } from '../../../lib/api-client';
import { getApplianceCategories } from '../../../lib/catalog-reference';
import { initialsOf } from '../../../lib/request-labels';

import { ProfileSaveError } from './mock-technician-profile-data-source';

import type {
  TechnicianApplianceSlug,
  TechnicianProfile,
  TechnicianProfileDataSource,
  TechnicianProfileSaveInput,
  TechnicianVerificationStatus,
} from './technician-profile-types';
import type { TechnicianSelfProfileDto, TechnicianSelfService } from '@khabir/shared-types';

export { ProfileSaveError };

/** Backend verification → the screen's 4-state model. */
function mapVerification(
  status: TechnicianSelfProfileDto['verificationStatus'],
): TechnicianVerificationStatus {
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

interface CategoryRef {
  id: string;
  slug: string;
  nameAr: string;
}

/** Derives coverage projections from the attached services (WP-3). */
function deriveCoverage(
  services: ReadonlyArray<{ nameAr: string; applianceCategoryId: string }>,
  categories: ReadonlyArray<CategoryRef>,
): {
  specialtiesAr: ReadonlyArray<string>;
  appliances: ReadonlyArray<TechnicianApplianceSlug>;
  servicesAr: ReadonlyArray<string>;
} {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const categoryIds = [...new Set(services.map((s) => s.applianceCategoryId))];
  const specialties: string[] = [];
  const appliances: TechnicianApplianceSlug[] = [];
  for (const id of categoryIds) {
    const category = byId.get(id);
    if (category === undefined) continue;
    if (!specialties.includes(category.nameAr)) specialties.push(category.nameAr);
    const slug = category.slug as TechnicianApplianceSlug;
    if (!appliances.includes(slug)) appliances.push(slug);
  }
  return {
    specialtiesAr: specialties,
    appliances,
    servicesAr: services.map((s) => s.nameAr),
  };
}

function mapSelfProfile(
  dto: TechnicianSelfProfileDto,
  phoneAr: string,
  categories: ReadonlyArray<CategoryRef>,
): TechnicianProfile {
  const displayName = dto.displayName ?? '';
  const coverage = deriveCoverage(dto.services, categories);
  return {
    displayNameAr: displayName,
    initialsAr: initialsOf(displayName),
    phoneAr,
    bioAr: dto.bio ?? '',
    experienceYears: dto.experienceYears,
    specialtiesAr: coverage.specialtiesAr,
    appliances: coverage.appliances,
    servicesAr: coverage.servicesAr,
    areasAr: dto.areas.map((a) => a.labelAr),
    verification: mapVerification(dto.verificationStatus),
    verificationNoteAr: dto.verificationStatus === 'verified' ? 'تم التحقق من بياناتك.' : '',
    rating: dto.ratingAverage ?? 0,
    reviewCount: dto.ratingCount,
    completedCount: dto.completedServicesCount,
  };
}

export class ApiTechnicianProfileDataSource implements TechnicianProfileDataSource {
  async getProfile(_input: { role: 'technician' }): Promise<TechnicianProfile> {
    const api = getApi();
    const [profile, me, categories] = await Promise.all([
      api.request<TechnicianSelfProfileDto>('GET', '/technician/profile').then((res) => res.data),
      api
        .request<{ phone: string | null }>('GET', '/me')
        .then((res) => res.data)
        .catch(() => ({ phone: null })),
      getApplianceCategories().catch(() => []),
    ]);
    return mapSelfProfile(profile, me.phone ?? '', categories);
  }

  async saveProfile(input: TechnicianProfileSaveInput): Promise<TechnicianProfile> {
    return this.persist(input, false);
  }

  /**
   * Persists the submitted profile: editable fields + account phone +
   * canonical service attachments. Verification STATUS remains admin-owned
   * (docs/09 §6) — the honest persisted state is returned.
   */
  async submitVerificationProfile(input: TechnicianProfileSaveInput): Promise<TechnicianProfile> {
    return this.persist(input, true);
  }

  private async persist(
    input: TechnicianProfileSaveInput,
    _submit: boolean,
  ): Promise<TechnicianProfile> {
    await this.patchProfile(input.profile);
    if (input.serviceIds !== undefined) {
      await this.reconcileServices(input.serviceIds);
    }
    return this.getProfile({ role: 'technician' });
  }

  private async patchProfile(draft: TechnicianProfileSaveInput['profile']): Promise<void> {
    const body: Record<string, unknown> = {};
    if (typeof draft.displayNameAr === 'string' && draft.displayNameAr.trim().length > 0) {
      body['display_name'] = draft.displayNameAr.trim();
    }
    if (typeof draft.bioAr === 'string') {
      body['bio'] = draft.bioAr.trim();
    }
    if (typeof draft.experienceYears === 'number' && Number.isFinite(draft.experienceYears)) {
      body['experience_years'] = draft.experienceYears;
    }
    if (Array.isArray(draft.areasAr) && draft.areasAr.length > 0) {
      // Label-only areas (coordinates optional; no invented geo).
      body['areas'] = draft.areasAr
        .filter((a) => a.trim().length > 0)
        .slice(0, 10)
        .map((label) => ({ label_ar: label.trim() }));
    }
    if (Object.keys(body).length > 0) {
      await getApi().request('PATCH', '/technician/profile', body);
    }

    // Account phone is canonical identity (WP-1): update through /me only
    // when a value was provided. The server canonicalizes + resets its
    // verification flag; an unchanged value is a server-side no-op.
    const phone = draft.phoneAr.trim();
    if (phone.length > 0) {
      await getApi().request('PATCH', '/me', { phone });
    }
  }

  /** Reconciles attached services to exactly the desired catalog UUIDs. */
  private async reconcileServices(desiredIds: ReadonlyArray<string>): Promise<void> {
    const api = getApi();
    const attached = await api
      .request<TechnicianSelfService[]>('GET', '/technician/services')
      .then((res) => res.data);
    const current = new Set(attached.map((s) => s.serviceId));
    const desired = new Set(desiredIds);

    for (const id of desired) {
      if (current.has(id)) continue;
      try {
        await api.request('POST', '/technician/services', { service_id: id });
      } catch (err: unknown) {
        // Already attached (409) is benign; anything else is a real failure.
        if ((err as { status?: number }).status !== 409) throw err;
      }
    }
    for (const id of current) {
      if (desired.has(id)) continue;
      try {
        await api.request('DELETE', `/technician/services/${encodeURIComponent(id)}`);
      } catch (err: unknown) {
        // Already detached (404) is benign.
        if ((err as { status?: number }).status !== 404) throw err;
      }
    }
  }
}
