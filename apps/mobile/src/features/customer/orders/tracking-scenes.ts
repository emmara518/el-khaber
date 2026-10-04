import type { CustomerRequestStatus } from '../requests/customer-requests-types';
import type { SceneAssetName } from '@/ui/scene-assets';

export const TRACKING_SCENES: Record<CustomerRequestStatus, { asset: SceneAssetName; title: string; body: string }> = {
  pending: { asset: 'service_request_confirmation', title: 'بانتظار القبول', body: 'طلبك مسجل وبانتظار القبول. لم يتم تأكيد الزيارة بعد.' },
  accepted: { asset: 'tracking_success', title: 'قبل الفني طلبك', body: 'قبل الفني الطلب. يمكنك التواصل معه لتنسيق تفاصيل الزيارة.' },
  on_the_way: { asset: 'tracking_on_the_way', title: 'الفني في الطريق', body: 'حدّث الفني حالة الطلب إلى «في الطريق». لا يتوفر تتبع مباشر للموقع أو وقت وصول تقديري.' },
  in_progress: { asset: 'tracking_in_progress', title: 'الخدمة قيد التنفيذ', body: 'الخدمة قيد التنفيذ وفق آخر حالة مسجلة للطلب.' },
  completed: { asset: 'tracking_completed', title: 'اكتملت الخدمة', body: 'تم تسجيل اكتمال الخدمة. شارك تقييم تجربتك مع الفني.' },
  cancelled: { asset: 'service_request_service', title: 'طلب ملغى', body: 'هذا الطلب ملغى. المحادثة والتقييم غير متاحين لهذا الطلب.' },
};

export function canChatWithOrder(status: CustomerRequestStatus, technicianId: string | null): boolean {
  return technicianId !== null && status !== 'completed' && status !== 'cancelled';
}

export function canRateOrder(status: CustomerRequestStatus, technicianId: string | null): boolean {
  return technicianId !== null && status === 'completed';
}
