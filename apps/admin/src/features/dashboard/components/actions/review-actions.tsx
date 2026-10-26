import { spacing } from '@khabir/ui-tokens';
import { useState } from 'react';

import { formInput, formLabel } from '../../styles';

import type { OnAction, Row } from '../../types';

import { GhostBtn, HintText } from '@/components/ui';

/**
 * WP-Admin-04: review removal guardrail. Removal is irreversible (no
 * moderation state exists), so a reason is REQUIRED — stored in the
 * audit trail. The confirm dialog states the policy explicitly.
 */
export function ReviewActions({ row, onAction }: { row: Row; onAction: OnAction }) {
  const [armed, setArmed] = useState(false);
  const [reason, setReason] = useState('');
  const reasonShort = reason.trim().length < 4;
  if (!armed) {
    return (
      <GhostBtn danger onClick={() => setArmed(true)}>
        حذف
      </GhostBtn>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
      <label style={formLabel} htmlFor={`review-reason-${String(row.id)}`}>
        سبب الحذف (إلزامي، يُحفظ في سجل التدقيق)
      </label>
      <input
        id={`review-reason-${String(row.id)}`}
        style={formInput}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="مثال: محتوى مسيء حسب سياسة المنصة"
        maxLength={500}
      />
      {reasonShort ? <HintText>السبب مطلوب (٤ أحرف على الأقل).</HintText> : null}
      <div style={{ display: 'flex', gap: spacing[2] }}>
        <GhostBtn
          danger
          disabled={reasonShort}
          onClick={() =>
            onAction(
              `/admin/reviews/${String(row.id)}/remove`,
              { reason: reason.trim() },
              'تم حذف التقييم',
              'سيتم حذف التقييم نهائيًا ولا يمكن استرجاعه. متابعة؟',
            )
          }
        >
          تأكيد الحذف
        </GhostBtn>
        <GhostBtn
          onClick={() => {
            setArmed(false);
            setReason('');
          }}
        >
          تراجع
        </GhostBtn>
      </div>
    </div>
  );
}
