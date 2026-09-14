/**
 * Mock `TechnicianRequestsDataSource` (T-C).
 *
 * Deterministic session state held on the instance (no globals):
 * seeded fixtures, `acceptRequest`/`rejectRequest` validate the
 * documented policy then transition. `takenElsewhere` simulates a
 * concurrent actor — actions on those ids throw STALE even when
 * the status would allow them. `failing` mode throws on every
 * mutation for the generic error path. No persistence claimed.
 */

import { decideRequestAction, nextServiceStatus, type TechnicianRequestAction } from './request-policy';
import {
  TECHNICIAN_STATUS_LABELS,
  type CustomerRequestStatus,
  type TechnicianRequest,
} from './technician-request-types';

export type RequestActionErrorCode = 'STALE' | 'INVALID' | 'NOT_FOUND' | 'FAILED';

export class RequestActionError extends Error {
  public readonly code: RequestActionErrorCode;
  public readonly reason: 'invalid_transition' | 'terminal' | null;

  constructor(code: RequestActionErrorCode, message?: string) {
    super(message ?? 'تعذر تحديث الطلب');
    this.name = 'RequestActionError';
    this.code = code;
    this.reason = code === 'INVALID' ? (message ? 'terminal' : 'invalid_transition') : null;
  }
}

export interface TechnicianRequestsDataSource {
  getRequests(input: { role: 'technician' }): Promise<ReadonlyArray<TechnicianRequest>>;
  acceptRequest(input: { role: 'technician'; requestId: string }): Promise<TechnicianRequest>;
  rejectRequest(input: { role: 'technician'; requestId: string }): Promise<TechnicianRequest>;
  /** Forward progression: accepted → on_the_way → in_progress → completed (T-D). */
  advanceStatus(input: { role: 'technician'; requestId: string }): Promise<TechnicianRequest>;
}

interface SeedRow extends Omit<TechnicianRequest, 'statusLabelAr'> {
  status: CustomerRequestStatus;
}

const SEED: ReadonlyArray<SeedRow> = [
  {
    id: 'tin-001',
    customerNameAr: 'أم نورة',
    applianceAr: 'مكيف',
    problemAr: 'صيانة مكيف سبليت',
    descriptionAr: 'المكيف يبرد بشكل ضعيف منذ يومين مع صوت مزعج عند التشغيل.',
    locationAr: 'الرياض – حي العليا',
    timeAr: 'اليوم ٥:٠٠ م',
    createdAr: 'اليوم ٩:١٥ ص',
    appointmentAr: 'اليوم ٥:٠٠ م',
    status: 'pending',
  },
  {
    id: 'tin-002',
    customerNameAr: 'أبو فهد',
    applianceAr: 'مكيف',
    problemAr: 'تنقيط مياه من الوحدة الداخلية',
    descriptionAr: 'تنقيط مستمر منذ أمس مع ضعف في التبريد.',
    locationAr: 'الرياض – حي الملز',
    timeAr: 'غدًا ٩:٠٠ ص',
    createdAr: 'اليوم ١٠:٠٥ ص',
    appointmentAr: 'غدًا ٩:٠٠ ص',
    status: 'pending',
  },
  {
    id: 'tin-003',
    customerNameAr: 'أبو خالد',
    applianceAr: 'مكيف',
    problemAr: 'تنظيف فلاتر',
    descriptionAr: 'صيانة دورية وتنظيف شامل للوحدة الداخلية.',
    locationAr: 'الرياض – حي النزهة',
    timeAr: 'اليوم ٧:٠٠ م',
    createdAr: 'أمس ٤:٠٠ م',
    appointmentAr: 'اليوم ٧:٠٠ م',
    status: 'accepted',
  },
  {
    id: 'tin-004',
    customerNameAr: 'أم سارة',
    applianceAr: 'ثلاجة',
    problemAr: 'ضعف التبريد',
    descriptionAr: 'التبريد ضعيف في الجزء السفلي منذ ثلاثة أيام.',
    locationAr: 'الرياض – حي العليا',
    timeAr: 'اليوم ٢:٠٠ م',
    createdAr: 'اليوم ٨:٣٠ ص',
    appointmentAr: null,
    status: 'on_the_way',
  },
  {
    id: 'tin-005',
    customerNameAr: 'أبو تركي',
    applianceAr: 'مكيف',
    problemAr: 'صيانة مكيف سبليت',
    descriptionAr: 'فحص شامل وإعادة تعبئة عند الحاجة.',
    locationAr: 'الرياض – حي الملز',
    timeAr: 'اليوم ١:٠٠ م',
    createdAr: 'أمس ٦:٠٠ م',
    appointmentAr: 'اليوم ١:٠٠ م',
    status: 'in_progress',
  },
  {
    id: 'tin-006',
    customerNameAr: 'أم ليان',
    applianceAr: 'غسالة',
    problemAr: 'اهتزاز قوي أثناء العصر',
    descriptionAr: 'تم الفحص والإصلاح واستبدال مساعدات.',
    locationAr: 'الرياض – حي الشفا',
    timeAr: 'أمس ١١:٠٠ ص',
    createdAr: 'أمس ٩:٠٠ ص',
    appointmentAr: 'أمس ١١:٠٠ ص',
    status: 'completed',
  },
  {
    id: 'tin-007',
    customerNameAr: 'أبو راكان',
    applianceAr: 'ثلاجة',
    problemAr: 'صوت مرتفع',
    descriptionAr: 'ألغى العميل الطلب قبل الموعد.',
    locationAr: 'الرياض – حي النزهة',
    timeAr: 'أمس ٣:٠٠ م',
    createdAr: 'أمس ١٠:٠٠ ص',
    appointmentAr: null,
    status: 'cancelled',
  },
];

