/**
 * Mock `TechnicianProfileDataSource` (T-B / WP-3).
 *
 * In-memory persistence seeded from the T-A persona (سامي محيور).
 * Coverage (specialties/appliances/services) is DERIVED from the selected
 * canonical mock catalog services — the same rule as the real adapter.
 * `seed` override reaches every verification state; `failing` mode drives
 * error paths. No backend, no uploads.
 */

import {
  validateProfileDraft,
  type TechnicianApplianceSlug,
  type TechnicianProfile,
  type TechnicianProfileDataSource,
  type TechnicianProfileSaveInput,
  type TechnicianVerificationStatus,
} from './technician-profile-types';

export class ProfileSaveError extends Error {
  constructor(message = 'فشل حفظ الملف. حاول مجددًا') {
    super(message);
    this.name = 'ProfileSaveError';
  }
}

interface MockCatalogService {
  id: string;
  nameAr: string;
  applianceSlug: TechnicianApplianceSlug;
  applianceNameAr: string;
}

/** Deterministic stand-in for the server service catalog (UUID-keyed). */
export const MOCK_CATALOG: ReadonlyArray<MockCatalogService> = [
  { id: 'svc-air-repair', nameAr: 'صيانة المكيفات', applianceSlug: 'air_conditioner', applianceNameAr: 'تكييفات' },
  { id: 'svc-air-clean', nameAr: 'تنظيف فلاتر المكيف', applianceSlug: 'air_conditioner', applianceNameAr: 'تكييفات' },
  { id: 'svc-air-gas', nameAr: 'فحص غاز التبريد', applianceSlug: 'air_conditioner', applianceNameAr: 'تكييفات' },
  { id: 'svc-washer-repair', nameAr: 'صيانة غسالات', applianceSlug: 'washing_machine', applianceNameAr: 'غسالات' },
  { id: 'svc-fridge-repair', nameAr: 'صيانة ثلاجات', applianceSlug: 'refrigerator', applianceNameAr: 'ثلاجات' },
];

function coverageFrom(serviceIds: ReadonlyArray<string>): Pick<
  TechnicianProfile,
  'servicesAr' | 'specialtiesAr' | 'appliances'
> {
  const selected = MOCK_CATALOG.filter((s) => serviceIds.includes(s.id));
  const specialties: string[] = [];
  const appliances: TechnicianApplianceSlug[] = [];
  for (const s of selected) {
    if (!specialties.includes(s.applianceNameAr)) specialties.push(s.applianceNameAr);
    if (!appliances.includes(s.applianceSlug)) appliances.push(s.applianceSlug);
  }
  return {
    servicesAr: selected.map((s) => s.nameAr),
    specialtiesAr: specialties,
    appliances,
  };
}

const APPROVED_SEED: TechnicianProfile = {
  displayNameAr: 'سامي محيور',
  initialsAr: 'س',
  phoneAr: '0512345678',
  bioAr: 'متخصص تبريد وتكييف بخبرة طويلة في المكيفات المنزلية وصيانتها الدورية.',
  experienceYears: 12,
  specialtiesAr: ['تكييفات'],
  appliances: ['air_conditioner'],
  servicesAr: ['صيانة المكيفات', 'تنظيف فلاتر المكيف', 'فحص غاز التبريد'],
  areasAr: ['القاهرة – مدينة نصر', 'الجيزة – الدقي'],
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
      return { ...APPROVED_SEED, servicesAr: [], specialtiesAr: [], appliances: [] };
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

  async saveProfile(input: TechnicianProfileSaveInput): Promise<TechnicianProfile> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (this.mode === 'failing') throw new ProfileSaveError();
    this.apply(input, false);
    return JSON.parse(JSON.stringify(this.current)) as TechnicianProfile;
  }

  async submitVerificationProfile(input: TechnicianProfileSaveInput): Promise<TechnicianProfile> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (this.mode === 'failing') throw new ProfileSaveError('فشل إرسال البيانات. حاول مجددًا');
    this.apply(input, true);
    return JSON.parse(JSON.stringify(this.current)) as TechnicianProfile;
  }

  private apply(input: TechnicianProfileSaveInput, submit: boolean): void {
    const errors = validateProfileDraft(input.profile);
    if (Object.keys(errors).length > 0) {
      throw new ProfileSaveError('بيانات الملف غير مكتملة');
    }
    const coverage =
      input.serviceIds !== undefined ? coverageFrom(input.serviceIds) : {
        servicesAr: this.current.servicesAr,
        specialtiesAr: this.current.specialtiesAr,
        appliances: this.current.appliances,
      };
    this.current = {
      ...this.current,
      ...input.profile,
      ...coverage,
      initialsAr: input.profile.displayNameAr.trim().slice(0, 1),
      ...(submit
        ? {
            verification: 'pending' as TechnicianVerificationStatus,
            verificationNoteAr: 'تم إرسال البيانات للمراجعة.',
          }
        : {}),
    };
  }
}
