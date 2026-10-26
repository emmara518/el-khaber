import { color, spacing } from '@khabir/ui-tokens';


import { ACTIONS_ROLES, STATUS_AR } from '../constants';
import { roleCan } from '../helpers';

import { ProofPreviewButton } from './actions/proof-preview-button';
import { DetailLabel, DetailValue } from './detail';

import type { DetailStatus } from '../types';

import { HintText, Panel, SectionTitle, StatusBadge } from '@/components/ui';

export function PaymentDetailPanel({
  detailStatus,
  paymentDetail,
  adminRole,
}: {
  detailStatus: DetailStatus;
  paymentDetail: Record<string, unknown> | null;
  adminRole: string;
}) {
  return (
    <Panel style={{ marginTop: spacing[3] }}>
      <SectionTitle>تفاصيل الدفع المحدد</SectionTitle>
      {detailStatus === 'loading' ? (
        <div style={{ display: 'grid', gap: spacing[2] }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ width: '60%' }} />
          ))}
        </div>
      ) : null}
      {detailStatus === 'error' ? (
        <div role="alert" style={{ color: color.error.DEFAULT, fontSize: 13 }}>
          تعذر تحميل تفاصيل الدفع
        </div>
      ) : null}
      {paymentDetail !== null ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(120px, auto) 1fr',
            gap: `8px ${spacing[4]}`,
            fontSize: 13.5,
          }}
        >
          <DetailLabel>المعرف</DetailLabel>
          <DetailValue mono>{String(paymentDetail.id)}</DetailValue>
          <DetailLabel>المستخدم</DetailLabel>
          <DetailValue mono>{String(paymentDetail.userId)}</DetailValue>
          <DetailLabel>الخطة</DetailLabel>
          <DetailValue mono>{String(paymentDetail.planId)}</DetailValue>
          <DetailLabel>الطريقة</DetailLabel>
          <DetailValue>
            <StatusBadge label={String(paymentDetail.method)} />
          </DetailValue>
          <DetailLabel>الحالة</DetailLabel>
          <DetailValue>
            <StatusBadge
              label={STATUS_AR[String(paymentDetail.status)] ?? String(paymentDetail.status)}
            />
          </DetailValue>
          <DetailLabel>مرجع التحويل</DetailLabel>
          <DetailValue mono>{String(paymentDetail.transferReference)}</DetailValue>
          <DetailLabel>إثبات الدفع</DetailLabel>
          <DetailValue>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
              <span style={{ color: color.text.secondary }}>
                {String(paymentDetail.proofStorageKey ?? '—')}
              </span>
              {paymentDetail.proofStorageKey != null &&
              String(paymentDetail.proofStorageKey).length > 0 ? (
                roleCan(adminRole, ACTIONS_ROLES.proofPreview) ? (
                  <ProofPreviewButton submissionId={String(paymentDetail.id)} />
                ) : (
                  <HintText>معاينة الإثبات متاحة لمدير عام أو مدير العمليات فقط.</HintText>
                )
              ) : null}
            </div>
          </DetailValue>
          <DetailLabel>الاشتراك</DetailLabel>
          <DetailValue mono>{String(paymentDetail.subscriptionId ?? '—')}</DetailValue>
        </div>
      ) : detailStatus === 'idle' ? (
        <HintText>اختر «تفاصيل» من أي صف لعرض بيانات الدفع قبل المراجعة.</HintText>
      ) : null}
    </Panel>
  );
}
