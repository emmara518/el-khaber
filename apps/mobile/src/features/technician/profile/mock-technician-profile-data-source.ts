/**
 * Mock `TechnicianProfileDataSource` (T-B).
 *
 * In-memory persistence seeded from the T-A persona (tech-2 سامي
 * محيور — identity consistent across home/profile/discovery).
 * `saveProfile` validates and returns the updated profile;
 * `submitVerificationProfile` returns it with `pending` status
 * ("تم إرسال البيانات للمراجعة" — never claims approval).
 * `seed` override makes every verification state (and empty
 * services/areas) deterministically reachable for QA/tests.
 * `failing` mode drives the error paths. No backend, no uploads.
 */

import {
  validateProfileDraft,
  type TechnicianProfile,
  type TechnicianProfileDataSource,
  type TechnicianProfileDraft,
  type TechnicianVerificationStatus,
} from './technician-profile-types';

export class ProfileSaveError extends Error {
  constructor(message = 'فشل حفظ الملف. حاول مجددًا') {
    super(message);
    this.name = 'ProfileSaveError';
  }
}

const APPROVED_SEED: TechnicianProfile = {
  displayNameAr: 'سامي محيور',
  initialsAr: 'س',
  phoneAr: '0512345678',
  bioAr: 'متخصص تبريد وتكييف بخبرة طويلة في المكيفات المنزلية وصيانتها الدورية.',
  experienceYears: 12,
  specialtiesAr: ['تبريد وتكييف'],
  appliances: ['air_conditioner'],
  servicesAr: ['صيانة المكيفات', 'تنظيف فلاتر المكيف', 'فحص غاز التبريد'],
  areasAr: ['العليا', 'الملز'],
  verification: 'approved',
  verificationNoteAr: 'تم التحقق من بياناتك.',
  rating: 4.9,
  reviewCount: 213,
  completedCount: 340,
};

export type ProfileSeed =
  | { kind: 'approved' }
  | { kind: 'pending' }
  | { kind: 'rejected' }
  | { kind: 'action_required' }
  | { kind: 'empty_services' }
  | { kind: 'empty_areas' };

function seedProfile(seed: ProfileSeed): TechnicianProfile {
  switch (seed.kind) {
    case 'approved':
      return { ...APPROVED_SEED };
    case 'pending':
      return {
        ...APPROVED_SEED,
        verification: 'pending',
        verificationNoteAr: 'تم إرسال البيانات للمراجعة.',
      };
    case 'rejected':
      return {
        ...APPROVED_SEED,
        verification: 'rejected',
        verificationNoteAr: 'لم يتم اعتماد البيانات الحالية.',
      };
    case 'action_required':
      return {
        ...APPROVED_SEED,
        verification: 'action_required',
        verificationNoteAr: 'نحتاج إلى تحديث بعض بياناتك.',
      };
    case 'empty_services':
      return { ...APPROVED_SEED, servicesAr: [] };
    case 'empty_areas':
      return { ...APPROVED_SEED, areasAr: [] };
  }
}

export class MockTechnicianProfileDataSource implements TechnicianProfileDataSource {
  private current: TechnicianProfile;

  constructor(
    private readonly seed: ProfileSeed = { kind: 'approved' },
    private readonly mode: 'success' | 'failing' = 'success',
  ) {
    this.current = seedProfile(seed);
  }

  async getProfile(_input: { role: 'technician' }): Promise<TechnicianProfile> {
    return JSON.parse(JSON.stringify(this.current)) as TechnicianProfile;
  }

  async saveProfile(input: {
    role: 'technician';
    profile: TechnicianProfileDraft;
  }): Promise<TechnicianProfile> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (this.mode === 'failing') throw new ProfileSaveError();
    const errors = validateProfileDraft(input.profile);
    if (Object.keys(errors).length > 0) {
      throw new ProfileSaveError('بيانات الملف غير مكتملة');
    }
    this.current = {
      ...this.current,
      ...input.profile,
      initialsAr: input.profile.displayNameAr.trim().slice(0, 1),
    };
    return JSON.parse(JSON.stringify(this.current)) as TechnicianProfile;
  }

  async submitVerificationProfile(input: {
    role: 'technician';
    profile: TechnicianProfileDraft;
  }): Promise<TechnicianProfile> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (this.mode === 'failing') throw new ProfileSaveError('فشل إرسال البيانات. حاول مجددًا');
    const errors = validateProfileDraft(input.profile);
    if (Object.keys(errors).length > 0) {
      throw new ProfileSaveError('بيانات الملف غير مكتملة');
    }
    this.current = {
      ...this.current,
      ...input.profile,
      initialsAr: input.profile.displayNameAr.trim().slice(0, 1),
      verification: 'pending' as TechnicianVerificationStatus,
      verificationNoteAr: 'تم إرسال البيانات للمراجعة.',
    };
    return JSON.parse(JSON.stringify(this.current)) as TechnicianProfile;
  }
}
