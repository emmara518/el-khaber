'use client';

/**
 * Admin operations console. Real API surfaces only: metrics, users,
 * technicians/merchants verification, service-request operations, review
 * moderation, payment review, manual grants, operational notifications,
 * and audit logs. Every mutation audited; destructive actions confirm.
 * Presentation is token-driven (@khabir/ui-tokens) — no ad-hoc colors.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  IconBell,
  IconCancel,
  IconChevronLeft,
  IconRefresh,
  IconClipboard,
  IconCreditCard,
  IconDashboard,
  IconGift,
  IconLogout,
  IconScrollText,
  IconShieldCheck,
  IconStar,
  IconStore,
  IconUsers,
  IconWrench,
} from '@/components/icon';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  GhostBtn,
  HintText,
  Panel,
  Pagination,
  SectionTitle,
  SkeletonRows,
  SolidBtn,
  StatusBadge,
  mono,
  td,
  th,
} from '@/components/ui';
import { AdminApi, AdminApiError, loadAdminSession, type AdminListResult } from '@/lib/admin-api';

type Tab =
  | 'metrics'
  | 'users'
  | 'technicians'
  | 'merchants'
  | 'requests'
  | 'reviews'
  | 'payments'
  | 'grants'
  | 'notify'
  | 'audit';

interface Row {
  id: string;
  [key: string]: unknown;
}

const TABS: ReadonlyArray<{ id: Tab; labelAr: string; Icon: typeof IconDashboard }> = [
  { id: 'metrics', labelAr: 'الرئيسية', Icon: IconDashboard },
  { id: 'users', labelAr: 'المستخدمون', Icon: IconUsers },
  { id: 'technicians', labelAr: 'الفنيون', Icon: IconWrench },
  { id: 'merchants', labelAr: 'التجار', Icon: IconStore },
  { id: 'requests', labelAr: 'الطلبات', Icon: IconClipboard },
  { id: 'reviews', labelAr: 'التقييمات', Icon: IconStar },
  { id: 'payments', labelAr: 'المدفوعات', Icon: IconCreditCard },
  { id: 'grants', labelAr: 'المنح', Icon: IconGift },
  { id: 'notify', labelAr: 'إشعارات', Icon: IconBell },
  { id: 'audit', labelAr: 'سجل التدقيق', Icon: IconScrollText },
];

/**
 * WP-Admin-01: tab visibility mirrors the server permission matrix
 * (docs/09_ADMIN.md §19). This is presentation-only convenience — the
 * API enforces every mutation with 401 regardless of what the UI shows.
 */
const TAB_ROLES: Record<Tab, ReadonlyArray<string>> = {
  metrics: ['super_admin', 'operations_admin', 'content_admin', 'support_admin', 'finance_admin'],
  users: ['super_admin', 'operations_admin', 'support_admin'],
  technicians: ['super_admin', 'operations_admin', 'support_admin'],
  merchants: ['super_admin', 'operations_admin', 'support_admin'],
  requests: ['super_admin', 'operations_admin', 'support_admin'],
  reviews: ['super_admin', 'operations_admin', 'content_admin', 'support_admin'],
  payments: ['super_admin', 'operations_admin', 'support_admin', 'finance_admin'],
  grants: ['super_admin', 'finance_admin'],
  notify: ['super_admin', 'operations_admin', 'support_admin'],
  audit: ['super_admin', 'operations_admin'],
};

const TAB_CONTEXT: Record<Tab, string> = {
  metrics: 'نظرة شاملة على المنصة وأولويات العمل',
  users: 'حسابات المنصة وبيانات التواصل وحالة الوصول',
  technicians: 'راجع هوية الفني وحالة توثيقه قبل اتخاذ القرار',
  merchants: 'مساحة مراجعة التجار وإدارة حالات التوثيق',
  requests: 'تابع سير طلبات الصيانة وحدّث حالتها بعناية',
  reviews: 'مراجعة تقييمات الخدمة والحفاظ على جودة المحتوى',
  payments: 'راجع التحويل وإثبات الدفع قبل قبول الاشتراك',
  grants: 'إدارة الاشتراكات والمزايا الممنوحة يدويًا',
  notify: 'تواصل تشغيلي مباشر مع مستخدم محدد',
  audit: 'تتبّع إجراءات الإدارة والحساب المنفّذ والسجل المستهدف',
};

