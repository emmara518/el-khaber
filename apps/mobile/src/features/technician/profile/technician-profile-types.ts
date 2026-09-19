/**
 * Technician profile domain (T-B) — the single coherent technician
 * model for this frontend area.
 *
 * Fields mirror docs/06_DATABASE.md §4 (display_name, bio,
 * avatar, verification_status, experience_years, rating_average,
 * rating_count) plus the working facets discovery already uses
 * (specialties, appliances, services, areas). No KYC/document
 * taxonomy exists in the docs, so verification stays a generic
 * 4-state status with user-safe copy — never invented paperwork.
 */

import type { ApplianceSlug } from '../../customer/home/data/customer-home-types';

export type TechnicianVerificationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'action_required';

export interface TechnicianProfile {
  readonly displayNameAr: string;
  readonly initialsAr: string;
  readonly phoneAr: string;
  readonly bioAr: string;
  readonly experienceYears: number | null;
  readonly specialtiesAr: ReadonlyArray<string>;
  readonly appliances: ReadonlyArray<ApplianceSlug>;
  readonly servicesAr: ReadonlyArray<string>;
  readonly areasAr: ReadonlyArray<string>;
  readonly verification: TechnicianVerificationStatus;
  readonly verificationNoteAr: string;
  readonly rating: number;
  readonly reviewCount: number;
  readonly completedCount: number;
}

export interface TechnicianProfileDataSource {
  getProfile(input: { role: 'technician' }): Promise<TechnicianProfile>;
  saveProfile(input: { role: 'technician'; profile: TechnicianProfileDraft }): Promise<TechnicianProfile>;
  submitVerificationProfile(input: { role: 'technician'; profile: TechnicianProfileDraft }): Promise<TechnicianProfile>;
}

/** Editable subset — identity metrics (rating/counts) are server-owned. */
export interface TechnicianProfileDraft {
  readonly displayNameAr: string;
  readonly phoneAr: string;
  readonly bioAr: string;
  readonly experienceYears: number | null;
  readonly specialtiesAr: ReadonlyArray<string>;
  readonly appliances: ReadonlyArray<ApplianceSlug>;
  readonly servicesAr: ReadonlyArray<string>;
  readonly areasAr: ReadonlyArray<string>;
}

export const EMPTY_PROFILE_DRAFT: TechnicianProfileDraft = {
  displayNameAr: '',
  phoneAr: '',
  bioAr: '',
  experienceYears: null,
  specialtiesAr: [],
  appliances: [],
  servicesAr: [],
  areasAr: [],
};

export function draftFromProfile(profile: TechnicianProfile): TechnicianProfileDraft {
  return {
    displayNameAr: profile.displayNameAr,
    phoneAr: profile.phoneAr,
    bioAr: profile.bioAr,
    experienceYears: profile.experienceYears,
    specialtiesAr: profile.specialtiesAr,
    appliances: profile.appliances,
    servicesAr: profile.servicesAr,
    areasAr: profile.areasAr,
  };
}

/** Home-appliance domain only — no generic trades, ever. */
export const SPECIALTY_OPTIONS: ReadonlyArray<string> = [
  'تبريد وتكييف',
  'غسالات أوتوماتيك',
  'ثلاجات وفريزرات',
];

export const SERVICE_OPTIONS: ReadonlyArray<string> = [
  'إصلاح الغسالات',
  'تنظيف الفلاتر',
  'فحص التسرب',
  'فحص تبريد الثلاجات',
  'تنظيف ملفات التهوية',
  'صيانة المكيفات',
  'تنظيف فلاتر المكيف',
  'فحص غاز التبريد',
];

export const AREA_OPTIONS: ReadonlyArray<string> = [
  'النزهة',
  'الملز',
  'العليا',
  'الشفا',
  'جدة – الروضة',
];

export const APPLIANCE_OPTIONS: ReadonlyArray<{ slug: ApplianceSlug; titleAr: string }> = [
  { slug: 'washing_machine', titleAr: 'غسالات' },
  { slug: 'refrigerator', titleAr: 'ثلاجات' },
  { slug: 'air_conditioner', titleAr: 'تكييفات' },
];

/** Mirrors shared-validation phoneSchema (7–15 digits, optional +). */
const PHONE_RE = /^\+?[0-9]{7,15}$/u;

export function validateTechnicianPhone(phone: string): string | null {
  const v = phone.trim();
  if (v.length === 0) return 'أدخل رقم الهاتف';
  return PHONE_RE.test(v) ? null : 'رقم الهاتف يجب أن يكون من ٧ إلى ١٥ رقمًا';
}

export function validateProfileDraft(draft: TechnicianProfileDraft): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};
  if (draft.displayNameAr.trim().length < 2) errors.displayNameAr = 'أدخل الاسم (حرفان على الأقل)';
  const phoneError = validateTechnicianPhone(draft.phoneAr);
  if (phoneError !== null) errors.phoneAr = phoneError;
  if (draft.experienceYears !== null && (draft.experienceYears < 0 || draft.experienceYears > 50)) {
    errors.experienceYears = 'سنوات الخبرة يجب أن تكون بين ٠ و٥٠';
  }
  if (draft.specialtiesAr.length === 0) errors.specialtiesAr = 'اختر تخصصًا واحدًا على الأقل';
  if (draft.appliances.length === 0) errors.appliances = 'اختر جهازًا واحدًا على الأقل';
  if (draft.servicesAr.length === 0) errors.servicesAr = 'اختر خدمة واحدة على الأقل';
  if (draft.areasAr.length === 0) errors.areasAr = 'اختر منطقة خدمة واحدة على الأقل';
  return errors;
}

/** Pure multi-select toggle shared by every selector (unit-tested). */
export function toggleStringList<T>(list: ReadonlyArray<T>, value: T): ReadonlyArray<T> {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Conservative 4-state copy — generic messages, no legal claims. */
export function verificationStatusCopy(status: TechnicianVerificationStatus): {
  icon: 'check-circle' | 'clock' | 'x-circle' | 'alert-circle';
  titleAr: string;
  bodyAr: string;
} {
  switch (status) {
    case 'approved':
      return {
        icon: 'check-circle',
        titleAr: 'تم التحقق',
        bodyAr: 'تم التحقق من بياناتك. ملفك ظاهر الآن للعملاء.',
      };
    case 'pending':
      return {
        icon: 'clock',
        titleAr: 'قيد المراجعة',
        bodyAr: 'تم إرسال البيانات للمراجعة. سنعلمك فور انتهائها.',
      };
    case 'rejected':
      return {
        icon: 'x-circle',
        titleAr: 'تعذر اعتماد البيانات',
        bodyAr: 'لم يتم اعتماد البيانات الحالية. راجع بياناتك وحدثها ثم أعد الإرسال.',
      };
    case 'action_required':
      return {
        icon: 'alert-circle',
        titleAr: 'يحتاج إلى تحديث البيانات',
        bodyAr: 'نحتاج إلى تحديث بعض بياناتك قبل إتمام المراجعة.',
      };
  }
}
