/**
 * Mock `OrderDataSource` (Batch E).
 *
 * Same-identity fixtures as the Batch-A requests list (order-001…
 * order-005 keep their statuses, technicians, and labels) plus the
 * Batch-D fresh-submission id (`REQ-2026-0481` → pending). History
 * timestamps exist only where the fixture provides them; every
 * other step renders without a timestamp rather than an invented one.
 */

import {
  buildTimeline,
  type OrderDataSource,
  type OrderDetail,
} from './order-detail-types';

import type { CustomerRequestStatus } from '../requests/customer-requests-types';

interface FixtureRow {
  requestId: string;
  technicianId: string | null;
  technicianNameAr: string;
  technicianInitialsAr: string;
  applianceAr: string;
  taskAr: string;
  status: CustomerRequestStatus;
  statusLabelAr: string;
  locationAr: string;
  appointmentAr: string | null;
  timestamps: Partial<Record<string, string>>;
}

const ROWS: ReadonlyArray<FixtureRow> = [
  {
    requestId: 'order-001',
    technicianId: 'tech-1',
    technicianNameAr: 'محمد العتيبي',
    technicianInitialsAr: 'م',
    applianceAr: 'غسالة',
    taskAr: 'تصليح غسالة سامسونج',
    status: 'in_progress',
    statusLabelAr: 'قيد التنفيذ',
    locationAr: 'الرياض – حي النزهة',
    appointmentAr: 'اليوم ٢:٠٠ م',
    timestamps: { pending: 'اليوم ٩:٠٠ ص', accepted: 'اليوم ١٠:٣٠ ص', on_the_way: 'اليوم ١:٠٠ م' },
  },
  {
    requestId: 'order-002',
    technicianId: 'tech-2',
    technicianNameAr: 'سامي محيور',
    technicianInitialsAr: 'س',
    status: 'on_the_way',
    applianceAr: 'مكيف',
    taskAr: 'صيانة مكيف سبليت',
    statusLabelAr: 'الفني في الطريق',
    locationAr: 'الرياض – حي الملز',
    appointmentAr: 'اليوم ٤:٣٠ م',
    timestamps: { pending: 'اليوم ١١:٠٠ ص', accepted: 'اليوم ١٢:٠٠ م' },
  },
  {
    requestId: 'order-003',
    technicianId: null,
    technicianNameAr: 'بانتظار تعيين فني',
    technicianInitialsAr: '؟',
    applianceAr: 'ثلاجة',
    taskAr: 'فحص تبريد الثلاجة',
    status: 'pending',
    statusLabelAr: 'قيد الانتظار',
    locationAr: 'الرياض – حي النزهة',
    appointmentAr: 'غدًا ١٠:٠٠ ص',
    timestamps: {},
  },
  {
    requestId: 'order-004',
    technicianId: 'tech-3',
    technicianNameAr: 'أحمد الجريسي',
    technicianInitialsAr: 'أ',
    applianceAr: 'غسالة',
    taskAr: 'تنظيف فلتر الغسالة',
    status: 'completed',
    statusLabelAr: 'مكتمل',
    locationAr: 'الرياض – حي النزهة',
    appointmentAr: '٢٠ أغسطس',
    timestamps: {
      pending: '٢٠ أغسطس ٩:٠٠ ص',
      accepted: '٢٠ أغسطس ٩:٣٠ ص',
      on_the_way: '٢٠ أغسطس ١١:٠٠ ص',
      in_progress: '٢٠ أغسطس ١١:٣٠ ص',
      completed: '٢٠ أغسطس ١٢:١٥ م',
    },
  },
  {
    requestId: 'order-005',
    technicianId: 'tech-4',
    technicianNameAr: 'فهد السبيعي',
    technicianInitialsAr: 'ف',
    applianceAr: 'مكيف',
    taskAr: 'تعبئة فريون',
    status: 'cancelled',
    statusLabelAr: 'ملغي',
    locationAr: 'الرياض – حي الشفا',
    appointmentAr: '١٥ أغسطس',
    timestamps: { pending: '١٥ أغسطس ١٠:٠٠ ص' },
  },
  {
    requestId: 'REQ-2026-0481',
    technicianId: 'tech-2',
    technicianNameAr: 'سامي محيور',
    technicianInitialsAr: 'س',
    applianceAr: 'مكيف',
    taskAr: 'طلب صيانة جديد',
    status: 'pending',
    statusLabelAr: 'قيد الانتظار',
    locationAr: 'الرياض – حي النزهة',
    appointmentAr: null,
    timestamps: {},
  },
];

export class MockOrderDataSource implements OrderDataSource {
  async getOrderDetail(input: { role: 'customer'; requestId: string }): Promise<OrderDetail | null> {
    void input.role;
    const row = ROWS.find((r) => r.requestId === input.requestId) ?? null;
    if (row === null) return null;
    const detail: OrderDetail = {
      requestId: row.requestId,
      technicianId: row.technicianId,
      technicianNameAr: row.technicianNameAr,
      technicianInitialsAr: row.technicianInitialsAr,
      applianceAr: row.applianceAr,
      taskAr: row.taskAr,
      status: row.status,
      statusLabelAr: row.statusLabelAr,
      locationAr: row.locationAr,
      appointmentAr: row.appointmentAr,
      timeline: buildTimeline(row.status, row.timestamps),
    };
    return JSON.parse(JSON.stringify(detail)) as OrderDetail;
  }
}