const COLUMNS: Record<Tab, [string, string, string]> = {
  metrics: ['المعرف', 'الملخص', ''],
  users: ['المعرف', 'المستخدم', 'الحالة'],
  technicians: ['المعرف', 'الفني', 'التوثيق'],
  merchants: ['المعرف', 'التاجر', 'التوثيق'],
  requests: ['المعرف', 'الطلب', 'تغيير الحالة'],
  reviews: ['المعرف', 'التقييم', 'الإجراءات'],
  payments: ['المعرف', 'الدفع', 'الإجراءات'],
  grants: ['المعرف', 'الملخص', ''],
  notify: ['المعرف', 'الملخص', ''],
  audit: ['المعرف', 'الحدث', ''],
};

const ROLE_AR: Readonly<Record<string, string>> = {
  customer: 'عميل',
  technician: 'فني',
  merchant: 'تاجر',
};

/** Admin role labels (WP-Admin-01): shown in the topbar, never trusted for auth. */
const ADMIN_ROLE_AR: Readonly<Record<string, string>> = {
  super_admin: 'مدير عام',
  operations_admin: 'مدير العمليات',
  content_admin: 'مدير المحتوى',
  support_admin: 'مدير الدعم',
  finance_admin: 'المدير المالي',
};

const STATUS_AR: Readonly<Record<string, string>> = {
  pending: 'بانتظار',
  accepted: 'مقبول',
  on_the_way: 'في الطريق',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  active: 'نشط',
  suspended: 'موقوف',
  verified: 'موثق',
  rejected: 'مرفوض',
  approved: 'مقبول',
  rejected_payment: 'مرفوض',
  deleted: 'محذوف',
};

