/**
 * Mock `CustomerHomeDataSource` for the Home screen.
 *
 * The Home screen consumes a `CustomerHomeDataSource` and never reaches
 * for raw fixture data directly. When the real API is wired, this
 * class is replaced by a real implementation; the presenter and the
 * view-model contract do not change.
 *
 * The fixtures are seeded from the constitution (`docs/02_PRODUCT.md`
 * §3.4) and the user-flow document (`docs/03_USER_FLOWS.md` §6). The
 * numbers and copy are deliberately small and stable; they exist only
 * to make the Home screen render and to exercise the layout.
 *
 * Source: Task #003 spec, docs/01..10, docs/adr/0001-0004.
 */

import {
  type CustomerHomeDataSource,
  type CustomerHomeViewModel,
} from './customer-home-types';

const HOME_FIXTURE: CustomerHomeViewModel = {
  context: {
    displayNameAr: 'أحمد',
    avatarInitialsAr: 'أ',
    cityAr: 'الرياض',
    districtAr: 'حي النزهة',
  },
  greeting: {
    line1Ar: 'مرحبا أحمد 👋',
    line2Ar: 'كيف يمكننا مساعدتك اليوم؟',
  },
  appliances: [
    {
      slug: 'air_conditioner',
      titleAr: 'مكيفات',
      availableTechnicians: 12,
      captionAr: 'ضمان معتمد',
      techniciansAr: 'فني متاح',
      accent: 'soft',
    },
    {
      slug: 'refrigerator',
      titleAr: 'ثلاجات',
      availableTechnicians: 18,
      captionAr: '18 شهر ضمان',
      techniciansAr: 'فني متاح',
      accent: 'soft',
    },
    {
      slug: 'washing_machine',
      titleAr: 'غسالات',
      availableTechnicians: 15,
      captionAr: '15 سنة ضمان',
      techniciansAr: 'فني متاح',
      accent: 'soft',
    },
  ],
  quickServices: [
    { id: 'track-order', titleAr: 'تتبع الطلبات', icon: 'package' },
    { id: 'request-maintenance', titleAr: 'طلب صيانة', icon: 'clipboard' },
    { id: 'search-technician', titleAr: 'ابحث عن فني', icon: 'search' },
    { id: 'fix-fault', titleAr: 'إصلاح الأعطال', icon: 'wrench' },
  ],
  guarantee: {
    titleAr: 'ضمان الخدمة الذهبي',
    descriptionAr: 'خدمة معتمدة + فنيون موثوقون + ضمان على جميع الإصلاحات',
    ctaAr: 'اعرف المزيد',
  },
  currentOrders: [
    {
      id: 'order-001',
      applianceAr: 'غسالة',
      brandAndModel: 'Samsung',
      modelCode: 'SR-2024-1258',
      status: 'in_progress',
      statusLabelAr: 'قيد التنفيذ',
      taskAr: 'تصليح غسالة سامسونج',
      technicianName: 'الفني: محمد العتيبي',
      scheduledAtIso: '2026-09-04T02:00:00+03:00',
    },
  ],
  recommendedTechnicians: [
    {
      id: 'tech-1',
      nameAr: 'محمد العتيبي',
      initialsAr: 'م',
      rating: 4.8,
      reviewCount: 127,
      specialtyAr: 'تكيفات',
    },
    {
      id: 'tech-2',
      nameAr: 'سامي محيور',
      initialsAr: 'س',
      rating: 4.9,
      reviewCount: 213,
      specialtyAr: 'ثلاجات',
    },
    {
      id: 'tech-3',
      nameAr: 'أحمد الجريسي',
      initialsAr: 'أ',
      rating: 4.9,
      reviewCount: 198,
      specialtyAr: 'غسالات',
    },
    {
      id: 'tech-4',
      nameAr: 'فهد السبيعي',
      initialsAr: 'ف',
      rating: 4.9,
      reviewCount: 156,
      specialtyAr: 'غسالات',
    },
  ],
  role: 'customer',
};

export class MockCustomerHomeDataSource implements CustomerHomeDataSource {
  async getHome(_input: { role: 'customer' }): Promise<CustomerHomeViewModel> {
    // Return a structural clone so consumers cannot mutate the fixture.
    return JSON.parse(JSON.stringify(HOME_FIXTURE)) as CustomerHomeViewModel;
  }
}
