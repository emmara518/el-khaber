/**
 * Mock `MaintenanceEntryDataSource` (Batch A entry scope).
 *
 * Appliances are the three locked categories (غسالات/ثلاجات/تكييفات).
 * Teasers name common symptoms with report counts only — no
 * diagnoses, no instructions. Counts reuse Home-fixture magnitudes
 * so the product reads coherently.
 */

import {
  type MaintenanceEntryDataSource,
  type MaintenanceEntryViewModel,
} from './maintenance-entry-types';

const ENTRY_FIXTURE: MaintenanceEntryViewModel = {
  appliances: [
    { slug: 'washing_machine', titleAr: 'غسالات', icon: '🧺', techniciansAr: '١٥ فنيًا متاحًا', issueCount: 3 },
    { slug: 'refrigerator', titleAr: 'ثلاجات', icon: '❄️', techniciansAr: '١٨ فنيًا متاحًا', issueCount: 3 },
    { slug: 'air_conditioner', titleAr: 'تكييفات', icon: '🌬️', techniciansAr: '١٢ فنيًا متاحًا', issueCount: 3 },
  ],
  stepsAr: [
    'اختر جهازك من الأجهزة المنزلية',
    'حدد العرض الذي تلاحظه',
    'اقرأ الإرشاد الآمن المختصر',
    'اعثر على فني متخصص عند الحاجة',
  ],
  popularIssues: [
    { id: 'wm-1', applianceSlug: 'washing_machine', titleAr: 'الغسالة لا تعمل إطلاقًا', reportsAr: 'شائع جدًا' },
    { id: 'wm-2', applianceSlug: 'washing_machine', titleAr: 'اهتزاز قوي أثناء العصر', reportsAr: 'شائع' },
    { id: 'wm-3', applianceSlug: 'washing_machine', titleAr: 'تسرب مياه أسفل الغسالة', reportsAr: 'شائع' },
    { id: 'rf-1', applianceSlug: 'refrigerator', titleAr: 'ضعف التبريد في الثلاجة', reportsAr: 'شائع جدًا' },
    { id: 'rf-2', applianceSlug: 'refrigerator', titleAr: 'تراكم الثلج في الفريزر', reportsAr: 'شائع' },
    { id: 'rf-3', applianceSlug: 'refrigerator', titleAr: 'صوت مرتفع من الموتور', reportsAr: 'أقل شيوعًا' },
    { id: 'ac-1', applianceSlug: 'air_conditioner', titleAr: 'المكيف لا يبرد', reportsAr: 'شائع جدًا' },
    { id: 'ac-2', applianceSlug: 'air_conditioner', titleAr: 'تنقيط مياه من الوحدة الداخلية', reportsAr: 'شائع' },
    { id: 'ac-3', applianceSlug: 'air_conditioner', titleAr: 'رائحة غير مستحبة عند التشغيل', reportsAr: 'أقل شيوعًا' },
  ],
};

export class MockMaintenanceEntryDataSource implements MaintenanceEntryDataSource {
  async getEntry(_input: { role: 'customer' }): Promise<MaintenanceEntryViewModel> {
    return JSON.parse(JSON.stringify(ENTRY_FIXTURE)) as MaintenanceEntryViewModel;
  }
}
