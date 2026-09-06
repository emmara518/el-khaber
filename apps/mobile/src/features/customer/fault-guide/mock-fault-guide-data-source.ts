/**
 * Mock `FaultGuideDataSource` (Batch B).
 *
 * Copy rules enforced by `fault-guide.spec.ts`:
 * - causes use uncertain language (قد يكون / من المحتمل),
 * - steps are basic safe checks only (no panels, no live electrics,
 *   no gas/refrigerant handling, no disassembly),
 * - every detail ends with an action that can escalate to a
 *   qualified technician,
 * - one "other" symptom per appliance intentionally has NO detail so
 *   the NO_MATCH state is reachable deterministically.
 */

import {
  type FaultGuideData,
  type FaultGuideDataSource,
} from './fault-guide-types';

const GUIDE_FIXTURE: FaultGuideData = {
  appliances: [
    { slug: 'washing_machine', titleAr: 'غسالات', taglineAr: 'أعطال الغسالات الأوتوماتيكية' },
    { slug: 'refrigerator', titleAr: 'ثلاجات', taglineAr: 'أعطال التبريد والتجميد' },
    { slug: 'air_conditioner', titleAr: 'تكييفات', taglineAr: 'أعطال التبريد والتكييف' },
  ],
  symptoms: [
    { id: 'wm-no-power', applianceSlug: 'washing_machine', titleAr: 'الغسالة لا تعمل إطلاقًا', frequencyAr: 'شائع جدًا' },
    { id: 'wm-vibration', applianceSlug: 'washing_machine', titleAr: 'اهتزاز قوي أثناء العصر', frequencyAr: 'شائع' },
    { id: 'wm-leak', applianceSlug: 'washing_machine', titleAr: 'تسرب مياه أسفل الغسالة', frequencyAr: 'شائع' },
    { id: 'wm-other', applianceSlug: 'washing_machine', titleAr: 'عطل آخر غير مذكور', frequencyAr: '' },
    { id: 'rf-weak-cooling', applianceSlug: 'refrigerator', titleAr: 'ضعف التبريد في الثلاجة', frequencyAr: 'شائع جدًا' },
    { id: 'rf-ice-buildup', applianceSlug: 'refrigerator', titleAr: 'تراكم الثلج في الفريزر', frequencyAr: 'شائع' },
    { id: 'rf-noise', applianceSlug: 'refrigerator', titleAr: 'صوت مرتفع من الثلاجة', frequencyAr: 'أقل شيوعًا' },
    { id: 'rf-other', applianceSlug: 'refrigerator', titleAr: 'عطل آخر غير مذكور', frequencyAr: '' },
    { id: 'ac-no-cooling', applianceSlug: 'air_conditioner', titleAr: 'المكيف لا يبرد', frequencyAr: 'شائع جدًا' },
    { id: 'ac-water-drip', applianceSlug: 'air_conditioner', titleAr: 'تنقيط مياه من الوحدة الداخلية', frequencyAr: 'شائع' },
    { id: 'ac-smell', applianceSlug: 'air_conditioner', titleAr: 'رائحة غير مستحبة عند التشغيل', frequencyAr: 'أقل شيوعًا' },
    { id: 'ac-other', applianceSlug: 'air_conditioner', titleAr: 'عطل آخر غير مذكور', frequencyAr: '' },
  ],
  details: [
    {
      symptomId: 'wm-no-power',
      possibleCausesAr: [
        'قد يكون السبب عدم وصول التيار إلى المقبس',
        'من الأسباب المحتملة عدم إغلاق باب الغسالة بإحكام',
        'قد يكون السبب خللًا في زر التشغيل نفسه',
      ],
      safeStepsAr: [
        'جرّب الخطوة التالية: تأكد أن قابس الغسالة موصول بإحكام في المقبس',
        'تأكد من إغلاق باب الغسالة حتى تسمع صوت القفل',
        'جرّب تشغيل جهاز آخر على المقبس نفسه للتأكد من وجود الكهرباء',
      ],
      warningAr: null,
      actionAr: 'إذا استمرت المشكلة بعد هذه الفحوصات البسيطة، ابحث عن فني متخصص لفحص الجهاز.',
    },
    {
      symptomId: 'wm-vibration',
      possibleCausesAr: [
        'قد يكون السبب عدم استواء الغسالة على الأرض',
        'من الأسباب المحتملة توزيع الملابس بشكل غير متوازن داخل الحلة',
        'قد يكون السبب زيادة الحمولة عن السعة الموصى بها',
      ],
      safeStepsAr: [
        'جرّب الخطوة التالية: أوقف التشغيل وأعد توزيع الملابس بالتساوي',
        'تأكد أن الغسالة ثابتة على الأرض ولا تميل لأي جهة',
        'قلل الحمولة والتزم بالسعة المكتوبة في دليل الجهاز',
      ],
      warningAr: null,
      actionAr: 'إذا استمر الاهتزاز القوي، ابحث عن فني لفحص قواعد التثبيت الداخلية.',
    },
    {
      symptomId: 'wm-leak',
      possibleCausesAr: [
        'قد يكون السبب خرطوم صرف غير مثبت جيدًا',
        'من الأسباب المحتملة انسداد بسيط في فلتر الوبر',
        'قد يكون السبب استخدام كمية زائدة من مسحوق الغسيل',
      ],
      safeStepsAr: [
        'جرّب الخطوة التالية: أوقف التشغيل وافصل القابس عن المقبس',
        'جفف المياه عن الأرضية لتفادي الانزلاق',
        'تأكد بالنظر فقط أن خرطوم الصرف في مكانه دون فك أي أجزاء',
      ],
      warningAr: 'تنبيه: لا تلمس أي مياه قريبة من التوصيلات الكهربائية، ولا تحاول فك أي أجزاء داخلية بنفسك.',
      actionAr: 'تسرب المياه يحتاج فحص فني — ابحث عن فني متخصص ولا تعيد التشغيل قبل الفحص.',
    },
    {
      symptomId: 'rf-weak-cooling',
      possibleCausesAr: [
        'قد يكون السبب تراكم الغبار على ملفات التهوية الخلفية',
        'من الأسباب المحتملة فتح الباب بشكل متكرر أو عدم إغلاقه جيدًا',
        'قد يكون السبب ضبط درجة الحرارة على مستوى غير مناسب',
      ],
      safeStepsAr: [
        'جرّب الخطوة التالية: تأكد من إغلاق الباب بإحكام وعدم وجود ما يعيقه',
        'راجع ضبط درجة الحرارة واضبطها على المستوى الموصى به',
        'اترك مسافة تهوية حول الثلاجة ولا تلصقها بالحائط',
      ],
      warningAr: null,
      actionAr: 'إذا لم يتحسن التبريد خلال يوم، ابحث عن فني — قد يحتاج الأمر فحص دائرة التبريد.',
    },
    {
      symptomId: 'rf-ice-buildup',
      possibleCausesAr: [
        'قد يكون السبب بقاء باب الفريزر مفتوحًا جزئيًا',
        'من الأسباب المحتملة تلف بسيط في جوان الباب يسمح بدخول الهواء',
        'قد يكون السبب وضع أطعمة ساخنة داخل الفريزر مباشرة',
      ],
      safeStepsAr: [
        'جرّب الخطوة التالية: تأكد من إغلاق باب الفريزر تمامًا',
        'افحص جوان الباب بالنظر وتأكد من نظافته وعدم تشققه الظاهر',
        'تجنب وضع الأطعمة الساخنة مباشرة واتركها تبرد أولًا',
      ],
      warningAr: null,
      actionAr: 'إذا تكرر تراكم الثلج بسرعة، ابحث عن فني لفحص نظام إذابة الثلج.',
    },
    {
      symptomId: 'rf-noise',
      possibleCausesAr: [
        'قد يكون السبب ملامسة الثلاجة للحائط أو لأثاث مجاور',
        'من الأسباب المحتملة عدم استواء الثلاجة على الأرض',
        'قد يكون السبب اهتزاز أرفف أو أغراض داخل الثلاجة',
      ],
      safeStepsAr: [
        'جرّب الخطوة التالية: أبعد الثلاجة قليلًا عن الحائط',
        'تأكد من استوائها وثبات أرجلها على الأرض',
        'رتب الأغراض الداخلية بحيث لا تهتز مع التشغيل',
      ],
      warningAr: null,
      actionAr: 'إذا كان الصوت مرتفعًا ومستمرًا مع اهتزاز واضح، ابحث عن فني للفحص.',
    },
    {
      symptomId: 'ac-no-cooling',
      possibleCausesAr: [
        'قد يكون السبب اتساخ فلاتر الهواء مما يضعف تدفقه',
        'من الأسباب المحتملة ضبط المكيف على وضع المروحة بدل التبريد',
        'قد يكون السبب نقص في غاز التبريد — وهذا يحتاج فنيًا حتمًا',
      ],
      safeStepsAr: [
        'جرّب الخطوة التالية: تأكد أن وضع التشغيل هو التبريد وليس المروحة',
        'نظف فلاتر الهواء القابلة للفك حسب دليل الجهاز ثم أعد تركيبها',
        'تأكد من إغلاق النوافذ والأبواب في الغرفة المبردة',
      ],
      warningAr: 'تنبيه: لا تحاول التعامل مع غاز التبريد أو فتح الوحدة الخارجية بنفسك إطلاقًا.',
      actionAr: 'إذا استمر ضعف التبريد بعد تنظيف الفلاتر، ابحث عن فني معتمد لفحص الغاز والضاغط.',
    },
    {
      symptomId: 'ac-water-drip',
      possibleCausesAr: [
        'قد يكون السبب انسدادًا بسيطًا في خرطوم تصريف المياه',
        'من الأسباب المحتملة ميل الوحدة الداخلية بزاوية غير صحيحة',
        'قد يكون السبب اتساخ الفلاتر مما يزيد التكثف',
      ],
      safeStepsAr: [
        'جرّب الخطوة التالية: أوقف التشغيل وجفف المياه المتسربة',
        'نظف فلاتر الهواء القابلة للفك حسب دليل الجهاز',
        'تأكد بالنظر فقط أن خرطوم التصريف غير مثني أو مسدود من الخارج',
      ],
      warningAr: null,
      actionAr: 'إذا استمر التنقيط، ابحث عن فني لتنظيف خط التصريف وضبط الميول.',
    },
    {
      symptomId: 'ac-smell',
      possibleCausesAr: [
        'قد يكون السبب تراكم الغبار والرطوبة على الفلاتر',
        'من الأسباب المحتملة ركود مياه التكثف داخل الحوض',
        'قد يكون السبب روائح ممتصة من الغرفة نفسها',
      ],
      safeStepsAr: [
        'جرّب الخطوة التالية: نظف فلاتر الهواء القابلة للفك وجففها جيدًا',
        'شغّل وضع المروحة لفترة قصيرة لتهوية الوحدة',
        'هوِّ الغرفة جيدًا قبل إعادة تشغيل التبريد',
      ],
      warningAr: 'تنبيه: إذا كانت الرائحة تشبه الاحتراق، أوقف المكيف فورًا وافصل القابس ولا تعيد التشغيل.',
      actionAr: 'رائحة الاحتراق أو استمرار الرائحة تعني أنك تحتاج فنيًا — ابحث عن فني ولا تؤجل الفحص.',
    },
  ],
};

export class MockFaultGuideDataSource implements FaultGuideDataSource {
  async getGuide(_input: { role: 'customer' }): Promise<FaultGuideData> {
    return JSON.parse(JSON.stringify(GUIDE_FIXTURE)) as FaultGuideData;
  }
}
