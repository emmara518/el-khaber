/**
 * Navigation, permission visibility, column labels and Arabic copy for the
 * admin console. Presentation-only; the server remains the authority.
 */

import type { Tab } from './types';

import {
  IconBell,
  IconClipboard,
  IconCreditCard,
  IconDashboard,
  IconGift,
  IconScrollText,
  IconStar,
  IconStore,
  IconUsers,
  IconWrench,
} from '@/components/icon';


export const TABS: ReadonlyArray<{ id: Tab; labelAr: string; Icon: typeof IconDashboard }> = [
  { id: 'metrics', labelAr: 'الرئيسية', Icon: IconDashboard },
  { id: 'users', labelAr: 'المستخدمون', Icon: IconUsers },
  { id: 'technicians', labelAr: 'الفنيون', Icon: IconWrench },
  { id: 'merchants', labelAr: 'التجار', Icon: IconStore },
  { id: 'requests', labelAr: 'الطلبات', Icon: IconClipboard },
  { id: 'reviews', labelAr: 'التقييمات', Icon: IconStar },
  { id: 'payments', labelAr: 'المدفوعات', Icon: IconCreditCard },
  { id: 'grants', labelAr: 'المنح', Icon: IconGift },
  { id: 'notify', labelAr: 'إشعارات', Icon: IconBell },
  { id: 'audit', labelAr: 'سجل التدقيق', Icon: IconScrollText },
];

/**
 * WP-Admin-01: tab visibility mirrors the server permission matrix
 * (docs/09_ADMIN.md §19). This is presentation-only convenience — the
 * API enforces authorization itself: 401 only when unauthenticated,
 * 403 when authenticated but not permitted, regardless of what the
 * UI shows.
 */
export const TAB_ROLES: Record<Tab, ReadonlyArray<string>> = {
  metrics: ['super_admin', 'operations_admin', 'content_admin', 'support_admin'],
  users: ['super_admin', 'operations_admin', 'support_admin'],
  technicians: ['super_admin', 'operations_admin', 'support_admin'],
  merchants: ['super_admin', 'operations_admin', 'support_admin'],
  requests: ['super_admin', 'operations_admin', 'support_admin'],
  reviews: ['super_admin', 'operations_admin', 'content_admin', 'support_admin'],
  payments: ['super_admin', 'operations_admin', 'support_admin'],
  grants: ['super_admin'],
  notify: ['super_admin', 'operations_admin', 'support_admin'],
  audit: ['super_admin', 'operations_admin'],
};

/**
 * WP-Admin-06: presentation-only capability matrix for row actions —
 * mirrors the server @AdminRoles decorators one-to-one (payments
 * approve/reject = super only, proof preview = super+operations,
 * review removal = super+content only, verification and request
 * ops = super+operations). The REST layer still enforces 403; this
 * only hides controls a role can never use.
 */
export const ACTIONS_ROLES: Record<
  'verification' | 'paymentDecision' | 'proofPreview' | 'reviewRemoval',
  ReadonlyArray<string>
> = {
  verification: ['super_admin', 'operations_admin'],
  paymentDecision: ['super_admin'],
  proofPreview: ['super_admin', 'operations_admin'],
  reviewRemoval: ['super_admin', 'content_admin'],
};

export const TAB_CONTEXT: Record<Tab, string> = {
  metrics: 'نظرة شاملة على المنصة وأولويات العمل',
  users: 'حسابات المنصة وبيانات التواصل وحالة الوصول',
  technicians: 'راجع هوية الفني وحالة توثيقه قبل اتخاذ القرار',
  merchants: 'مساحة مراجعة التجار وإدارة حالات التوثيق',
  requests: 'تابع سير الطلبات بين العميل والفني، وتدخّل يدويًا عند الحاجة فقط',
  reviews: 'مراجعة تقييمات الخدمة والحفاظ على جودة المحتوى',
  payments: 'راجع التحويل وإثبات الدفع قبل قبول الاشتراك',
  grants: 'إدارة الاشتراكات والمزايا الممنوحة يدويًا',
  notify: 'تواصل تشغيلي مباشر مع مستخدم محدد',
  audit: 'تتبّع إجراءات الإدارة والحساب المنفّذ والسجل المستهدف',
};

// Action-bearing tabs render three columns; view-only tabs (metrics,
// grants, notify, audit) render two — no empty header cells (WP-Admin-06).
export const COLUMNS: Record<Tab, string[]> = {
  metrics: ['المعرف', 'الملخص'],
  users: ['المعرف', 'المستخدم', 'الحالة والإجراءات'],
  technicians: ['المعرف', 'الفني', 'التوثيق'],
  merchants: ['المعرف', 'التاجر', 'التوثيق'],
  requests: ['المعرف', 'الطلب', 'الإجراءات'],
  reviews: ['المعرف', 'التقييم', 'الإجراءات'],
  payments: ['المعرف', 'الدفع', 'الإجراءات'],
  grants: ['المعرف', 'الملخص'],
  notify: ['المعرف', 'الملخص'],
  audit: ['المعرف', 'الحدث'],
};

export const ROLE_AR: Readonly<Record<string, string>> = {
  customer: 'عميل',
  technician: 'فني',
  merchant: 'تاجر',
};

/** Admin role labels (WP-Admin-01): shown in the topbar, never trusted for auth. */
export const ADMIN_ROLE_AR: Readonly<Record<string, string>> = {
  super_admin: 'مدير عام',
  operations_admin: 'مدير العمليات',
  content_admin: 'مدير المحتوى',
  support_admin: 'مدير الدعم',
  finance_admin: 'المدير المالي',
};

export const STATUS_AR: Readonly<Record<string, string>> = {
  pending: 'بانتظار',
  accepted: 'مقبول',
  on_the_way: 'في الطريق',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  active: 'نشط',
  suspended: 'موقوف',
  verified: 'موثق',
  rejected: 'مرفوض',
  approved: 'مقبول',
  rejected_payment: 'مرفوض',
  deleted: 'محذوف',
};

/** The only documented ADMIN-operational type: mandatory, never suppressed. */
export const OPERATIONAL_NOTIFICATION_TYPE = 'general';

export const NOTIFY_TEMPLATES: ReadonlyArray<{
  labelAr: string;
  titleAr: string;
  bodyAr: string;
}> = [
  {
    labelAr: 'صيانة مجدولة',
    titleAr: 'صيانة مجدولة',
    bodyAr: 'سنقوم بأعمال صيانة مجدولة قد تؤثر مؤقتًا على الخدمة. نعتذر عن أي إزعاج.',
  },
  {
    labelAr: 'تحديث مهم',
    titleAr: 'تحديث مهم',
    bodyAr: 'نعمل على تحسين الخدمة. قد تلاحظ تغييرات بسيطة خلال الفترة القادمة.',
  },
  {
    labelAr: 'متابعة طلبك',
    titleAr: 'متابعة طلبك',
    bodyAr: 'نود إعلامك بأن فريق الدعم يتابع طلبك حاليًا وسيتواصل معك عند الحاجة.',
  },
];
