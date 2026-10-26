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


import { Actions } from './components/actions/actions';
import { GrantsPanel } from './components/grants-panel';
import { MetricsView } from './components/metrics-view';
import { NotifyPanel } from './components/notify-panel';
import { PaymentDetailPanel } from './components/payment-detail-panel';
import { RowSummary } from './components/row-summary';
import { UserDetailPanel } from './components/user-detail-panel';
import { ADMIN_ROLE_AR, COLUMNS, TAB_CONTEXT, TAB_ROLES, TABS } from './constants';
import { statusLabel } from './helpers';
import { table } from './styles';

import type { DetailStatus, OnAction, Row, Tab } from './types';

import {
  IconChevronLeft,
  IconDashboard,
  IconLogout,
  IconRefresh,
  IconShieldCheck,
  IconUsers,
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
  mono,
  td,
  th,
} from '@/components/ui';
import { AdminApi, AdminApiError, loadAdminSession, type AdminListResult } from '@/lib/admin-api';

export function DashboardScreen() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof loadAdminSession>>(null);
  const [tab, setTab] = useState<Tab>('metrics');
  const [items, setItems] = useState<Row[] | null>(null);
  const [meta, setMeta] = useState<AdminListResult<Row>['meta'] | null>(null);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [paymentDetail, setPaymentDetail] = useState<Record<string, unknown> | null>(null);
  const [detailStatus, setDetailStatus] = useState<DetailStatus>('idle');
  const [userDetail, setUserDetail] = useState<Record<string, unknown> | null>(null);
  const [userDetailStatus, setUserDetailStatus] = useState<DetailStatus>('idle');
  const [userDetailError, setUserDetailError] = useState<string | null>(null);
  const [userDetailId, setUserDetailId] = useState<string | null>(null);
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
      setUserDetail(null);
      setUserDetailStatus('idle');
      setUserDetailError(null);
      setUserDetailId(null);
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

  const runAction: OnAction = (path, body, successAr, confirmAr) => {
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

  const loadUserDetail = (id: string) => {
    const version = ++detailVersion.current;
    setUserDetailId(id);
    setUserDetailStatus('loading');
    setUserDetail(null);
    setUserDetailError(null);
    void AdminApi.get<Record<string, unknown>>(`/admin/users/${id}`)
      .then((data) => {
        if (version !== detailVersion.current) return;
        setUserDetail(data);
        setUserDetailStatus('idle');
      })
      .catch((err: unknown) => {
        if (version !== detailVersion.current) return;
        setUserDetailError(err instanceof AdminApiError ? err.messageAr : 'تعذر تحميل تفاصيل المستخدم');
        setUserDetailStatus('error');
      });
  };

  const retryUserDetail = () => {
    if (userDetailId !== null) loadUserDetail(userDetailId);
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
                  <SkeletonRows cols={COLUMNS[tab].length} />
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
                            <td style={td} data-label={COLUMNS[tab][0]}>
                              <span style={mono} title={String(row.id)}>
                                {row.id.slice(0, 8)}…
                              </span>
                            </td>
                            <td style={td} data-label={COLUMNS[tab][1]}>
                              <RowSummary row={row} />
                            </td>
                            {COLUMNS[tab].length > 2 ? (
                              <td
                                style={{ ...td, whiteSpace: 'nowrap' }}
                                data-label={COLUMNS[tab][2]}
                              >
                                <Actions
                                  tab={tab}
                                  row={row}
                                  role={adminRole}
                                  onAction={runAction}
                                  onDetail={loadPaymentDetail}
                                  onUserDetail={loadUserDetail}
                                />
                              </td>
                            ) : null}
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

          {status === 'loaded' && tab === 'users' ? (
            <UserDetailPanel
              detailStatus={userDetailStatus}
              userDetail={userDetail}
              errorAr={userDetailError}
              onRetry={retryUserDetail}
            />
          ) : null}

          {status === 'loaded' && tab === 'payments' ? (
            <PaymentDetailPanel
              detailStatus={detailStatus}
              paymentDetail={paymentDetail}
              adminRole={adminRole}
            />
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
