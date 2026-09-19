/**
 * Mock `TechnicianHomeDataSource` (T-A).
 *
 * Persona extends the discovery fixture (tech-2 سامي محيور keeps
 * his name, rating, review count, specialty, and areas) so the two
 * sides of the product agree. Incoming previews are pending requests
 * matching his appliance coverage; the active service mirrors an
 * in-progress job. Deterministic and cloned per call.
 */

import {
  type TechnicianHomeDataSource,
  type TechnicianHomeViewModel,
} from './technician-home-types';

const HOME_FIXTURE: TechnicianHomeViewModel = {
  profile: {
    nameAr: 'سامي محيور',
    initialsAr: 'س',
    specialtyAr: 'تبريد وتكييف',
    areasAr: ['العليا', 'الملز'],
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
    completedToday: 3,
  },
  incoming: [
    {
      id: 'tin-001',
      customerNameAr: 'أم نورة',
      applianceAr: 'مكيف',
      problemAr: 'صيانة مكيف سبليت',
      timeAr: 'اليوم ٥:٠٠ م',
    },
    {
      id: 'tin-002',
      customerNameAr: 'أبو فهد',
      applianceAr: 'مكيف',
      problemAr: 'تنقيط مياه من الوحدة الداخلية',
      timeAr: 'غدًا ٩:٠٠ ص',
    },
  ],
  active: {
    id: 'order-002',
    customerNameAr: 'أبو تركي',
    applianceAr: 'مكيف',
    taskAr: 'صيانة مكيف سبليت',
    statusLabelAr: 'قيد التنفيذ',
    startedAr: 'بدأ اليوم ١:٠٠ م',
  },
  role: 'technician',
};

export class MockTechnicianHomeDataSource implements TechnicianHomeDataSource {
  async getHome(_input: { role: 'technician' }): Promise<TechnicianHomeViewModel> {
    return JSON.parse(JSON.stringify(HOME_FIXTURE)) as TechnicianHomeViewModel;
  }
}
