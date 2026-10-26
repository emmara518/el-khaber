import { color, spacing } from '@khabir/ui-tokens';


import { ACTIONS_ROLES, STATUS_AR } from '../../constants';
import { roleCan, statusLabel } from '../../helpers';

import { AssignControl } from './assign-control';
import { PaymentDecisionActions } from './payment-decision-actions';
import { ReviewActions } from './review-actions';
import { VerificationActions } from './verification-actions';

import type { OnAction, Row, Tab } from '../../types';

import { GhostBtn, HintText, StatusBadge } from '@/components/ui';

export function Actions({
  tab,
  row,
  role,
  onAction,
  onDetail,
  onUserDetail,
}: {
  tab: Tab;
  row: Row;
  /** WP-Admin-01/06: signed-in admin role — hides mutations the server would reject. */
  role: string;
  onAction: OnAction;
  onDetail: (id: string) => void;
  onUserDetail: (id: string) => void;
}) {
  const canVerify = roleCan(role, ACTIONS_ROLES.verification);
  const canDecidePayment = roleCan(role, ACTIONS_ROLES.paymentDecision);
  if (tab === 'users') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
        <StatusBadge label={statusLabel(row.status)} />
        <GhostBtn onClick={() => onUserDetail(String(row.id))}>تفاصيل</GhostBtn>
      </div>
    );
  }
  if (tab === 'technicians' || tab === 'merchants') {
    if (!canVerify) {
      return <StatusBadge label={statusLabel(row.verificationStatus)} />;
    }
    const kind = tab === 'technicians' ? 'technicians' : 'merchants';
    return <VerificationActions row={row} kind={kind} onAction={onAction} />;
  }
  if (tab === 'reviews') {
    if (!roleCan(role, ACTIONS_ROLES.reviewRemoval)) {
      // roles without review-removal permission see the review state only;
      // the server would 403 their removal attempt anyway.
      return <span style={{ color: color.text.secondary }}>—</span>;
    }
    return <ReviewActions row={row} onAction={onAction} />;
  }
  if (tab === 'requests') {
    const current = String(row.status);
    return (
      <details>
        <summary
          style={{ cursor: 'pointer', color: color.text.secondary, fontSize: 12.5, padding: '4px 0' }}
        >
          تدخل إداري استثنائي
        </summary>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing[2],
            marginTop: spacing[2],
            minWidth: 220,
          }}
        >
          <HintText>
            المسار الطبيعي: يقبل الفني الطلب من تطبيقه ويتواصل مع العميل. استخدم هذه الإجراءات عند
            الحاجة فقط.
          </HintText>
          <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
            {(['in_progress', 'completed', 'cancelled'] as const).map((s) =>
              canVerify ? (
                <GhostBtn
                  key={s}
                  disabled={current === s}
                  danger={s === 'cancelled'}
                  onClick={() =>
                    onAction(
                      `/admin/service-requests/${String(row.id)}/status`,
                      { status: s },
                      `حالة الطلب: ${STATUS_AR[s]}`,
                      'تأكيد تغيير حالة الطلب؟',
                    )
                  }
                >
                  {STATUS_AR[s]}
                </GhostBtn>
              ) : null,
            )}
          </div>
          {canVerify && current === 'pending' ? (
            <AssignControl requestId={String(row.id)} onAction={onAction} />
          ) : null}
        </div>
      </details>
    );
  }
  if (tab === 'payments') {
    const status = String(row.status);
    const decided = status === 'approved' || status === 'rejected';
    return (
      <div style={{ display: 'flex', gap: spacing[2] }}>
        <GhostBtn onClick={() => onDetail(String(row.id))}>تفاصيل</GhostBtn>
        {canDecidePayment ? (
          <PaymentDecisionActions row={row} decided={decided} onAction={onAction} />
        ) : null}
      </div>
    );
  }
  return <span style={{ color: color.text.secondary }}>—</span>;
}