export default function AdminDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof loadAdminSession>>(null);
  const [tab, setTab] = useState<Tab>('metrics');
  const [items, setItems] = useState<Row[] | null>(null);
  const [meta, setMeta] = useState<AdminListResult<Row>['meta'] | null>(null);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [paymentDetail, setPaymentDetail] = useState<Record<string, unknown> | null>(null);
  const [detailStatus, setDetailStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionFailed, setActionFailed] = useState(false);

  const [query, setQuery] = useState('');
  const [rowStatus, setRowStatus] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    path: string;
    body: unknown;
    success: string;
    message: string;
  } | null>(null);
  const loadVersion = useRef(0);
  const detailVersion = useRef(0);
  const actionLock = useRef(false);
  const authed = session !== null;
  const adminRole = session?.admin.role ?? '';
  // WP-Admin-01: navigation shows only the tabs this role may use
  // (server enforces regardless). An unknown/changed role sees metrics
  // plus an explicit notice instead of silent empty tabs.
  const visibleTabs = TABS.filter((entry) => TAB_ROLES[entry.id].includes(adminRole));
  const tabAllowed = TAB_ROLES[tab].includes(adminRole);
  const currentTab = TABS.find((entry) => entry.id === tab)!;
  const visibleItems =
    items?.filter((row) => {
      const fields = [
        row.id,
        row.email,
        row.phone,
        row.displayName,
        row.businessName,
        row.problemDescription,
        row.method,
        row.transferReference,
        row.action,
        row.entityId,
        row.actorAdminId,
      ];
      return (
        fields.some(
          (value) =>
            typeof value === 'string' &&
            value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
        ) &&
        (!rowStatus || String(row.verificationStatus ?? row.status ?? '') === rowStatus)
      );
    }) ?? [];
  const availableStatuses = Array.from(
    new Set(
      items?.map((row) => String(row.verificationStatus ?? row.status ?? '')).filter(Boolean) ?? [],
    ),
  );
  const navigate = (target: Tab) => {
    setTab(target);
    setQuery('');
    setRowStatus('');
    setMenuOpen(false);
    setActionMsg(null);
  };

  const load = useCallback(
    (targetTab: Tab, page: number, limit: number) => {
      if (!authed) return;
      const version = ++loadVersion.current;
      detailVersion.current += 1;
      setStatus('loading');
      setError(null);
      setItems(null);
      setMeta(null);
      setPaymentDetail(null);
      setDetailStatus('idle');
      const paths: Record<Tab, string> = {
        metrics: '/admin/metrics',
        users: `/admin/users?page=${String(page)}&limit=${String(limit)}`,
        technicians: `/admin/technicians?page=${String(page)}&limit=${String(limit)}`,
        merchants: `/admin/merchants?page=${String(page)}&limit=${String(limit)}`,
        requests: `/admin/service-requests?page=${String(page)}&limit=${String(limit)}`,
        reviews: `/admin/reviews?page=${String(page)}&limit=${String(limit)}`,
        payments: `/admin/payments/submissions?page=${String(page)}&limit=${String(limit)}`,
        grants: '',
        notify: '',
        audit: `/admin/audit-logs?page=${String(page)}&limit=${String(limit)}`,
      };
      // Grants and notifications are form-only tabs (no list endpoint).
      if (targetTab === 'grants' || targetTab === 'notify') {
        setItems(null);
        setMeta(null);
        setPaymentDetail(null);
        setStatus('loaded');
        return;
      }
      const promise =
        targetTab === 'metrics'
          ? AdminApi.get(paths.metrics).then((data: unknown) => {
              if (version !== loadVersion.current) return;
              setMetrics(data as Record<string, unknown>);
              setStatus('loaded');
            })
          : AdminApi.list<Row>(paths[targetTab]).then((list) => {
              if (version !== loadVersion.current) return;
              setItems([...list.items]);
              setMeta(list.meta);
              setStatus('loaded');
            });
      void promise.catch((err: unknown) => {
        if (version !== loadVersion.current) return;
        setError(err instanceof AdminApiError ? err.messageAr : 'تعذر التحميل');
        setStatus('error');
      });
    },
    [authed],
  );

  useEffect(() => {
    const s = loadAdminSession();
    if (s === null) {
      router.push('/login');
      return;
    }
    setSession(s);
  }, [router]);

  useEffect(() => {
    load(tab, 1, 20);
  }, [tab, load]);

  const executeAction = (path: string, body: unknown, successAr: string) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setActionBusy(true);
    setActionMsg(null);
    setActionFailed(false);
    void AdminApi.post(path, body)
      .then(() => {
        setConfirmation(null);
        setActionMsg(successAr);
        setPaymentDetail(null);
        load(tab, meta?.page ?? 1, meta?.limit ?? 20);
      })
      .catch((err: unknown) => {
        setConfirmation(null);
        setActionMsg(err instanceof AdminApiError ? err.messageAr : 'فشل الإجراء');
        setActionFailed(true);
      })
      .finally(() => {
        actionLock.current = false;
        setActionBusy(false);
      });
  };

  const runAction = (path: string, body: unknown, successAr: string, confirmAr?: string) => {
    if (actionLock.current) return;
    setConfirmation({
      path,
      body,
      success: successAr,
      message:
        confirmAr ?? 'راجع بيانات المستلم والإجراء قبل التأكيد. سيتم حفظ العملية في سجل التدقيق.',
    });
  };

  const loadPaymentDetail = (id: string) => {
    const version = ++detailVersion.current;
    setDetailStatus('loading');
    setPaymentDetail(null);
    void AdminApi.get<Record<string, unknown>>(`/admin/payments/submissions/${id}`)
      .then((data) => {
        if (version !== detailVersion.current) return;
        setPaymentDetail(data);
        setDetailStatus('idle');
      })
      .catch((err: unknown) => {
        if (version !== detailVersion.current) return;
        setActionMsg(err instanceof AdminApiError ? err.messageAr : 'تعذر تحميل تفاصيل الدفع');
        setActionFailed(true);
        setDetailStatus('error');
      });
  };

  const logout = () => {
    AdminApi.logout();
    router.push('/login');
  };

  if (!authed) {
    return <div dir="rtl" style={{ minHeight: '100vh', backgroundColor: color.surface.subtle }} />;
  }

  return (
    <div className="admin-shell" dir="rtl">
      <a className="skip-link" href="#admin-content">
        انتقل إلى المحتوى
      </a>
      <aside className="admin-sidebar">
        <div className="brand-lockup">
          <span className="brand-mark">
            <IconShieldCheck size={28} />
          </span>
          <div>
            <strong>الخبير</strong>
            <span>لوحة إدارة العمليات</span>
          </div>
        </div>
        <button
          className="mobile-menu"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="admin-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <IconDashboard size={18} /> أقسام الإدارة
        </button>
        <nav
          id="admin-navigation"
          className={menuOpen ? 'sidebar-nav is-open' : 'sidebar-nav'}
          aria-label="أقسام لوحة الإدارة"
        >
          {[
            { title: 'مساحة العمل', ids: ['metrics'] as const },
            {
              title: 'المنصة والخدمات',
              ids: ['users', 'technicians', 'merchants', 'requests', 'reviews'] as const,
            },
            { title: 'المالية والتشغيل', ids: ['payments', 'grants', 'notify', 'audit'] as const },
          ].map((group) => {
            const tabs = visibleTabs.filter((entry) =>
              (group.ids as readonly string[]).includes(entry.id),
            );
            if (tabs.length === 0) return null;
            return (
              <div className="nav-group" key={group.title}>
                <div className="nav-group-label">{group.title}</div>
                {tabs.map(({ id, labelAr, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className="nav-item"
                    aria-current={tab === id ? 'page' : undefined}
                    disabled={actionBusy}
                    onClick={() => navigate(id)}
                  >
                    <Icon size={19} />
                    <span>{labelAr}</span>
                    {tab === id ? <IconChevronLeft size={14} /> : null}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-note">
            <IconShieldCheck size={18} />
            <span>
              قرارات موثّقة
              <br />
              <small>كل إجراء له أثر في سجل التدقيق</small>
            </span>
          </div>
          <GhostBtn onClick={logout} disabled={actionBusy}>
            <IconLogout size={16} />
            تسجيل الخروج
          </GhostBtn>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="breadcrumb">
            <span>لوحة الإدارة</span>
            <IconChevronLeft size={14} />
            <strong>{currentTab.labelAr}</strong>
          </div>
          <div className="admin-profile">
            <span className="profile-icon">
              <IconUsers size={18} />
            </span>
            <div>
              <strong>حساب الإدارة</strong>
              <span dir="ltr">{session?.admin.email ?? ''}</span>
              <span>{ADMIN_ROLE_AR[adminRole] ?? adminRole}</span>
            </div>
          </div>
        </header>
        <main id="admin-content" className="admin-content" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <div className="eyebrow">الخبير / إدارة العمليات</div>
              <h1>{tab === 'metrics' ? 'نظرة عامة' : currentTab.labelAr}</h1>
              <p>{TAB_CONTEXT[tab]}</p>
            </div>
            <GhostBtn
              disabled={status === 'loading' || actionBusy}
              onClick={() => load(tab, meta?.page ?? 1, meta?.limit ?? 20)}
            >
              <IconRefresh size={16} />
              تحديث البيانات
            </GhostBtn>
          </div>

          {actionMsg !== null ? (
            <div
              role="status"
              style={{
                backgroundColor: actionFailed ? color.error.soft : color.success.soft,
                color: actionFailed ? color.error.DEFAULT : color.success.DEFAULT,
                border: `1px solid ${actionFailed ? '#F3C4C4' : '#BFE6CF'}`,
                borderRadius: radius.sm,
                padding: `10px ${spacing[4]}`,
                marginBottom: spacing[4],
                fontSize: 13.5,
              }}
            >
              {actionMsg}
            </div>
          ) : null}

          {status === 'loading' ? (
            <Panel>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={table}>
                  <thead>
                    <tr>
                      {COLUMNS[tab].map((h, i) => (
                        <th key={i} style={th}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <SkeletonRows cols={3} />
                </table>
              </div>
            </Panel>
          ) : null}

          {status === 'error' && error !== null ? (
            <ErrorState message={error} onRetry={() => load(tab, 1, 20)} />
          ) : null}

          {!tabAllowed ? (
            <Panel>
              <SectionTitle>غير مصرح لهذا القسم</SectionTitle>
              <HintText>
                دورك الحالي ({ADMIN_ROLE_AR[adminRole] ?? adminRole}) لا يشمل صلاحية{' '}
                {currentTab.labelAr}. الصلاحيات مطبقة على الخادم — اختر قسمًا متاحًا من القائمة.
              </HintText>
              <GhostBtn onClick={() => navigate('metrics')}>العودة إلى الرئيسية</GhostBtn>
            </Panel>
          ) : null}

          {tabAllowed && status === 'loaded' && tab === 'metrics' && metrics !== null ? (
            <MetricsView
              data={metrics}
              onNavigate={navigate}
              visible={(target) => TAB_ROLES[target].includes(adminRole)}
            />
          ) : null}

          {tabAllowed && status === 'loaded' && items !== null ? (
            <Panel>
              <div className="table-heading">
                <div>
                  <SectionTitle>{currentTab.labelAr}</SectionTitle>
                  <HintText>
                    {meta?.total ?? items.length} سجل إجمالًا · البحث والتصفية في الصفحة الحالية فقط
                  </HintText>
                </div>
                <span className="table-icon">
                  <currentTab.Icon size={22} />
                </span>
              </div>
              <div className="table-toolbar">
                <label className="search-field">
                  <span>البحث في الصفحة الحالية</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="ابحث بالمعرف أو بيانات السجل…"
                  />
                </label>
                <label className="filter-field">
                  <span>الحالة</span>
                  <select value={rowStatus} onChange={(event) => setRowStatus(event.target.value)}>
                    <option value="">كل الحالات</option>
                    {availableStatuses.map((value) => (
                      <option key={value} value={value}>
                        {statusLabel(value)}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="result-count" role="status">
                  {visibleItems.length} نتيجة في الصفحة
                </span>
                {query || rowStatus ? (
                  <GhostBtn
                    onClick={() => {
                      setQuery('');
                      setRowStatus('');
                    }}
                  >
                    مسح التصفية
                  </GhostBtn>
                ) : null}
              </div>
              {visibleItems.length === 0 ? (
                <EmptyState
                  title={items.length ? 'لا توجد نتائج مطابقة' : 'لا توجد سجلات للعرض'}
                  hint={
                    items.length
                      ? 'عدّل البحث أو امسح التصفية لعرض سجلات الصفحة.'
                      : 'ستظهر السجلات هنا عند توفرها. يمكنك تحديث البيانات.'
                  }
                />
              ) : (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={table}>
                      <thead>
                        <tr>
                          {COLUMNS[tab].map((h, i) => (
                            <th key={i} style={th}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleItems.map((row) => (
                          <tr key={row.id} className="row-enter">
                            <td style={td}>
                              <span style={mono} title={String(row.id)}>
                                {row.id.slice(0, 8)}…
                              </span>
                            </td>
                            <td style={td}>
                              <RowSummary row={row} />
                            </td>
                            <td style={{ ...td, whiteSpace: 'nowrap' }}>
                              <Actions
                                tab={tab}
                                row={row}
                                role={adminRole}
                                onAction={runAction}
                                onDetail={loadPaymentDetail}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {meta !== null ? (
                <Pagination
                  page={meta.page}
                  totalPages={Math.max(meta.totalPages, 1)}
                  total={meta.total}
                  onGo={(page) => {
                    setQuery('');
                    setRowStatus('');
                    load(tab, page, meta.limit);
                  }}
                />
              ) : null}
            </Panel>
          ) : null}

          {status === 'loaded' && tab === 'payments' ? (
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
                      label={
                        STATUS_AR[String(paymentDetail.status)] ?? String(paymentDetail.status)
                      }
                    />
                  </DetailValue>
                  <DetailLabel>مرجع التحويل</DetailLabel>
                  <DetailValue mono>{String(paymentDetail.transferReference)}</DetailValue>
                  <DetailLabel>إثبات الدفع</DetailLabel>
                  <DetailValue>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
                      <span style={{ color: color.text.secondary }}>{String(paymentDetail.proofStorageKey ?? '—')}</span>
                      {paymentDetail.proofStorageKey != null && String(paymentDetail.proofStorageKey).length > 0 ? (
                        <ProofPreviewButton submissionId={String(paymentDetail.id)} />
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
          ) : null}

          {status === 'loaded' && tab === 'grants' ? <GrantsPanel onAction={runAction} /> : null}
          {status === 'loaded' && tab === 'notify' ? <NotifyPanel onAction={runAction} /> : null}
          <footer className="workspace-footer">
            <span>الخبير · مساحة الإدارة</span>
            <span>الخدمة تبدأ بقرار مدروس</span>
          </footer>
        </main>
      </div>
      <ConfirmDialog
        open={confirmation !== null}
        title="تأكيد الإجراء"
        description={confirmation?.message ?? ''}
        busy={actionBusy}
        onClose={() => setConfirmation(null)}
        onConfirm={() => {
          if (confirmation)
            executeAction(confirmation.path, confirmation.body, confirmation.success);
        }}
      />
    </div>
  );
}

function DetailLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ color: color.text.secondary }}>{children}</div>;
}

function DetailValue({ children, mono: isMono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <div style={isMono === true ? { ...mono, wordBreak: 'break-all' } : undefined}>{children}</div>
  );
}

function MetricCard({
  label,
  value,
  Icon,
  context,
}: {
  label: string;
  value: number | null;
  Icon: typeof IconDashboard;
  context: string;
}) {
  return (
    <div className="card-enter metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">
          <Icon size={20} />
        </span>
      </div>
      <strong className="metric-value tabular">{formatCount(value)}</strong>
      <span className="metric-context">{context}</span>
    </div>
  );
}

function formatCount(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('ar-EG', { numberingSystem: 'latn' }).format(value)
    : '—';
}

function MetricsView({
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

function statusLabel(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return '—';
  return STATUS_AR[value] ?? value;
}

function RowSummary({ row }: { row: Row }) {
  // Users endpoint returns flat rows: { id, role, status, phone, email,
  // phoneVerified, emailVerified, createdAt, lastLoginAt }. Either contact
  // channel may be null (phone and/or email identity) — the primary line
  // prefers email, the secondary line carries the phone when both exist.
  if (
    typeof row.email === 'string' ||
    typeof row.phone === 'string' ||
    typeof row.role === 'string'
  ) {
    const hasEmail = typeof row.email === 'string' && row.email.length > 0;
    const hasPhone = typeof row.phone === 'string' && row.phone.length > 0;
    const primary = hasEmail ? row.email : hasPhone ? row.phone : '—';
    const secondary = hasEmail && hasPhone ? String(row.phone) : null;
    const role = typeof row.role === 'string' && row.role.length > 0 ? row.role : null;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing[2] }}>
        <span dir="ltr">{String(primary)}</span>
        {secondary !== null ? (
          <span dir="ltr" style={{ color: color.text.secondary, fontSize: 12 }}>
            {secondary}
          </span>
        ) : null}
        {role !== null ? <StatusBadge label={ROLE_AR[role] ?? role} /> : null}
      </span>
    );
  }
  if (typeof row.status === 'string' && typeof row.problemDescription === 'string') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing[2] }}>
        <span>
          طلب صيانة —{' '}
          <span style={{ color: color.text.secondary }}>
            {String(row.problemDescription).slice(0, 40)}
          </span>
        </span>
        <StatusBadge label={statusLabel(row.status)} />
      </span>
    );
  }
  if (typeof row.rating === 'number') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing[2] }}>
        <span className="tabular" style={{ color: color.brand.gold }}>
          ★ {row.rating}/5
        </span>
        {typeof row.comment === 'string' && row.comment.length > 0 ? (
          <span style={{ color: color.text.secondary }}>{row.comment.slice(0, 40)}</span>
        ) : null}
      </span>
    );
  }
  if (typeof row.method === 'string') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing[2] }}>
        <span>دفع — {row.method}</span>
        <StatusBadge label={statusLabel(row.status)} />
      </span>
    );
  }
  if (typeof row.displayName === 'string') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing[2] }}>
        <span>فني — {row.displayName}</span>
        <StatusBadge label={STATUS_AR[String(row.verificationStatus)] ?? '—'} />
      </span>
    );
  }
  if (typeof row.businessName === 'string') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing[2] }}>
        <span>تاجر — {row.businessName}</span>
        <StatusBadge label={STATUS_AR[String(row.verificationStatus)] ?? '—'} />
      </span>
    );
  }
  if (typeof row.action === 'string') {
    const when = typeof row.createdAt === 'string' ? row.createdAt.slice(0, 10) : null;
    const actor =
      typeof row.actorAdminId === 'string' && row.actorAdminId.length > 0
        ? row.actorAdminId.slice(0, 8)
        : 'النظام';
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing[2] }}>
        <span dir="ltr" style={mono}>
          {row.action}
        </span>
        <span style={mono}>
          {String(row.entityType)}/{String(row.entityId).slice(0, 8)}
        </span>
        <span style={{ color: color.text.secondary, fontSize: 12 }}>
          {actor}
          {when !== null ? ` · ${when}` : ''}
        </span>
      </span>
    );
  }
  return <span style={{ color: color.text.secondary }}>سجل</span>;
}

