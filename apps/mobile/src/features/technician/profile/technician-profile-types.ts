/**
 * Technician profile domain (T-B) — the single coherent technician
 * model for this frontend area.
 *
 * Canonical rule (WP-3, CTO): professional coverage (specialties,
 * appliances, services) is DERIVED from the existing `TechnicianService`
 * relation + the service catalog — never stored as free-form profile
 * text and never duplicated into profile columns. The editable profile
 * draft therefore carries only display_name/bio/experience_years plus the
 * account phone and service areas. Services are selected by canonical
 * catalog service UUID (see the onboarding machine) and persisted through
 * `/technician/services`.
 */

/** The three supported home-appliance slugs (server-seeded categories). */
export type TechnicianApplianceSlug = 'washing_machine' | 'refrigerator' | 'air_conditioner';

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
  /** Derived from attached services' catalog categories (read-only). */
  readonly specialtiesAr: ReadonlyArray<string>;
  /** Derived from attached services' catalog categories (read-only). */
  readonly appliances: ReadonlyArray<TechnicianApplianceSlug>;
  /** Derived from attached services (read-only). */
  readonly servicesAr: ReadonlyArray<string>;
  readonly areasAr: ReadonlyArray<string>;
  readonly verification: TechnicianVerificationStatus;
  readonly verificationNoteAr: string;
  readonly rating: number;
  readonly reviewCount: number;
  readonly completedCount: number;
}

/** Canonical service selection to reconcile through `/technician/services`. */
export interface TechnicianProfileSaveInput {
  readonly role: 'technician';
  readonly profile: TechnicianProfileDraft;
  /** Canonical catalog service UUIDs (empty = no services attached). */
  readonly serviceIds?: ReadonlyArray<string>;
}

export interface TechnicianProfileDataSource {
  getProfile(input: { role: 'technician' }): Promise<TechnicianProfile>;
  saveProfile(input: TechnicianProfileSaveInput): Promise<TechnicianProfile>;
  submitVerificationProfile(input: TechnicianProfileSaveInput): Promise<TechnicianProfile>;
}

/**
 * Editable profile subset. Identity metrics (rating/counts) are
 * server-owned; coverage is derived from services.
 */
export interface TechnicianProfileDraft {
  readonly displayNameAr: string;
  readonly phoneAr: string;
  readonly bioAr: string;
  readonly experienceYears: number | null;
  readonly areasAr: ReadonlyArray<string>;
}

export const EMPTY_PROFILE_DRAFT: TechnicianProfileDraft = {
  displayNameAr: '',
  phoneAr: '',
  bioAr: '',
  experienceYears: null,
  areasAr: [],
};

export function draftFromProfile(profile: TechnicianProfile): TechnicianProfileDraft {
  return {
    displayNameAr: profile.displayNameAr,
    phoneAr: profile.phoneAr,
    bioAr: profile.bioAr,
    experienceYears: profile.experienceYears,
    areasAr: profile.areasAr,
  };
}

// Egyptian service areas (governorate – district). Egypt-market demo data.
export const AREA_OPTIONS: ReadonlyArray<string> = [
  'القاهرة – مدينة نصر',
  'القاهرة – المعادي',
  'الجيزة – الدقي',
  'الإسكندرية – سموحة',
  'المنوفية – شبين الكوم',
];

export const APPLIANCE_OPTIONS: ReadonlyArray<{ slug: TechnicianApplianceSlug; titleAr: string }> = [
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
  if (draft.areasAr.length === 0) errors.areasAr = 'اختر منطقة خدمة واحدة على الأقل';
  return errors;
}

/** Service selection validation (canonical catalog UUIDs). */
export function validateServiceSelection(serviceIds: ReadonlyArray<string>): string | null {
  return serviceIds.length === 0 ? 'اختر خدمة واحدة على الأقل' : null;
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
