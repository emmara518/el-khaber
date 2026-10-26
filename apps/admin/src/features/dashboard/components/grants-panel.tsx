import { color, spacing } from '@khabir/ui-tokens';
import { useState } from 'react';

import { ROLE_AR } from '../constants';

import { CatalogSelect } from './catalog-select';
import { UserPicker } from './user-picker';

import type { OnAction, Row } from '../types';

import { HintText, Panel, SectionTitle, SolidBtn } from '@/components/ui';

export function GrantsPanel({ onAction }: { onAction: OnAction }) {
  const [subUserId, setSubUserId] = useState('');
  const [planId, setPlanId] = useState('');
  const [entUserId, setEntUserId] = useState('');
  const [entitlementId, setEntitlementId] = useState('');
  const canGrantSub = subUserId.trim().length > 0 && planId.trim().length > 0;
  const canGrantEnt = entUserId.trim().length > 0 && entitlementId.trim().length > 0;
  return (
    <Panel style={{ maxWidth: 560 }}>
      <SectionTitle>منح اشتراك يدوي</SectionTitle>
      <HintText>
        اختر المستخدم بالبحث واختر الخطة بالاسم — لا حاجة للصق معرّفات. يُنشئ اشتراكًا نشطًا دون
        سجل دفع ويُحفظ في سجل التدقيق.
      </HintText>
      <UserPicker
        label="المستخدم"
        value={subUserId}
        onChange={setSubUserId}
        hint="ابحث بالبريد الإلكتروني أو رقم الجوال."
      />
      <CatalogSelect
        label="الخطة"
        path="/admin/plans"
        value={planId}
        onChange={setPlanId}
        emptyLabel="اختر الخطة…"
        formatOption={(row: Row) =>
          `${String(row.nameAr ?? row.code ?? '')} · ${
            ROLE_AR[String(row.role)] ?? String(row.role)
          } · ${String(row.price ?? '')} ${String(row.currency ?? '')}`
        }
      />
      <div style={{ marginTop: spacing[3] }}>
        <SolidBtn
          disabled={!canGrantSub}
          onClick={() =>
            onAction(
              '/admin/subscriptions/grant',
              { user_id: subUserId.trim(), plan_id: planId.trim() },
              'تم منح الاشتراك',
            )
          }
        >
          منح الاشتراك
        </SolidBtn>
        {!canGrantSub ? <HintText>اختر المستخدم والخطة أولًا.</HintText> : null}
      </div>

      <div
        style={{ height: 1, backgroundColor: color.border.default, margin: `${spacing[5]}px 0` }}
      />

      <SectionTitle>منح ميزة يدويًا</SectionTitle>
      <HintText>اختر المستخدم والميزة بالاسم؛ تُسجَّل العملية في سجل التدقيق.</HintText>
      <UserPicker label="المستخدم" value={entUserId} onChange={setEntUserId} />
      <CatalogSelect
        label="الميزة"
        path="/admin/entitlements"
        value={entitlementId}
        onChange={setEntitlementId}
        emptyLabel="اختر الميزة…"
        formatOption={(row: Row) => String(row.nameAr ?? row.code ?? '')}
      />
      <div style={{ marginTop: spacing[3] }}>
        <SolidBtn
          disabled={!canGrantEnt}
          onClick={() =>
            onAction(
              '/admin/entitlements/grant',
              { user_id: entUserId.trim(), entitlement_id: entitlementId.trim() },
              'تم منح الميزة',
            )
          }
        >
          منح الميزة
        </SolidBtn>
        {!canGrantEnt ? <HintText>اختر المستخدم والميزة أولًا.</HintText> : null}
      </div>
    </Panel>
  );
}
