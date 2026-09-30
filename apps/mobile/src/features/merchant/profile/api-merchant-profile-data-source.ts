/**
 * Real API `MerchantProfileDataSource` (Task 10J + WP-5A).
 *
 * Endpoints (docs/07 §17 + §8, merchant-only, identity from the JWT):
 * - GET /merchant/profile — own profile; 404 until onboarding,
 * - PATCH /merchant/profile — creates the profile when absent (the
 *   documented onboarding persistence) and updates otherwise.
 *   `verificationStatus` is READ-ONLY (admin authority, docs/09).
 * - GET/POST /locations — the merchant's OWN location records
 *   (docs/07 §8 allows `customer | merchant`), wired in WP-5A so the
 *   merchant's city/locality actually persists and reads back.
 *
 * Normalization:
 * - verification mapping: verified→approved, pending→pending,
 *   rejected→rejected, suspended→action_required,
 * - city: persisted as an owned Location (`label` = the selected city)
 *   referenced by `merchant_profiles.location_id`; readback resolves the
 *   location label. No new geo model is introduced.
 */

import { getApi } from '../../../lib/api-client';
import { toUserMessage } from '../../../lib/api-error';
import { buildQuery, drainPages } from '../../../lib/api-query';

import { MerchantProfileSaveError } from './mock-merchant-profile-data-source';

import type {
  MerchantProfile,
  MerchantProfileDataSource,
  MerchantProfileDraft,
  MerchantVerificationStatus,
} from './merchant-profile-types';
import type { LocationDto, MerchantProfileDto } from '@khabir/shared-types';

export { MerchantProfileSaveError };

const SAVE_FALLBACK_AR = 'فشل حفظ بيانات المتجر. حاول مجددًا';

/** Backend verification → the screen's 4-state model. */
export function mapVerificationStatus(
  status: MerchantProfileDto['verificationStatus'],
): MerchantVerificationStatus {
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

export function mapMerchantProfile(dto: MerchantProfileDto | null, cityAr = ''): MerchantProfile {
  if (dto === null) {
    // 404 → onboarding not completed: honest empty profile.
    return {
      businessNameAr: '',
      initialsAr: '',
      phoneAr: '',
      bioAr: '',
      cityAr: '',
      verification: 'action_required',
      verificationNoteAr: 'أكمل بيانات متجرك لعرضها للعملاء.',
    };
  }
  const businessName = dto.businessName ?? '';
  return {
    businessNameAr: businessName,
    initialsAr: businessName.trim().length > 0 ? businessName.trim().slice(0, 1) : '',
    phoneAr: dto.contactPhone ?? '',
    bioAr: dto.bio ?? '',
    cityAr,
    verification: mapVerificationStatus(dto.verificationStatus),
    verificationNoteAr: '',
  };
}

/** Reads the merchant's own locations (docs/07 §8, role customer|merchant). */
async function loadOwnLocations(): Promise<ReadonlyArray<LocationDto>> {
  return drainPages<LocationDto>((page, limit) =>
    getApi()
      .request<LocationDto[]>('GET', `/locations${buildQuery({ page, limit })}`)
      .then((res) => ({ items: res.data, meta: res.meta })),
  );
}

/** Resolves the display city from the referenced owned location (readback). */
async function resolveCity(locationId: string | null): Promise<string> {
  if (locationId === null) return '';
  try {
    const locations = await loadOwnLocations();
    const match = locations.find((l) => l.id === locationId);
    return match?.label ?? match?.city ?? '';
  } catch {
    return '';
  }
}

/** Finds or creates the owned location for a city label (no duplicates). */
async function ensureLocationId(cityAr: string): Promise<string> {
  const locations = await loadOwnLocations();
  const existing = locations.find((l) => (l.label ?? '') === cityAr);
  if (existing !== undefined) {
    return existing.id;
  }
  const created = await getApi().request<LocationDto>('POST', '/locations', { label: cityAr });
  return created.data.id;
}

export class ApiMerchantProfileDataSource implements MerchantProfileDataSource {
  async getProfile(_input: { role: 'merchant' }): Promise<MerchantProfile> {
    try {
      const res = await getApi().request<MerchantProfileDto>('GET', '/merchant/profile');
      const cityAr = await resolveCity(res.data.locationId);
      return mapMerchantProfile(res.data, cityAr);
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) {
        return mapMerchantProfile(null);
      }
      throw new MerchantProfileSaveError(toUserMessage(err, SAVE_FALLBACK_AR));
    }
  }

  async saveProfile(input: { role: 'merchant'; profile: MerchantProfileDraft }): Promise<MerchantProfile> {
    return this.persist(input.profile);
  }

  async submitVerificationProfile(input: {
    role: 'merchant';
    profile: MerchantProfileDraft;
  }): Promise<MerchantProfile> {
    // The backend has no separate submission endpoint: PATCH is the
    // documented onboarding persistence; verification stays
    // admin-authoritative (never claimed approved here).
    return this.persist(input.profile);
  }

  private async persist(draft: MerchantProfileDraft): Promise<MerchantProfile> {
    const cityAr = draft.cityAr.trim();
    try {
      const body: Record<string, unknown> = {
        businessName: draft.businessNameAr.trim(),
        bio: draft.bioAr.trim().length > 0 ? draft.bioAr.trim() : undefined,
        contactPhone: draft.phoneAr.trim().length > 0 ? draft.phoneAr.trim() : undefined,
      };
      if (cityAr.length > 0) {
        // Owned location first, then the profile reference (docs/07 §17/§8).
        body['locationId'] = await ensureLocationId(cityAr);
      }
      const res = await getApi().request<MerchantProfileDto>('PATCH', '/merchant/profile', body);
      return mapMerchantProfile(res.data, cityAr);
    } catch (err: unknown) {
      throw new MerchantProfileSaveError(toUserMessage(err, SAVE_FALLBACK_AR));
    }
  }
}
