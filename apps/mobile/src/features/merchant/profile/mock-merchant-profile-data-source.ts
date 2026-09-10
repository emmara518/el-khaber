/**
 * Mock `MerchantProfileDataSource` (M-B) — one coherent merchant
 * account boundary covering profile read/save + verification
 * submission (no three competing sources).
 *
 * In-memory persistence seeded from the M-A persona (مكتبة الخبير
 * للأجهزة). `seed` makes every verification state + the incomplete
 * profile deterministically reachable; `failing` mode drives error
 * paths. Submission returns `pending` — never claims approval.
 * No backend, no uploads.
 */

import { validateMerchantDraft, type MerchantVerificationStatus } from './merchant-profile-types';

import type {
  MerchantProfile,
  MerchantProfileDataSource,
  MerchantProfileDraft,
} from './merchant-profile-types';

export class MerchantProfileSaveError extends Error {
  constructor(message = 'فشل حفظ بيانات المتجر. حاول مجددًا') {
    super(message);
    this.name = 'MerchantProfileSaveError';
  }
}

const APPROVED_SEED: MerchantProfile = {
  businessNameAr: 'مكتبة الخبير للأجهزة',
  initialsAr: 'م',
  phoneAr: '0512345678',
  bioAr: 'متجر متخصص في الأجهزة المنزلية ولوازم الصيانة بضمان معتمد من المتجر.',
  cityAr: 'الرياض',
  verification: 'approved',
  verificationNoteAr: 'تم التحقق من بيانات متجرك.',
};

export type MerchantProfileSeed =
  | { kind: 'approved' }
  | { kind: 'pending' }
  | { kind: 'rejected' }
  | { kind: 'action_required' }
  | { kind: 'incomplete' };

function seedProfile(seed: MerchantProfileSeed): MerchantProfile {
  switch (seed.kind) {
    case 'approved':
      return { ...APPROVED_SEED };
    case 'pending':
      return {
        ...APPROVED_SEED,
        verification: 'pending',
        verificationNoteAr: 'تم إرسال بيانات المتجر للمراجعة.',
      };
    case 'rejected':
      return {
        ...APPROVED_SEED,
        verification: 'rejected',
        verificationNoteAr: 'لم يتم اعتماد بيانات المتجر الحالية.',
      };
    case 'action_required':
      return {
        ...APPROVED_SEED,
        verification: 'action_required',
        verificationNoteAr: 'نحتاج إلى تحديث بعض بيانات المتجر.',
      };
    case 'incomplete':
      return {
        ...APPROVED_SEED,
        bioAr: '',
        verification: 'action_required',
        verificationNoteAr: 'أكمل بيانات متجرك لعرضها للعملاء.',
      };
  }
}

export class MockMerchantProfileDataSource implements MerchantProfileDataSource {
  private current: MerchantProfile;

  constructor(
    private readonly seed: MerchantProfileSeed = { kind: 'approved' },
    private readonly mode: 'success' | 'failing' = 'success',
  ) {
    this.current = seedProfile(seed);
  }

  async getProfile(_input: { role: 'merchant' }): Promise<MerchantProfile> {
    return JSON.parse(JSON.stringify(this.current)) as MerchantProfile;
  }

  async saveProfile(input: {
    role: 'merchant';
    profile: MerchantProfileDraft;
  }): Promise<MerchantProfile> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (this.mode === 'failing') throw new MerchantProfileSaveError();
    const errors = validateMerchantDraft(input.profile);
    if (Object.keys(errors).length > 0) {
      throw new MerchantProfileSaveError('بيانات المتجر غير مكتملة');
    }
    this.current = {
      ...this.current,
      ...input.profile,
      initialsAr: input.profile.businessNameAr.trim().slice(0, 1),
    };
    return JSON.parse(JSON.stringify(this.current)) as MerchantProfile;
  }

  async submitVerificationProfile(input: {
    role: 'merchant';
    profile: MerchantProfileDraft;
  }): Promise<MerchantProfile> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (this.mode === 'failing') {
      throw new MerchantProfileSaveError('فشل إرسال بيانات المتجر. حاول مجددًا');
    }
    const errors = validateMerchantDraft(input.profile);
    if (Object.keys(errors).length > 0) {
      throw new MerchantProfileSaveError('بيانات المتجر غير مكتملة');
    }
    this.current = {
      ...this.current,
      ...input.profile,
      initialsAr: input.profile.businessNameAr.trim().slice(0, 1),
      verification: 'pending' as MerchantVerificationStatus,
      verificationNoteAr: 'تم إرسال بيانات المتجر للمراجعة.',
    };
    return JSON.parse(JSON.stringify(this.current)) as MerchantProfile;
  }
}
