/**
 * Merchant profile domain (M-B) — the single coherent merchant
 * account model for this frontend area.
 *
 * Fields mirror docs/06_DATABASE.md §5 exactly: business_name, bio,
 * logo (initials pattern), verification_status, contact_phone,
 * location context (city). NO tax/commercial-registration/KYC/
 * banking fields exist in the docs — none are collected.
 * Verification is the generic 4-state status; no rejection taxonomy.
 */

export type MerchantVerificationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'action_required';

export interface MerchantProfile {
  readonly businessNameAr: string;
  readonly initialsAr: string;
  readonly phoneAr: string;
  readonly bioAr: string;
  readonly cityAr: string;
  readonly verification: MerchantVerificationStatus;
  readonly verificationNoteAr: string;
}

export interface MerchantProfileDraft {
  readonly businessNameAr: string;
  readonly phoneAr: string;
  readonly bioAr: string;
  readonly cityAr: string;
}

export const EMPTY_MERCHANT_DRAFT: MerchantProfileDraft = {
  businessNameAr: '',
  phoneAr: '',
  bioAr: '',
  cityAr: '',
};

export function draftFromMerchantProfile(profile: MerchantProfile): MerchantProfileDraft {
  return {
    businessNameAr: profile.businessNameAr,
    phoneAr: profile.phoneAr,
    bioAr: profile.bioAr,
    cityAr: profile.cityAr,
  };
}

export interface MerchantProfileDataSource {
  getProfile(input: { role: 'merchant' }): Promise<MerchantProfile>;
  saveProfile(input: { role: 'merchant'; profile: MerchantProfileDraft }): Promise<MerchantProfile>;
  submitVerificationProfile(input: {
    role: 'merchant';
    profile: MerchantProfileDraft;
  }): Promise<MerchantProfile>;
}

export const MERCHANT_CITY_OPTIONS: ReadonlyArray<string> = [
  'الرياض',
  'جدة',
  'الدمام',
  'مكة المكرمة',
  'المدينة المنورة',
];

/** Mirrors shared-validation phoneSchema (7–15 digits, optional +). */
const PHONE_RE = /^\+?[0-9]{7,15}$/u;

export function validateMerchantPhone(phone: string): string | null {
  const v = phone.trim();
  if (v.length === 0) return 'أدخل رقم الهاتف';
  return PHONE_RE.test(v) ? null : 'رقم الهاتف يجب أن يكون من ٧ إلى ١٥ رقمًا';
}

export function validateMerchantDraft(draft: MerchantProfileDraft): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};
  if (draft.businessNameAr.trim().length < 2) {
    errors.businessNameAr = 'أدخل اسم المتجر (حرفان على الأقل)';
  }
  const phoneError = validateMerchantPhone(draft.phoneAr);
  if (phoneError !== null) errors.phoneAr = phoneError;
  if (draft.cityAr.trim().length === 0) errors.cityAr = 'اختر مدينة المتجر';
  return errors;
}

export function toggleMerchantList<T>(list: ReadonlyArray<T>, value: T): ReadonlyArray<T> {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Conservative 4-state copy — generic messages, no legal claims. */
export function merchantVerificationStatusCopy(status: MerchantVerificationStatus): {
  icon: string;
  titleAr: string;
  bodyAr: string;
} {
  switch (status) {
    case 'approved':
      return {
        icon: '✓',
        titleAr: 'تم التحقق',
        bodyAr: 'تم التحقق من بيانات متجرك. ملفك ظاهر الآن للعملاء.',
      };
    case 'pending':
      return {
        icon: '◷',
        titleAr: 'قيد المراجعة',
        bodyAr: 'تم إرسال بيانات المتجر للمراجعة. سنعلمك فور انتهائها.',
      };
    case 'rejected':
      return {
        icon: '✕',
        titleAr: 'تعذر اعتماد البيانات',
        bodyAr: 'لم يتم اعتماد بيانات المتجر الحالية. راجعها وحدثها ثم أعد الإرسال.',
      };
    case 'action_required':
      return {
        icon: '!',
        titleAr: 'يحتاج إلى تحديث البيانات',
        bodyAr: 'نحتاج إلى تحديث بعض بيانات المتجر قبل إتمام المراجعة.',
      };
  }
}