function Actions({
  tab,
  row,
  role,
  onAction,
  onDetail,
}: {
  tab: Tab;
  row: Row;
  /** WP-Admin-01: the signed-in admin role — hides mutations the server would 401. */
  role: string;
  onAction: (path: string, body: unknown, successAr: string, confirmAr?: string) => void;
  onDetail: (id: string) => void;
}) {
  const canVerify = role === 'super_admin' || role === 'operations_admin';
  const canDecidePayment = role === 'super_admin' || role === 'finance_admin';
  if (tab === 'users') {
    return <StatusBadge label={statusLabel(row.status)} />;
  }
  if (tab === 'technicians' || tab === 'merchants') {
    if (!canVerify) {
      return <StatusBadge label={statusLabel(row.verificationStatus)} />;
    }
    const kind = tab === 'technicians' ? 'technicians' : 'merchants';
    return <VerificationActions row={row} kind={kind} onAction={onAction} />;
  }
  if (tab === 'reviews') {
    return <ReviewActions row={row} onAction={onAction} />;
  }
  if (tab === 'requests') {
    const current = String(row.status);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
        <div style={{ display: 'flex', gap: spacing[2] }}>
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
    );
  }
  if (tab === 'payments') {
    const status = String(row.status);
    const decided = status === 'approved' || status === 'rejected';
    return (
      <div style={{ display: 'flex', gap: spacing[2] }}>
        <GhostBtn onClick={() => onDetail(String(row.id))}>تفاصيل</GhostBtn>
        {canDecidePayment ? <PaymentDecisionActions row={row} decided={decided} onAction={onAction} /> : null}
      </div>
    );
  }
  return <span style={{ color: color.text.secondary }}>—</span>;
}

