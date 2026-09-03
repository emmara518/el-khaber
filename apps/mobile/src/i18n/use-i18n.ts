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
