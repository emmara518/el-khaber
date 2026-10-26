import { color, spacing } from '@khabir/ui-tokens';
import { useState } from 'react';

import { NOTIFY_TEMPLATES, OPERATIONAL_NOTIFICATION_TYPE } from '../constants';
import { formInput, formLabel } from '../styles';

import { UserPicker } from './user-picker';

import type { OnAction } from '../types';

import { GhostBtn, HintText, Panel, SectionTitle, SolidBtn } from '@/components/ui';

export function NotifyPanel({ onAction }: { onAction: OnAction }) {
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const canSend = userId.trim().length > 0 && title.trim().length > 0 && body.trim().length > 0;
  return (
    <Panel style={{ maxWidth: 560 }}>
      <SectionTitle>إرسال إشعار تشغيلي</SectionTitle>
      <HintText>إشعار لمستلم واحد محدد — لا يوجد إرسال جماعي.</HintText>
      <UserPicker
        label="المستلم"
        value={userId}
        onChange={setUserId}
        hint="ابحث بالبريد الإلكتروني أو رقم الجوال — لا حاجة لمعرفة المعرّف."
      />
      <label style={formLabel} htmlFor="notify-type">
        النوع (type)
      </label>
      <input
        id="notify-type"
        dir="ltr"
        readOnly
        style={{ ...formInput, backgroundColor: color.surface.subtle }}
        value={OPERATIONAL_NOTIFICATION_TYPE}
      />
      <HintText>
        إشعار تشغيلي إلزامي — يُسلَّم دائمًا ولا يخضع لتفضيلات كتم إشعارات الطلبات أو الاشتراك.
      </HintText>
      <div style={{ display: 'flex', gap: spacing[1], flexWrap: 'wrap', marginTop: spacing[2] }}>
        {NOTIFY_TEMPLATES.map((template) => (
          <GhostBtn
            key={template.labelAr}
            onClick={() => {
              setTitle(template.titleAr);
              setBody(template.bodyAr);
            }}
          >
            قالب: {template.labelAr}
          </GhostBtn>
        ))}
      </div>
      <label style={formLabel} htmlFor="notify-title">
        العنوان
      </label>
      <input
        id="notify-title"
        style={formInput}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="عنوان الإشعار"
      />
      <label style={formLabel} htmlFor="notify-body">
        المحتوى
      </label>
      <textarea
        id="notify-body"
        style={{ ...formInput, minHeight: 90, resize: 'vertical' }}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="نص الإشعار"
      />
      <div style={{ marginTop: spacing[3] }}>
        <SolidBtn
          disabled={!canSend}
          onClick={() =>
            onAction(
              '/admin/notifications',
              {
                user_id: userId.trim(),
                type: OPERATIONAL_NOTIFICATION_TYPE,
                title_ar: title,
                body_ar: body,
              },
              'تم إرسال الإشعار',
            )
          }
        >
          إرسال
        </SolidBtn>
        {!canSend ? <HintText>اختر المستلم وأدخل العنوان والمحتوى أولًا.</HintText> : null}
      </div>
    </Panel>
  );
}
