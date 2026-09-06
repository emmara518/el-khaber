/**
 * Mock `TechnicianDataSource` (Batch C).
 *
 * Identities extend the Home fixture (tech-1..tech-4 keep their
 * names, ratings, review counts, and specialties) with the fields
 * discovery needs: verification, experience, services, areas,
 * availability, about, and reviews. No earnings, no response rates,
 * no prices — the spec supports none of those.
 */

import type { Technician } from './technician-types';

const TECHNICIANS_FIXTURE: ReadonlyArray<Technician> = [
  {
    id: 'tech-1',
    nameAr: 'محمد العتيبي',
    initialsAr: 'م',
    verified: true,
    rating: 4.8,
    reviewCount: 127,
    experienceAr: 'خبرة ٨ سنوات',
    specialtiesAr: ['غسالات أوتوماتيك'],
    appliances: ['washing_machine'],
    servicesAr: ['إصلاح الغسالات', 'تنظيف الفلاتر', 'فحص التسرب'],
    areasAr: ['النزهة', 'الملز'],
    aboutAr: 'فني متخصص في الغسالات الأوتوماتيكية، أهتم بالفحص الدقيق والشرح الواضح قبل أي إصلاح.',
    available: true,
    availabilityLabelAr: 'متاح اليوم',
    reviews: [
      { id: 'tech-1-r1', authorAr: 'أبو فهد', rating: 5, textAr: 'شغل نظيف والتزام بالموعد، أنصح به.', dateAr: 'قبل أسبوع' },
      { id: 'tech-1-r2', authorAr: 'أم سارة', rating: 4.5, textAr: 'فحص دقيق وشرح واضح للمشكلة قبل الإصلاح.', dateAr: 'قبل شهر' },
    ],
  },
  {
    id: 'tech-2',
    nameAr: 'سامي محيور',
    initialsAr: 'س',
    verified: true,
    rating: 4.9,
    reviewCount: 213,
    experienceAr: 'خبرة ١٢ سنة',
    specialtiesAr: ['تبريد وتكييف'],
    appliances: ['air_conditioner'],
    servicesAr: ['صيانة المكيفات', 'تنظيف الفلاتر', 'فحص غاز التبريد'],
    areasAr: ['العليا', 'الملز'],
    aboutAr: 'متخصص تبريد وتكييف بخبرة طويلة في المكيفات المنزلية وصيانتها الدورية.',
    available: true,
    availabilityLabelAr: 'متاح اليوم',
    reviews: [
      { id: 'tech-2-r1', authorAr: 'أبو تركي', rating: 5, textAr: 'ممتاز، حل مشكلة التبريد من أول زيارة.', dateAr: 'قبل ٣ أيام' },
      { id: 'tech-2-r2', authorAr: 'نورة', rating: 5, textAr: 'محترم ودقيق في المواعيد.', dateAr: 'قبل أسبوعين' },
    ],
  },
  {
    id: 'tech-3',
    nameAr: 'أحمد الجريسي',
    initialsAr: 'أ',
    verified: true,
    rating: 4.9,
    reviewCount: 198,
    experienceAr: 'خبرة ٦ سنوات',
    specialtiesAr: ['غسالات أوتوماتيك', 'ثلاجات وفريزرات'],
    appliances: ['washing_machine', 'refrigerator'],
    servicesAr: ['إصلاح الغسالات', 'فحص تبريد الثلاجات', 'تنظيف الفلاتر'],
    areasAr: ['النزهة'],
    aboutAr: 'أعمل على الغسالات والثلاجات مع ضمان توضيح كل خطوة قبل تنفيذها.',
    available: false,
    availabilityLabelAr: 'مشغول حاليًا',
    reviews: [
      { id: 'tech-3-r1', authorAr: 'أبو راكان', rating: 5, textAr: 'فني أمين وشغله مرتب.', dateAr: 'قبل شهر' },
    ],
  },
  {
    id: 'tech-4',
    nameAr: 'فهد السبيعي',
    initialsAr: 'ف',
    verified: false,
    rating: 4.9,
    reviewCount: 156,
    experienceAr: 'خبرة ٥ سنوات',
    specialtiesAr: ['تبريد وتكييف'],
    appliances: ['air_conditioner'],
    servicesAr: ['صيانة المكيفات', 'تعبئة الفريون', 'تنظيف الوحدات'],
    areasAr: ['الشفا'],
    aboutAr: 'فني تكييف، حسابي جديد في المنصة وتقييماتي من عملاء سابقين.',
    available: true,
    availabilityLabelAr: 'متاح اليوم',
    reviews: [],
  },
  {
    id: 'tech-5',
    nameAr: 'خالد المطيري',
    initialsAr: 'خ',
    verified: true,
    rating: 4.6,
    reviewCount: 84,
    experienceAr: 'خبرة ٤ سنوات',
    specialtiesAr: ['ثلاجات وفريزرات'],
    appliances: ['refrigerator'],
    servicesAr: ['فحص تبريد الثلاجات', 'تنظيف ملفات التهوية', 'فحص جوان الباب'],
    areasAr: ['الملز', 'العليا'],
    aboutAr: 'متخصص ثلاجات وفريزرات، أركز على التشخيص الصحيح قبل تغيير أي قطعة.',
    available: true,
    availabilityLabelAr: 'متاح غدًا',
    reviews: [
      { id: 'tech-5-r1', authorAr: 'أم ليان', rating: 4.5, textAr: 'حل مشكلة التبريد بسعر عادل.', dateAr: 'قبل أسبوعين' },
    ],
  },
  {
    id: 'tech-6',
    nameAr: 'سعد القحطاني',
    initialsAr: 'س',
    verified: true,
    rating: 4.5,
    reviewCount: 41,
    experienceAr: 'خبرة ٣ سنوات',
    specialtiesAr: ['ثلاجات وفريزرات', 'تبريد وتكييف'],
    appliances: ['refrigerator', 'air_conditioner'],
    servicesAr: ['فحص تبريد الثلاجات', 'صيانة المكيفات'],
    areasAr: ['جدة – الروضة'],
    aboutAr: 'أخدم عملاء جدة في الثلاجات والمكيفات مع التزام كامل بالمواعيد.',
    available: true,
    availabilityLabelAr: 'متاح اليوم',
    reviews: [
      { id: 'tech-6-r1', authorAr: 'أبو جود', rating: 4.5, textAr: 'تعامل راقٍ وشغل جيد.', dateAr: 'قبل شهر' },
    ],
  },
];

export interface TechnicianDataSource {
  getTechnicians(input: { role: 'customer' }): Promise<ReadonlyArray<Technician>>;
}

export class MockTechnicianDataSource implements TechnicianDataSource {
  async getTechnicians(_input: { role: 'customer' }): Promise<ReadonlyArray<Technician>> {
    return JSON.parse(JSON.stringify(TECHNICIANS_FIXTURE)) as ReadonlyArray<Technician>;
  }
}
