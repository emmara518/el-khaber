/**
 * Mock `CustomerRequestsDataSource` (Batch A).
 *
 * Fixtures reuse the identities already established by the Home mock
 * (order-001, محمد العتيبي) so the app reads as one coherent product.
 * Lifecycle states follow docs/07_API.md §22. Replaced by a real API
 * adapter without touching the presenter.
 */

import {
  type CustomerRequestsDataSource,
  type CustomerRequestsViewModel,
} from './customer-requests-types';

const REQUESTS_FIXTURE: CustomerRequestsViewModel = {
  requests: [
    {
      id: 'order-001',
      applianceAr: 'غسالة',
      taskAr: 'تصليح غسالة سامسونج',
      brandAndModel: 'Samsung SR-2024-1258',
      technicianNameAr: 'الفني: محمد العتيبي',
      technicianInitialsAr: 'م',
      status: 'in_progress',
      statusLabelAr: 'قيد التنفيذ',
      scheduledLabelAr: 'اليوم ٢:٠٠ م',
    },
    {
      id: 'order-002',
      applianceAr: 'مكيف',
      taskAr: 'صيانة مكيف سبليت',
      brandAndModel: 'LG DualCool',
      technicianNameAr: 'الفني: سامي محيور',
      technicianInitialsAr: 'س',
      status: 'on_the_way',
      statusLabelAr: 'الفني في الطريق',
      scheduledLabelAr: 'اليوم ٤:٣٠ م',
    },
    {
      id: 'order-003',
      applianceAr: 'ثلاجة',
      taskAr: 'فحص تبريد الثلاجة',
      brandAndModel: 'Hitachi R-BG410',
      technicianNameAr: 'بانتظار تعيين فني',
      technicianInitialsAr: '؟',
      status: 'pending',
      statusLabelAr: 'قيد الانتظار',
      scheduledLabelAr: 'غدًا ١٠:٠٠ ص',
    },
    {
      id: 'order-004',
      applianceAr: 'غسالة',
      taskAr: 'تنظيف فلتر الغسالة',
      brandAndModel: 'Samsung WW90',
      technicianNameAr: 'الفني: أحمد الجريسي',
      technicianInitialsAr: 'أ',
      status: 'completed',
      statusLabelAr: 'مكتمل',
      scheduledLabelAr: '٢٠ أغسطس',
    },
    {
      id: 'order-005',
      applianceAr: 'مكيف',
      taskAr: 'تعبئة فريون',
      brandAndModel: 'Gree Lomo',
      technicianNameAr: 'الفني: فهد السبيعي',
      technicianInitialsAr: 'ف',
      status: 'cancelled',
      statusLabelAr: 'ملغي',
      scheduledLabelAr: '١٥ أغسطس',
    },
  ],
};

export class MockCustomerRequestsDataSource implements CustomerRequestsDataSource {
  async getRequests(_input: { role: 'customer' }): Promise<CustomerRequestsViewModel> {
    return JSON.parse(JSON.stringify(REQUESTS_FIXTURE)) as CustomerRequestsViewModel;
  }
}