/**
 * AUD-005: manual-payment decision controls. Approval stays a one-tap
 * confirm (note optional, not required by the server). Rejection requires
 * an inline Arabic reason (server 400 otherwise) that is audited and
 * sent to the user — mirrors VerificationActions (WP-Admin-02).
 */
function PaymentDecisionActions({
  row,
  decided,
  onAction,
}: {
  row: Row;
  decided: boolean;
  onAction: (path: string, body: unknown, successAr: string, confirmAr?: string) => void;
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

/**
 * AUD-004: proof preview. Fetches a short-lived presigned GET URL and
 * opens it in a new tab; the URL is never stored, logged locally, or
 * exposed server-side beyond the audit entry (admin.payment.proof_view).
 */
function ProofPreviewButton({ submissionId }: { submissionId: string }) {
  const [busy, setBusy] = useState(false);
  const [errorAr, setErrorAr] = useState<string | null>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
      <GhostBtn
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setErrorAr(null);
          AdminApi.get<{ downloadUrl?: string }>(
            `/admin/payments/submissions/${submissionId}/proof-url`,
          )
            .then((data) => {
              const url = data.downloadUrl ?? '';
              if (url.length === 0) {
                setErrorAr('تحتوى الاستجابة على رابط غير صالح');
                return;
              }
              window.open(url, '_blank', 'noopener,noreferrer');
            })
            .catch((err: unknown) => {
              setErrorAr(
                err instanceof AdminApiError && err.status === 404
                  ? 'لا يوجد إثبات مرفق لهذا الطلب'
                  : err instanceof AdminApiError
                    ? err.messageAr
                    : 'تعذر تحميل رابط المعاينة',
              );
            })
            .finally(() => {
              setBusy(false);
            });
        }}
      >
        {busy ? 'جارٍ التحضير…' : 'معاينة الإثبات (رابط مؤقت)'}
      </GhostBtn>
      {errorAr !== null ? <HintText>{errorAr}</HintText> : null}
    </div>
  );
}

