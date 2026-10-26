import { color } from '@khabir/ui-tokens';


import { formatCount } from '../helpers';

import { MetricCard } from './metric-card';

import type { Tab } from '../types';

import {
  IconBell,
  IconCancel,
  IconChevronLeft,
  IconClipboard,
  IconCreditCard,
  IconGift,
  IconScrollText,
  IconShieldCheck,
  IconStore,
  IconUsers,
  IconWrench,
} from '@/components/icon';
import { GhostBtn, HintText, Panel, SectionTitle } from '@/components/ui';

export function MetricsView({
  data,
  onNavigate,
  visible,
}: {
  data: Record<string, unknown>;
  onNavigate: (tab: Tab) => void;
  visible: (target: Tab) => boolean;
}) {
  const count = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;
  const sr = (data.serviceRequests ?? {}) as Record<string, unknown>;
  const verified = (data.verified ?? {}) as Record<string, unknown>;
  const states = [
    { label: 'بانتظار', value: count(sr.pending), tone: color.brand.gold, Icon: IconClipboard },
    { label: 'نشطة', value: count(sr.active), tone: color.brand.navy, Icon: IconWrench },
    {
      label: 'مكتملة',
      value: count(sr.completed),
      tone: color.success.DEFAULT,
      Icon: IconShieldCheck,
    },
    { label: 'ملغاة', value: count(sr.cancelled), tone: color.error.DEFAULT, Icon: IconCancel },
  ];
  const total = states.every((state) => state.value !== null)
    ? states.reduce((sum, state) => sum + (state.value ?? 0), 0)
    : null;
  return (
    <div className="dashboard-overview">
      <div className="overview-intro">
        <div>
          <span className="eyebrow">متابعة دقيقة. خدمة أفضل.</span>
          <h2>كل ما تحتاجه لاتخاذ الخطوة التالية</h2>
          <p>راقب نشاط المنصة، راجع الطلبات، وابدأ بالأعمال التي تحتاج اهتمامك.</p>
        </div>
        <div className="intro-seal" aria-hidden="true">
          <IconShieldCheck size={52} />
        </div>
      </div>
      <div className="metrics-grid">
        <MetricCard
          label="المستخدمون"
          value={count(data.usersCount)}
          Icon={IconUsers}
          context="إجمالي حسابات المنصة"
        />
        <MetricCard
          label="الفنيون"
          value={count(data.techniciansCount)}
          Icon={IconWrench}
          context="حسابات مقدّمي الخدمة"
        />
        <MetricCard
          label="التجار"
          value={count(data.merchantsCount)}
          Icon={IconStore}
          context="حسابات المتاجر"
        />
        <MetricCard
          label="اشتراكات نشطة"
          value={count(data.activeSubscriptions)}
          Icon={IconGift}
          context="الاشتراكات المفعّلة حاليًا"
        />
      </div>
      <div className="operations-grid">
        <Panel>
          <div className="panel-heading">
            <div>
              <SectionTitle>حركة طلبات الصيانة</SectionTitle>
              <HintText>توزيع الحالات الحالية · جميع الطلبات</HintText>
            </div>
            {visible('requests') ? (
              <GhostBtn onClick={() => onNavigate('requests')}>
                عرض الطلبات
                <IconChevronLeft size={14} />
              </GhostBtn>
            ) : null}
          </div>
          <div className="request-total">
            <strong className="tabular">{formatCount(total)}</strong>
            <span>إجمالي الطلبات</span>
          </div>
          {total !== null && total > 0 ? (
            <div className="status-distribution" aria-hidden="true">
              {states.map((state) => (
                <span
                  key={state.label}
                  style={{
                    width: `${((state.value ?? 0) / total) * 100}%`,
                    backgroundColor: state.tone,
                  }}
                />
              ))}
            </div>
          ) : (
            <HintText>
              {total === 0 ? 'لا توجد طلبات مسجلة بعد.' : 'بعض مؤشرات الطلبات غير متاحة.'}
            </HintText>
          )}
          <div className="request-breakdown">
            {states.map(({ label, value, tone, Icon }) => (
              <div key={label}>
                <span className="state-dot" style={{ backgroundColor: tone }} />
                <span>{label}</span>
                <Icon size={15} />
                <strong className="tabular">{formatCount(value)}</strong>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <div className="panel-heading">
            <div>
              <SectionTitle>أولوية المتابعة</SectionTitle>
              <HintText>ابدأ من هنا</HintText>
            </div>
            <span className="table-icon">
              <IconClipboard size={22} />
            </span>
          </div>
          {visible('requests') ? (
            <button className="attention-card" type="button" onClick={() => onNavigate('requests')}>
              <span>
                <strong>طلبات بانتظار المتابعة</strong>
                <small>انتقل لمراجعة الطلبات وحالاتها</small>
              </span>
              <b className="tabular">{formatCount(count(sr.pending))}</b>
              <IconChevronLeft size={18} />
            </button>
          ) : null}
          {visible('payments') ? (
            <button className="operation-link" type="button" onClick={() => onNavigate('payments')}>
              <IconCreditCard size={21} />
              <span>
                <strong>مراجعة المدفوعات</strong>
                <small>التحويلات وإثباتات الدفع والاشتراكات</small>
              </span>
              <IconChevronLeft size={16} />
            </button>
          ) : null}
          {visible('merchants') ? (
            <button
              className="operation-link"
              type="button"
              onClick={() => onNavigate('merchants')}
            >
              <IconStore size={21} />
              <span>
                <strong>توثيق التجار</strong>
                <small>مراجعة الحسابات وتحديث حالة التوثيق</small>
              </span>
              <IconChevronLeft size={16} />
            </button>
          ) : null}
        </Panel>
      </div>
      <div className="operations-grid secondary-grid">
        <Panel>
          <div className="panel-heading">
            <div>
              <SectionTitle>شبكة مقدّمي الخدمة</SectionTitle>
              <HintText>الحسابات الموثقة على المنصة</HintText>
            </div>
            <IconShieldCheck size={24} />
          </div>
          <div className="verification-grid">
            {visible('technicians') ? (
              <button type="button" onClick={() => onNavigate('technicians')}>
                <IconWrench size={22} />
                <strong className="tabular">{formatCount(count(verified.technicians))}</strong>
                <span>فنيون موثقون</span>
                <small>عرض الفنيين</small>
              </button>
            ) : null}
            {visible('merchants') ? (
              <button type="button" onClick={() => onNavigate('merchants')}>
                <IconStore size={22} />
                <strong className="tabular">{formatCount(count(verified.merchants))}</strong>
                <span>تجار موثقون</span>
                <small>عرض التجار</small>
              </button>
            ) : null}
          </div>
        </Panel>
        <Panel>
          <SectionTitle>أدوات التشغيل</SectionTitle>
          <HintText>إجراءات مباشرة مع الاحتفاظ بسياق المراجعة</HintText>
          <div className="quick-actions">
            {visible('audit') ? (
              <button type="button" onClick={() => onNavigate('audit')}>
                <IconScrollText size={22} />
                <strong>سجل التدقيق</strong>
                <span>من نفّذ الإجراء ومتى؟</span>
              </button>
            ) : null}
            {visible('notify') ? (
              <button type="button" onClick={() => onNavigate('notify')}>
                <IconBell size={22} />
                <strong>إرسال إشعار</strong>
                <span>تواصل مع مستخدم محدد</span>
              </button>
            ) : null}
            {visible('grants') ? (
              <button type="button" onClick={() => onNavigate('grants')}>
                <IconGift size={22} />
                <strong>المنح اليدوية</strong>
                <span>اشتراكات ومزايا</span>
              </button>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}
