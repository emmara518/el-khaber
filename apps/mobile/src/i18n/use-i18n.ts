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
