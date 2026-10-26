import { spacing } from '@khabir/ui-tokens';
import { useState } from 'react';

import { formInput, formLabel } from '../../styles';

import type { OnAction, Row } from '../../types';

import { GhostBtn, HintText } from '@/components/ui';

/**
 * AUD-005: manual-payment decision controls. Approval stays a one-tap
 * confirm (note optional, not required by the server). Rejection requires
 * an inline Arabic reason (server 400 otherwise) that is audited and
 * sent to the user — mirrors VerificationActions (WP-Admin-02).
 */
export function PaymentDecisionActions({
  row,
  decided,
  onAction,
}: {
  row: Row;
  decided: boolean;
  onAction: OnAction;
}) {
  const [reason, setReason] = useState('');
  const [armed, setArmed] = useState(false);
  const reasonShort = reason.trim().length < 4;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
      <div style={{ display: 'flex', gap: spacing[2] }}>
        <GhostBtn
          disabled={decided}
          onClick={() =>
            onAction(
              `/admin/payments/submissions/${String(row.id)}/approve`,
              undefined,
              'تم قبول الدفع وتفعيل الاشتراك',
              'سيؤدي القبول إلى تفعيل اشتراك المستخدم. متابعة؟',
            )
          }
        >
          قبول
        </GhostBtn>
        <GhostBtn
          danger
          disabled={decided}
          onClick={() => {
            setReason('');
            setArmed(!armed);
          }}
        >
          رفض
        </GhostBtn>
      </div>
      {armed && !decided ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
          <label style={formLabel} htmlFor={`pay-reason-${String(row.id)}`}>
            سبب الرفض (إلزامي، يُحفظ في السجل ويُرسل للمستخدم)
          </label>
          <input
            id={`pay-reason-${String(row.id)}`}
            style={formInput}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="مثال: الإيصال لا يتطابق مع المبلغ"
            maxLength={500}
          />
          {reasonShort ? <HintText>السبب مطلوب (٤ أحرف على الأقل).</HintText> : null}
          <GhostBtn
            danger
            disabled={reasonShort}
            onClick={() =>
              onAction(
                `/admin/payments/submissions/${String(row.id)}/reject`,
                { reason: reason.trim() },
                'تم رفض إثبات الدفع',
                'سيتم رفض إثبات الدفع مع إرسال السبب للمستخدم. متابعة؟',
              )
            }
          >
            تأكيد الرفض مع السبب
          </GhostBtn>
        </div>
      ) : null}
    </div>
  );
}
