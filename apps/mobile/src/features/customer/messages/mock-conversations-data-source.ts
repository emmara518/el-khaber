/**
 * Mock `ConversationsDataSource` (Batch A).
 *
 * Identities match the Home + Requests fixtures (محمد العتيبي /
 * order-001) so threads read as continuations of real orders.
 */

import {
  type ConversationsDataSource,
  type ConversationsViewModel,
} from './conversations-types';

const CONVERSATIONS_FIXTURE: ConversationsViewModel = {
  conversations: [
    {
      id: 'conv-001',
      technicianNameAr: 'محمد العتيبي',
      initialsAr: 'م',
      specialtyAr: 'غسالات',
      lastMessageAr: 'تم تغيير القطعة، الغسالة تعمل الآن بشكل طبيعي',
      timeAr: '٢:٣٠ م',
      unreadCount: 2,
      orderRefAr: 'طلب رقم SR-2024-1258',
      online: true,
    },
    {
      id: 'conv-002',
      technicianNameAr: 'سامي محيور',
      initialsAr: 'س',
      specialtyAr: 'تكييفات',
      lastMessageAr: 'سأصل خلال نصف ساعة تقريبًا',
      timeAr: '١:١٥ م',
      unreadCount: 0,
      orderRefAr: 'صيانة مكيف سبليت',
      online: true,
    },
    {
      id: 'conv-003',
      technicianNameAr: 'أحمد الجريسي',
      initialsAr: 'أ',
      specialtyAr: 'غسالات',
      lastMessageAr: 'شكرًا لك، تم إغلاق الطلب بنجاح',
      timeAr: 'أمس',
      unreadCount: 0,
      orderRefAr: 'تنظيف فلتر الغسالة',
      online: false,
    },
  ],
};

export class MockConversationsDataSource implements ConversationsDataSource {
  async getConversations(_input: { role: 'customer' }): Promise<ConversationsViewModel> {
    return JSON.parse(JSON.stringify(CONVERSATIONS_FIXTURE)) as ConversationsViewModel;
  }
}
