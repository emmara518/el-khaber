import { color, spacing } from '@khabir/ui-tokens';


import { ROLE_AR, STATUS_AR } from '../constants';
import { formatDateAr, statusLabel } from '../helpers';

import { DetailLabel, DetailValue } from './detail';

import type { DetailStatus } from '../types';

import { GhostBtn, HintText, Panel, SectionTitle, StatusBadge } from '@/components/ui';

function text(value: unknown): string {
  return typeof value === 'string' && value.length > 0 ? value : '—';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/**
 * P3-9: read-only user inspection (GET /admin/users/:id). Gives the console
 * a monitoring surface (identity, profile, subscription, counts) instead of
 * forcing admins to read the raw list row.
 */
export function UserDetailPanel({
  detailStatus,
  userDetail,
  errorAr,
  onRetry,
}: {
  detailStatus: DetailStatus;
  userDetail: Record<string, unknown> | null;
  errorAr: string | null;
  onRetry: () => void;
}) {
  const user = userDetail !== null ? asRecord(userDetail.user) : null;
  const profile = userDetail !== null ? asRecord(userDetail.profile) : null;
  const technician = userDetail !== null ? asRecord(userDetail.technicianProfile) : null;
  const merchant = userDetail !== null ? asRecord(userDetail.merchantProfile) : null;
  const subscription = userDetail !== null ? asRecord(userDetail.subscription) : null;
  const plan = subscription !== null ? asRecord(subscription.plan) : null;
  const counts = userDetail !== null ? asRecord(userDetail.counts) : null;
  const displayName =
    [profile?.firstName, profile?.lastName].filter((part) => typeof part === 'string').join(' ') ||
    null;

  return (
    <Panel style={{ marginTop: spacing[3] }}>
      <SectionTitle>تفاصيل المستخدم</SectionTitle>
      {detailStatus === 'loading' ? (
        <div style={{ display: 'grid', gap: spacing[2] }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ width: i % 2 === 0 ? '45%' : '65%' }} />
          ))}
        </div>
      ) : null}
      {detailStatus === 'error' ? (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[3],
            padding: spacing[3],
            backgroundColor: color.error.soft,
            borderRadius: spacing[1],
            color: color.error.ink,
            fontSize: 13,
          }}
        >
          <span style={{ flex: 1 }}>{errorAr ?? 'تعذر تحميل تفاصيل المستخدم'}</span>
          <GhostBtn onClick={onRetry}>إعادة المحاولة</GhostBtn>
        </div>
      ) : null}
      {detailStatus === 'idle' && userDetail === null ? (
        <HintText>اختر «تفاصيل» من صف مستخدم لعرض الحساب والملف والاشتراك.</HintText>
      ) : null}
      {userDetail !== null && user !== null ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(120px, auto) 1fr',
            gap: `8px ${spacing[4]}`,
            fontSize: 13.5,
          }}
        >
          <DetailLabel>البريد الإلكتروني</DetailLabel>
          <DetailValue mono>{text(user.email)}</DetailValue>
          <DetailLabel>الجوال</DetailLabel>
          <DetailValue mono>{text(user.phone)}</DetailValue>
          <DetailLabel>الدور</DetailLabel>
          <DetailValue>
            <StatusBadge label={ROLE_AR[String(user.role)] ?? String(user.role)} />
          </DetailValue>
          <DetailLabel>الحالة</DetailLabel>
          <DetailValue>
            <StatusBadge label={statusLabel(user.status)} />
          </DetailValue>
          <DetailLabel>التحقق</DetailLabel>
          <DetailValue>
            بريد: {user.emailVerified === true ? 'مؤكد' : 'غير مؤكد'} · جوال:{' '}
            {user.phoneVerified === true ? 'مؤكد' : 'غير مؤكد'}
          </DetailValue>
          {displayName !== null ? (
            <>
              <DetailLabel>الاسم</DetailLabel>
              <DetailValue>{displayName}</DetailValue>
            </>
          ) : null}
          {technician !== null ? (
            <>
              <DetailLabel>ملف الفني</DetailLabel>
              <DetailValue>
                التوثيق:{' '}
                {STATUS_AR[String(technician.verificationStatus)] ??
                  String(technician.verificationStatus)}
                {' · '}التقييم: {String(technician.ratingAverage ?? '—')} (
                {String(technician.ratingCount ?? 0)})
                {' · '}خبرة: {String(technician.experienceYears ?? 0)} سنة
              </DetailValue>
            </>
          ) : null}
          {merchant !== null ? (
            <>
              <DetailLabel>ملف التاجر</DetailLabel>
              <DetailValue>
                {text(merchant.businessName)}
                {' · '}التوثيق:{' '}
                {STATUS_AR[String(merchant.verificationStatus)] ??
                  String(merchant.verificationStatus)}
              </DetailValue>
            </>
          ) : null}
          <DetailLabel>الاشتراك</DetailLabel>
          <DetailValue>
            {subscription !== null
              ? `${String(plan?.nameAr ?? plan?.code ?? 'اشتراك')} · ${statusLabel(
                  subscription.status,
                )}${
                  typeof subscription.currentPeriodEnd === 'string'
                    ? ` · حتى ${formatDateAr(subscription.currentPeriodEnd) ?? '—'}`
                    : ''
                }`
              : '—'}
          </DetailValue>
          <DetailLabel>طلبات الخدمة</DetailLabel>
          <DetailValue>{String(counts?.serviceRequests ?? 0)}</DetailValue>
          <DetailLabel>منتجات المتجر</DetailLabel>
          <DetailValue>{String(counts?.products ?? 0)}</DetailValue>
          <DetailLabel>تاريخ الإنشاء</DetailLabel>
          <DetailValue>{formatDateAr(user.createdAt) ?? '—'}</DetailValue>
          <DetailLabel>آخر دخول</DetailLabel>
          <DetailValue>{formatDateAr(user.lastLoginAt) ?? '—'}</DetailValue>
        </div>
      ) : null}
    </Panel>
  );
}
