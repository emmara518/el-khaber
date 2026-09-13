/**
 * Real API `MerchantProfileDataSource` (Task 10J).
 *
 * Endpoints (docs/07 §17, merchant-only, identity from the JWT):
 * - GET /merchant/profile — own profile; 404 until onboarding,
 * - PATCH /merchant/profile — creates the profile when absent (the
 *   documented onboarding persistence) and updates otherwise.
 *   `verificationStatus` is READ-ONLY (admin authority, docs/09).
 *
 * Normalization / reported gaps:
 * - verification mapping: verified→approved, pending→pending,
 *   rejected→rejected, suspended→action_required,
 * - city: the backend stores `locationId` (no city text) and no
 *   locations API exists → the city selection cannot be persisted
 *   yet; the adapter sends only the writable whitelist fields
 *   (businessName, bio, contactPhone) and reports the gap,
 * - logoUrl/image uploads: no storage/media path exists → never sent
 *   (no fabricated URLs).
 */

import { getApi } from '../../../lib/api-client';
import { toUserMessage } from '../../../lib/api-error';

import { MerchantProfileSaveError } from './mock-merchant-profile-data-source';

import type {
  MerchantProfile,
  MerchantProfileDataSource,
  MerchantProfileDraft,
  MerchantVerificationStatus,
} from './merchant-profile-types';
import type { MerchantProfileDto } from '@khabir/shared-types';

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

export function mapMerchantProfile(dto: MerchantProfileDto | null): MerchantProfile {
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
    cityAr: '', // location text not exposed (reported gap)
    verification: mapVerificationStatus(dto.verificationStatus),
    verificationNoteAr: '',
  };
}

export class ApiMerchantProfileDataSource implements MerchantProfileDataSource {
  async getProfile(_input: { role: 'merchant' }): Promise<MerchantProfile> {
    try {
      const res = await getApi().request<MerchantProfileDto>('GET', '/merchant/profile');
      return mapMerchantProfile(res.data);
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
    try {
      const res = await getApi().request<MerchantProfileDto>('PATCH', '/merchant/profile', {
        businessName: draft.businessNameAr.trim(),
        bio: draft.bioAr.trim().length > 0 ? draft.bioAr.trim() : undefined,
        contactPhone: draft.phoneAr.trim().length > 0 ? draft.phoneAr.trim() : undefined,
        // locationId: cannot be resolved — no locations API (gap).
      });
      return mapMerchantProfile(res.data);
    } catch (err: unknown) {
      throw new MerchantProfileSaveError(toUserMessage(err, SAVE_FALLBACK_AR));
    }
  }
}
