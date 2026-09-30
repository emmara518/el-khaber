/**
 * Mock `TechnicianHomeDataSource` (T-A).
 *
 * Persona extends the discovery fixture (tech-2 سامي محمود keeps
 * his name, rating, review count, specialty, and areas) so the two
 * sides of the product agree. Incoming previews are pending requests
 * matching his appliance coverage; the active service mirrors an
 * in-progress job. Deterministic and cloned per call.
 */

import {
  availabilityLabelAr,
  type TechnicianAvailabilityStatus,
  type TechnicianHomeDataSource,
  type TechnicianHomeViewModel,
} from './technician-home-types';

const HOME_FIXTURE: TechnicianHomeViewModel = {
  profile: {
    nameAr: 'سامي محمود',
    initialsAr: 'س',
    specialtyAr: 'تبريد وتكييف',
    areasAr: ['القاهرة – مدينة نصر', 'الجيزة – الدقي'],
    rating: 4.9,
    reviewCount: 213,
    verification: 'verified',
    verificationNoteAr: 'تم التحقق من الهوية والخبرة من قبل فريق الخبير.',
    availabilityLabelAr: 'متاح اليوم',
    available: true,
  },
  today: {
    newRequests: 2,
    inProgress: 1,
    onTheWay: 1,
    completedToday: 3,
  },
  incoming: [
    {
      id: 'tin-001',
      customerNameAr: 'أم نورة',
      applianceAr: 'مكيف',
      applianceSlug: 'air_conditioner',
      problemAr: 'صيانة مكيف سبليت',
      timeAr: 'اليوم ٥:٠٠ م',
    },
    {
      id: 'tin-002',
      customerNameAr: 'أبو كريم',
      applianceAr: 'مكيف',
      applianceSlug: 'air_conditioner',
      problemAr: 'تنقيط مياه من الوحدة الداخلية',
      timeAr: 'غدًا ٩:٠٠ ص',
    },
  ],
  active: {
    id: 'order-002',
    customerNameAr: 'أبو يوسف',
    applianceAr: 'مكيف',
    applianceSlug: 'air_conditioner',
    taskAr: 'صيانة مكيف سبليت',
    statusLabelAr: 'قيد التنفيذ',
    startedAr: 'بدأ اليوم ١:٠٠ م',
  },
  role: 'technician',
};

export class MockTechnicianHomeDataSource implements TechnicianHomeDataSource {
  private status: TechnicianAvailabilityStatus = 'available';

  constructor(private readonly mode: 'success' | 'failing' = 'success') {}

  async getHome(_input: { role: 'technician' }): Promise<TechnicianHomeViewModel> {
    const base = JSON.parse(JSON.stringify(HOME_FIXTURE)) as TechnicianHomeViewModel;
    return {
      ...base,
      profile: {
        ...base.profile,
        available: this.status === 'available',
        availabilityLabelAr: availabilityLabelAr(this.status),
      },
    };
  }

  async setAvailability(input: {
    role: 'technician';
    available: boolean;
  }): Promise<{ availabilityStatus: TechnicianAvailabilityStatus }> {
    if (this.mode === 'failing') {
      throw new Error('تعذر تحديث حالة التوفر. حاول مجددًا');
    }
    this.status = input.available ? 'available' : 'unavailable';
    return { availabilityStatus: this.status };
  }
}
