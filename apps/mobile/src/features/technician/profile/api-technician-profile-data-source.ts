/**
 * Real API `TechnicianProfileDataSource` (Task 10J + 10J-R1).
 *
 * Self-service surface (docs/07 §16 — endpoints implemented in 10J-R1):
 * - getProfile: GET /technician/profile (lazily creates for onboarding),
 * - saveProfile: PATCH /technician/profile (editable fields only),
 * - submitVerificationProfile: PATCH /technician/profile — persists data;
 *   verification STATUS is admin-owned (docs/09 §6) and is never mutated
 *   client-side (the honest persisted state is returned).
 *
 * Area entries carry labels only (coordinates optional — label-only areas
 * supported since 10J-R1; radius filtering excludes them honestly).
 */

import { getApi } from '../../../lib/api-client';
import { initialsOf } from '../../../lib/request-labels';

import { ProfileSaveError } from './mock-technician-profile-data-source';

import type {
  TechnicianProfile,
  TechnicianProfileDataSource,
  TechnicianProfileDraft,
  TechnicianVerificationStatus,
} from './technician-profile-types';
import type { TechnicianSelfProfileDto } from '@khabir/shared-types';

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

function mapSelfProfile(dto: TechnicianSelfProfileDto, phoneAr: string): TechnicianProfile {
  const displayName = dto.displayName ?? '';
  return {
    displayNameAr: displayName,
    initialsAr: initialsOf(displayName),
    phoneAr,
    bioAr: dto.bio ?? '',
    experienceYears: dto.experienceYears,
    specialtiesAr: [],
    appliances: [],
    servicesAr: dto.services.map((s) => s.nameAr),
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
    // Real self profile + identity (phone lives on the account, not the profile).
    const api = getApi();
    const [profile, me] = await Promise.all([
      api.request<TechnicianSelfProfileDto>('GET', '/technician/profile').then((res) => res.data),
      api
        .request<{ phone: string | null }>('GET', '/me')
        .then((res) => res.data)
        .catch(() => ({ phone: null })),
    ]);
    return mapSelfProfile(profile, me.phone ?? '');
  }

  async saveProfile(input: {
    role: 'technician';
    profile: TechnicianProfileDraft;
  }): Promise<TechnicianProfile> {
    const saved = await this.patchProfile(input.profile);
    return mapSelfProfile(saved, input.profile.phoneAr ?? '');
  }

  /**
   * Persists the submitted profile via PATCH. Verification STATUS remains
   * admin-owned (docs/09 §6) — no self-approval is performed anywhere; the
   * honest persisted state is returned.
   */
  async submitVerificationProfile(input: {
    role: 'technician';
    profile: TechnicianProfileDraft;
  }): Promise<TechnicianProfile> {
    return this.saveProfile(input);
  }

  private async patchProfile(draft: TechnicianProfileDraft): Promise<TechnicianSelfProfileDto> {
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
    if (Object.keys(body).length === 0) {
      // Nothing to persist — idempotent no-op returns current server state.
      return getApi().request<TechnicianSelfProfileDto>('GET', '/technician/profile').then((r) => r.data);
    }
    return getApi()
      .request<TechnicianSelfProfileDto>('PATCH', '/technician/profile', body)
      .then((r) => r.data);
  }
}