function withLabels(row: SeedRow): TechnicianRequest {
  return { ...row, statusLabelAr: TECHNICIAN_STATUS_LABELS[row.status] };
}

export interface MockTechnicianRequestsOptions {
  /** Ids concurrently taken elsewhere → STALE on any action. */
  takenElsewhere?: ReadonlyArray<string>;
  /** Every mutation throws FAILED (generic error path). */
  failing?: boolean;
}

export class MockTechnicianRequestsDataSource implements TechnicianRequestsDataSource {
  private readonly rows = new Map<string, TechnicianRequest>();
  private readonly taken: Set<string>;
  private readonly failing: boolean;

  constructor(options: MockTechnicianRequestsOptions = {}) {
    for (const row of SEED) this.rows.set(row.id, withLabels({ ...row }));
    this.taken = new Set(options.takenElsewhere ?? []);
    this.failing = options.failing ?? false;
  }

  async getRequests(_input: { role: 'technician' }): Promise<ReadonlyArray<TechnicianRequest>> {
    return JSON.parse(JSON.stringify([...this.rows.values()])) as ReadonlyArray<TechnicianRequest>;
  }

  async acceptRequest(input: { role: 'technician'; requestId: string }): Promise<TechnicianRequest> {
    return this.mutate(input.requestId, 'accept');
  }

  async rejectRequest(input: { role: 'technician'; requestId: string }): Promise<TechnicianRequest> {
    return this.mutate(input.requestId, 'reject');
  }

  async advanceStatus(input: { role: 'technician'; requestId: string }): Promise<TechnicianRequest> {
    return this.mutate(input.requestId, 'advance');
  }

  private async mutate(
    requestId: string,
    action: TechnicianRequestAction | 'advance',
  ): Promise<TechnicianRequest> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (this.failing) throw new RequestActionError('FAILED');
    const current = this.rows.get(requestId);
    if (!current) throw new RequestActionError('NOT_FOUND', 'الطلب غير موجود');
    if (this.taken.has(requestId)) throw new RequestActionError('STALE');
    const decision =
      action === 'advance' ? nextServiceStatus(current.status) : decideRequestAction(current.status, action);
    if (!decision.ok) {
      throw new RequestActionError(
        'INVALID',
        decision.reason === 'terminal' ? 'هذا الطلب مغلق ولا يقبل إجراءات جديدة.' : undefined,
      );
    }
    const updated: TechnicianRequest = {
      ...current,
      status: decision.next,
      statusLabelAr: TECHNICIAN_STATUS_LABELS[decision.next],
    };
    this.rows.set(requestId, updated);
    return JSON.parse(JSON.stringify(updated)) as TechnicianRequest;
  }
}

/**
 * Shared session instance: list / detail / active-service screens
 * must observe the SAME in-memory session state so transitions stay
 * consistent across navigation (T-D §19). Deterministic; the shipped
 * screens use the real API adapter instead, this mock remains the
 * deterministic fixture for the spec suite only.
 */
export const sharedTechnicianRequestsSource = new MockTechnicianRequestsDataSource();
