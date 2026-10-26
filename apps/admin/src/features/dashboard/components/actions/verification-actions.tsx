import { spacing } from '@khabir/ui-tokens';
import { useState } from 'react';

import { STATUS_AR } from '../../constants';
import { formInput, formLabel } from '../../styles';

import type { OnAction, Row } from '../../types';

import { GhostBtn, HintText } from '@/components/ui';

/**
 * WP-Admin-02: verification buttons with an inline review-reason field.
 * The reason is REQUIRED for rejected/suspended (server 400 otherwise),
 * audited, and notified to the user. Approve sends no reason.
 */
export function VerificationActions({
  row,
  kind,
  onAction,
}: {
  row: Row;
  kind: 'technicians' | 'merchants';
  onAction: OnAction;
}) {
  const [reason, setReason] = useState('');
  const [armed, setArmed] = useState<'rejected' | 'suspended' | null>(null);
  const current = String(row.verificationStatus ?? row.status ?? '');
  const reasonShort = reason.trim().length < 4;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
      <div style={{ display: 'flex', gap: spacing[2] }}>
        {(['verified', 'rejected', 'suspended'] as const).map((s) => (
          <GhostBtn
            key={s}
            disabled={current === s}
            danger={s !== 'verified'}
            onClick={() => {
              if (s === 'verified') {
                setArmed(null);
                onAction(
                  `/admin/${kind}/${String(row.id)}/verification`,
                  { status: s },
                  `تم تحديث التوثيق إلى: ${STATUS_AR[s]}`,
                  'تأكيد تغيير حالة التوثيق؟',
                );
              } else {
                setArmed(armed === s ? null : s);
              }
            }}
          >
            {STATUS_AR[s]}
          </GhostBtn>
        ))}
      </div>
      {armed !== null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
          <label style={formLabel} htmlFor={`verify-reason-${String(row.id)}`}>
            سبب {armed === 'rejected' ? 'الرفض' : 'التعليق'} (إلزامي، يُحفظ في السجل ويُرسل
            للمستخدم)
          </label>
          <input
            id={`verify-reason-${String(row.id)}`}
            style={formInput}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="مثال: مستندات غير مكتملة"
            maxLength={500}
          />
          {reasonShort ? <HintText>السبب مطلوب (٤ أحرف على الأقل).</HintText> : null}
          <GhostBtn
            danger
            disabled={reasonShort}
            onClick={() =>
              onAction(
                `/admin/${kind}/${String(row.id)}/verification`,
                { status: armed, reason: reason.trim() },
                `تم تحديث التوثيق إلى: ${STATUS_AR[armed]}`,
                `تأكيد ${armed === 'rejected' ? 'الرفض' : 'التعليق'} مع حفظ السبب؟`,
              )
            }
          >
            تأكيد {armed === 'rejected' ? 'الرفض' : 'التعليق'}
          </GhostBtn>
        </div>
      ) : null}
    </div>
  );
}
