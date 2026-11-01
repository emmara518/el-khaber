import { spacing } from '@khabir/ui-tokens';
import { useState } from 'react';

import { STATUS_AR } from '../../constants';
import { formInput, formLabel } from '../../styles';

import type { OnAction, Row } from '../../types';

import { GhostBtn, HintText } from '@/components/ui';

/**
 * Account status action (Lane B contract):
 * POST /admin/users/:id/status { status, reason? }
 * A suspension requires a reason; reactivation does not.
 */
export function UserStatusActions({
  row,
  onAction,
}: {
  row: Row;
  onAction: OnAction;
}) {
  const [armed, setArmed] = useState(false);
  const [reason, setReason] = useState('');
  const current = String(row.status ?? '');
  const reasonShort = reason.trim().length < 4;

  if (current === 'deleted') {
    return <HintText>الحساب محذوف ولا يمكن تغيير حالته.</HintText>;
  }

  if (current === 'suspended') {
    return (
      <GhostBtn
        onClick={() =>
          onAction(
            `/admin/users/${String(row.id)}/status`,
            { status: 'active' },
            'تم تفعيل الحساب',
            'تأكيد إعادة تفعيل هذا الحساب؟',
          )
        }
      >
        إعادة تفعيل
      </GhostBtn>
    );
  }

  if (!armed) {
    return (
      <GhostBtn danger onClick={() => setArmed(true)}>
        إيقاف الحساب
      </GhostBtn>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
      <label style={formLabel} htmlFor={`user-status-reason-${String(row.id)}`}>
        سبب الإيقاف (4-500 حرف، يُحفظ في سجل التدقيق)
      </label>
      <input
        id={`user-status-reason-${String(row.id)}`}
        style={formInput}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="مثال: مراجعة امتثال أو تحقيق"
        maxLength={500}
      />
      {reasonShort ? <HintText>السبب مطلوب (4 أحرف على الأقل).</HintText> : null}
      <div style={{ display: 'flex', gap: spacing[2] }}>
        <GhostBtn
          danger
          disabled={reasonShort}
          onClick={() =>
            onAction(
              `/admin/users/${String(row.id)}/status`,
              { status: 'suspended', reason: reason.trim() },
              `تم إيقاف الحساب: ${STATUS_AR.suspended ?? 'موقوف'}`,
              'تأكيد إيقاف هذا الحساب؟ سيتم رفض جلساته الحالية.',
            )
          }
        >
          تأكيد الإيقاف
        </GhostBtn>
        <GhostBtn onClick={() => { setArmed(false); setReason(''); }}>
          تراجع
        </GhostBtn>
      </div>
    </div>
  );
}
