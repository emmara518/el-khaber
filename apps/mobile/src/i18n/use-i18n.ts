/**
 * Tiny in-tree i18n helper. The product's primary language is Arabic
 * (RTL). A future English locale can be added without touching
 * component code.
 *
 * We intentionally do NOT add `i18next` or `expo-localization` to
 * avoid pulling in additional native modules; the constitution
 * (`docs/02_PRODUCT.md` §3.3) keeps the primary language Arabic
 * and English is only a technical identifier.
 */

import { useMemo } from 'react';

export type Locale = 'ar';

const ARABIC: Record<string, string> = {
  // Tab bar
  'tab.home': 'الرئيسية',
  'tab.requests': 'طلبات',
  'tab.maintenance': 'صيانة',
  'tab.messages': 'المحادثات',
  'tab.profile': 'الملف الشخصي',
  // Header
  'home.notifications': 'الإشعارات',
  // Home
  'home.showAll': 'اعرض الكل',
  'home.appliances': 'الأجهزة المنزلية',
  'home.quickServices': 'خدمات سريعة',
  'home.guarantee': 'ضمان الخدمة الذهبي',
  'home.guarantee.cta': 'اعرف المزيد',
  'home.currentOrders': 'طلباتك الحالية',
  'home.recommendedTechnicians': 'فنيون مقترحون لك',
  'home.changeLocation': 'تغيير الموقع',
  // Placeholder screens
  'placeholder.title': 'قريباً',
  'placeholder.body': 'سيتم تفعيل هذه الشاشة في مهمة لاحقة.',
  // Auth
  'auth.appTagline': 'صيانة موثوقة لأجهزتك المنزلية',
  'auth.skip': 'تخطي',
  'auth.next': 'التالي',
  'auth.back': 'رجوع',
  'auth.continue': 'متابعة',
  'auth.login': 'تسجيل الدخول',
  'auth.register': 'إنشاء حساب',
  'auth.logout': 'تسجيل الخروج',
  'auth.identity': 'رقم الهاتف أو البريد الإلكتروني',
  'auth.password': 'كلمة المرور',
  'auth.confirmPassword': 'تأكيد كلمة المرور',
  'auth.showPassword': 'إظهار كلمة المرور',
  'auth.hidePassword': 'إخفاء كلمة المرور',
  'auth.forgotPassword': 'نسيت كلمة المرور؟',
  'auth.noAccount': 'ليس لديك حساب؟',
  'auth.hasAccount': 'لديك حساب بالفعل؟',
  'auth.chooseAccountType': 'اختر نوع حسابك',
  'auth.role.customer': 'عميل',
  'auth.role.customerDesc': 'اطلب صيانة لأجهزتك وتابع طلباتك',
  'auth.role.technician': 'فني',
  'auth.role.technicianDesc': 'استقبل طلبات الصيانة وأدر خدماتك',
  'auth.role.merchant': 'تاجر',
  'auth.role.merchantDesc': 'اعرض منتجاتك وأدر وجودك التجاري',
  'auth.onboarding1.title': 'الخبير لصيانة الأجهزة المنزلية',
  'auth.onboarding1.body': 'خدمة موثوقة لغسالاتك وثلاجاتك وتكييفاتك، بفنيين معتمدين وضمان واضح.',
  'auth.onboarding2.title': 'اعثر على الفني المناسب بثقة',
  'auth.onboarding2.body': 'اكتشف فنيين متخصصين حسب جهازك ومشكلتك، مع تقييمات حقيقية ومتابعة للطلب.',
  'auth.forgot.title': 'استعادة كلمة المرور',
  'auth.forgot.body': 'أدخل رقم هاتفك أو بريدك الإلكتروني وسنرسل لك تعليمات الاستعادة.',
  'auth.forgot.submit': 'إرسال تعليمات الاستعادة',
  'auth.forgot.sent': 'تم إرسال تعليمات الاستعادة إن كان الحساب موجودًا.',
  'auth.reset.title': 'تعيين كلمة مرور جديدة',
  'auth.reset.body': 'أدخل رمز الاستعادة ثم اختر كلمة مرور جديدة.',
  'auth.reset.token': 'رمز الاستعادة',
  'auth.reset.submit': 'حفظ كلمة المرور',
  'auth.reset.done': 'تم تحديث كلمة المرور بنجاح. سجّل الدخول بحسابك.',
  'auth.retry': 'إعادة المحاولة',
  'auth.shell.soonTitle': 'هذه المساحة قيد التجهيز',
  'auth.shell.soonBody': 'هيكل التطبيق جاهز، وسيتم تفعيل شاشات هذه المرحلة في مهمة لاحقة.',
  // Customer — requests
  'requests.title': 'طلباتي',
  'requests.subtitle': 'تابع حالة طلبات الصيانة الخاصة بك',
  'requests.filter.all': 'الكل',
  'requests.empty.title': 'لا توجد طلبات بعد',
  'requests.empty.body': 'عند إنشاء أول طلب صيانة سيظهر هنا مع حالته.',
  'requests.empty.cta': 'اطلب صيانة',
  'requests.error.title': 'تعذر تحميل الطلبات',
  // Customer — maintenance entry
  'maintenance.title': 'الصيانة',
  'maintenance.subtitle': 'شخّص مشكلة جهازك بخطوات بسيطة',
  'maintenance.appliances': 'اختر الجهاز',
  'maintenance.steps': 'كيف يعمل الدليل؟',
  'maintenance.popular': 'أعطال شائعة',
  'maintenance.empty.title': 'لا توجد أعطال معروضة',
  'maintenance.empty.body': 'اختر جهازًا لعرض أشهر الأعطال المرتبطة به.',
  // Customer — messages
  'messages.title': 'المحادثات',
  'messages.subtitle': 'تواصل مع الفنيين المرتبطين بطلباتك',
  'messages.empty.title': 'لا توجد محادثات بعد',
  'messages.empty.body': 'عند بدء طلب صيانة ستظهر محادثتك مع الفني هنا.',
  'messages.error.title': 'تعذر تحميل المحادثات',
  // Customer — profile
  'profile.title': 'الملف الشخصي',
  'profile.menu.orders': 'طلباتي',
  'profile.menu.notifications': 'الإشعارات',
  'profile.menu.subscription': 'الاشتراك',
  'profile.menu.support': 'الدعم والمساعدة',
  'profile.menu.logout': 'تسجيل الخروج',
  'profile.comingSoon': 'قريباً',
  'profile.support.body': 'فريق الدعم متاح يوميًا من ٩ صباحًا حتى ١٠ مساءً.',
  // Shared list states
  'state.loading': 'جارٍ التحميل…',
  'state.retry': 'إعادة المحاولة',
  // Customer — fault guide
  'fault.chooseAppliance': 'اختر الجهاز',
  'fault.chooseSymptom': 'اختر العرض الذي تلاحظه',
  'fault.resolving': 'جارٍ تجهيز الإرشاد…',
  'fault.back': 'رجوع',
  'fault.restart': 'ابدأ من جديد',
  'fault.findTechnician': 'ابحث عن فني',
  'fault.noMatch.title': 'لا توجد إرشادات مطابقة',
  'fault.noMatch.body': 'هذا العرض يحتاج وصفًا مباشرًا من فني متخصص. يمكنك متابعة البحث عن فني أو البدء من جديد.',
  'fault.error.title': 'تعذر تجهيز الإرشاد',
  'fault.error.body': 'حدث خطأ أثناء تجهيز النتيجة. حاول مجددًا أو ارجع خطوة.',
  'fault.deferred.title': 'البحث عن فني',
  'fault.deferred.body': 'البحث عن فنيين متخصصين سيتوفر في الخطوة القادمة. تم حفظ العرض الذي اخترته وسيُستخدم تلقائيًا عند توفر البحث.',
  'fault.deferred.context': 'العرض المختار',
  'fault.deferred.backToGuide': 'رجوع إلى دليل الأعطال',
  'fault.deferred.backToHome': 'رجوع إلى الرئيسية',
  // Customer — technician discovery
  'discovery.title': 'ابحث عن فني',
  'discovery.subtitle': 'فنيون متخصصون حسب جهازك ومنطقتك',
  'discovery.filters': 'تصفية النتائج',
  'discovery.apply': 'تطبيق المرشحات',
  'discovery.clear': 'مسح المرشحات',
  'discovery.empty.title': 'لا يوجد فنيون مطابقون',
  'discovery.empty.body': 'جرّب توسيع البحث أو مسح بعض المرشحات.',
  'discovery.error.title': 'تعذر تحميل الفنيين',
  'discovery.profile.about': 'نبذة',
  'discovery.profile.services': 'الخدمات',
  'discovery.profile.areas': 'مناطق الخدمة',
  'discovery.profile.reviews': 'التقييمات',
  'discovery.profile.noReviews': 'لا توجد تقييمات بعد لهذا الفني.',
  'discovery.profile.requestService': 'اطلب خدمة',
  'discovery.profile.missing': 'الفني غير موجود',
  'discovery.profile.missingBody': 'ربما تغيّر الرابط. ارجع إلى نتائج البحث واختر فنيًا.',
  'discovery.handoff.title': 'طلب خدمة',
  'discovery.handoff.body': 'نموذج طلب الخدمة الكامل سيتوفر في الخطوة القادمة. تم حفظ الفني والسياق المختار وسيُستخدمان تلقائيًا عند توفر النموذج.',
  'discovery.handoff.technician': 'الفني المختار',
  'discovery.handoff.context': 'سياق الطلب',
  'discovery.handoff.backToProfile': 'رجوع إلى ملف الفني',
  'discovery.handoff.backToSearch': 'رجوع إلى البحث',
};

export type TranslationKey = keyof typeof ARABIC;

export interface I18nContext {
  locale: Locale;
  /** RTL is true for Arabic. */
  rtl: boolean;
  t: (key: TranslationKey) => string;
}

export function useI18n(): I18nContext {
  return useMemo<I18nContext>(
    () => ({
      locale: 'ar',
      rtl: true,
      t: (key) => ARABIC[key] ?? String(key),
    }),
    [],
  );
}