/**
 * WP-Admin-02: verification buttons with an inline review-reason field.
 * The reason is REQUIRED for rejected/suspended (server 400 otherwise),
 * audited, and notified to the user. Approve sends no reason.
 */
function VerificationActions({
  row,
  kind,
  onAction,
}: {
  row: Row;
  kind: 'technicians' | 'merchants';
  onAction: (path: string, body: unknown, successAr: string, confirmAr?: string) => void;
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

/**
 * WP-Admin-03: assign a verified technician to a pending request.
 * Loads the verified-technician options on expand; the server enforces
 * pending-only + verified-only atomically.
 */
function AssignControl({
  requestId,
  onAction,
}: {
  requestId: string;
  onAction: (path: string, body: unknown, successAr: string, confirmAr?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [technicianId, setTechnicianId] = useState('');

  const expand = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    setLoadError(null);
    void AdminApi.list<Row>('/admin/technicians?verification_status=verified&page=1&limit=100')
      .then((list) => {
        setOptions(
          list.items.map((row) => ({
            id: String(row.id),
            label: `${String(row.displayName ?? 'فني')} · ${String(row.id).slice(0, 8)}`,
          })),
        );
        setLoading(false);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof AdminApiError ? err.messageAr : 'تعذر تحميل الفنيين');
        setLoading(false);
      });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
      <GhostBtn onClick={expand}>{open ? 'إخفاء التعيين' : 'تعيين فني'}</GhostBtn>
      {open ? (
        loading ? (
          <HintText>جارٍ تحميل الفنيين الموثقين…</HintText>
        ) : loadError !== null ? (
          <HintText>{loadError}</HintText>
        ) : options.length === 0 ? (
          <HintText>لا يوجد فنيون موثقون متاحون للتعيين.</HintText>
        ) : (
          <>
            <label style={formLabel} htmlFor={`assign-tech-${requestId}`}>
              الفني المعيّن (موثق فقط)
            </label>
            <select
              id={`assign-tech-${requestId}`}
              style={formInput}
              value={technicianId}
              onChange={(event) => setTechnicianId(event.target.value)}
            >
              <option value="">اختر الفني…</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <GhostBtn
              disabled={technicianId.length === 0}
              onClick={() =>
                onAction(
                  `/admin/service-requests/${requestId}/assign`,
                  { technician_id: technicianId },
                  'تم تعيين الفني للطلب',
                  'تأكيد إسناد الطلب للفني المحدد؟ سيُعلَم الطرفان.',
                )
              }
            >
              تأكيد التعيين
            </GhostBtn>
          </>
        )
      ) : null}
    </div>
  );
}

/**
 * WP-Admin-04: review removal guardrail. Removal is irreversible (no
 * moderation state exists), so a reason is REQUIRED — stored in the
 * audit trail. The confirm dialog states the policy explicitly.
 */
function ReviewActions({
  row,
  onAction,
}: {
  row: Row;
  onAction: (path: string, body: unknown, successAr: string, confirmAr?: string) => void;
}) {
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

function GrantsPanel({
  onAction,
}: {
  onAction: (path: string, body: unknown, successAr: string) => void;
}) {
  const [subUserId, setSubUserId] = useState('');
  const [planId, setPlanId] = useState('');
  const [entUserId, setEntUserId] = useState('');
  const [entitlementId, setEntitlementId] = useState('');
  return (
    <Panel style={{ maxWidth: 560 }}>
      <SectionTitle>منح اشتراك يدوي</SectionTitle>
      <HintText>
        ينشئ اشتراكًا نشطًا دون سجل دفع. الصق المعرفات من جداول المستخدمين والخطط.
      </HintText>
      <label style={formLabel} htmlFor="grant-sub-user">
        معرف المستخدم (user_id)
      </label>
      <input
        id="grant-sub-user"
        dir="ltr"
        style={formInput}
        value={subUserId}
        onChange={(e) => setSubUserId(e.target.value)}
        placeholder="00000000-0000-0000-0000-000000000000"
      />
      <label style={formLabel} htmlFor="grant-plan">
        معرف الخطة (plan_id)
      </label>
      <input
        id="grant-plan"
        dir="ltr"
        style={formInput}
        value={planId}
        onChange={(e) => setPlanId(e.target.value)}
        placeholder="00000000-0000-0000-0000-000000000000"
      />
      <div style={{ marginTop: spacing[3] }}>
        <SolidBtn
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
      </div>

      <div
        style={{ height: 1, backgroundColor: color.border.default, margin: `${spacing[5]}px 0` }}
      />

      <SectionTitle>منح ميزة يدويًا</SectionTitle>
      <label style={formLabel} htmlFor="grant-ent-user">
        معرف المستخدم (user_id)
      </label>
      <input
        id="grant-ent-user"
        dir="ltr"
        style={formInput}
        value={entUserId}
        onChange={(e) => setEntUserId(e.target.value)}
        placeholder="00000000-0000-0000-0000-000000000000"
      />
      <label style={formLabel} htmlFor="grant-ent">
        معرف الميزة (entitlement_id)
      </label>
      <input
        id="grant-ent"
        dir="ltr"
        style={formInput}
        value={entitlementId}
        onChange={(e) => setEntitlementId(e.target.value)}
        placeholder="00000000-0000-0000-0000-000000000000"
      />
      <div style={{ marginTop: spacing[3] }}>
        <SolidBtn
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
      </div>
    </Panel>
  );
}

function NotifyPanel({
  onAction,
}: {
  onAction: (path: string, body: unknown, successAr: string) => void;
}) {
  const [userId, setUserId] = useState('');
  const [type, setType] = useState('general');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  return (
    <Panel style={{ maxWidth: 560 }}>
      <SectionTitle>إرسال إشعار تشغيلي</SectionTitle>
      <HintText>إشعار لمستلم واحد محدد — لا يوجد إرسال جماعي.</HintText>
      <label style={formLabel} htmlFor="notify-user">
        معرف المستخدم (user_id)
      </label>
      <input
        id="notify-user"
        dir="ltr"
        style={formInput}
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        placeholder="00000000-0000-0000-0000-000000000000"
      />
      <label style={formLabel} htmlFor="notify-type">
        النوع (type)
      </label>
      <input
        id="notify-type"
        dir="ltr"
        style={formInput}
        value={type}
        onChange={(e) => setType(e.target.value)}
        placeholder="general"
      />
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
          onClick={() =>
            onAction(
              '/admin/notifications',
              { user_id: userId.trim(), type: type.trim(), title_ar: title, body_ar: body },
              'تم إرسال الإشعار',
            )
          }
        >
          إرسال
        </SolidBtn>
      </div>
    </Panel>
  );
}

const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const formLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 12.5,
  color: color.text.primary,
  margin: `10px 0 4px`,
  fontWeight: 500,
};

const formInput: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  border: `1px solid ${color.border.default}`,
  borderRadius: radius.sm,
  fontSize: 13.5,
  fontFamily: 'inherit',
  backgroundColor: color.surface.base,
  transition: 'border-color 0.15s ease',
};
