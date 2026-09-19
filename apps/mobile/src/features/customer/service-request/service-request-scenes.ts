import type { ServiceRequestStep } from './service-request-types';
import type { SceneAssetName } from '@/ui/scene-assets';

export const REQUEST_GROUPS = [
  { title: 'الجهاز والعطل', steps: ['appliance', 'problem', 'description', 'photos'] },
  { title: 'ترتيب الزيارة', steps: ['location', 'appointment'] },
  { title: 'التأكيد', steps: ['review'] },
] as const;

export const REQUEST_SCENES: Record<ServiceRequestStep, { title: string; body: string; asset: SceneAssetName }> = {
  appliance: { title: 'أي جهاز يحتاج العناية؟', body: 'ابدأ بالجهاز، ثم أخبر الفني بما لاحظته.', asset: 'service_request_service' },
  problem: { title: 'ما الذي لا يعمل؟', body: 'اختر العطل الأقرب أو صف مشكلة أخرى.', asset: 'service_request_service' },
  description: { title: 'التفاصيل تصنع فرقًا', body: 'متى بدأت المشكلة؟ وما الذي يحدث عند التشغيل؟ الوصف اختياري.', asset: 'service_request_service' },
  photos: { title: 'الصور والمرفقات', body: 'هذه الخطوة اختيارية. رفع الصور غير متاح حاليًا؛ يمكنك المتابعة دون مرفقات.', asset: 'service_request_service' },
  location: { title: 'أين نقدم الخدمة؟', body: 'اختر عنوانًا محفوظًا أو أضف موقع الخدمة هنا.', asset: 'service_request_service' },
  appointment: { title: 'لنرتب الزيارة', body: 'لا تتوفر مواعيد للحجز داخل التطبيق حاليًا. يُنسّق الموعد هاتفيًا مع الفني.', asset: 'technician_availability' },
  review: { title: 'كل التفاصيل، قبل الإرسال', body: 'راجع الجهاز والعطل والعنوان. لن يُرسل الطلب إلا عند تأكيدك.', asset: 'service_request_confirmation' },
};

export function requestGroupIndex(step: ServiceRequestStep): number {
  return REQUEST_GROUPS.findIndex((group) => (group.steps as readonly string[]).includes(step));
}
