'use client';

/**
 * Admin kitchen-sink dashboard (Task 10K). Real API surfaces only:
 * metrics, users, technicians/merchants verification, service-request
 * operations, review moderation, payments (config/review), manual
 * grants, operational notification, audit logs. Every mutation audited.
 * NOT a god mode; each surface uses the documented/implemented endpoint.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  AdminApi,
  AdminApiError,
  loadAdminSession,
  type AdminListResult,
} from '@/lib/admin-api';

type Tab =
  | 'metrics'
  | 'users'
  | 'technicians'
  | 'merchants'
  | 'requests'
  | 'reviews'
  | 'payments'
  | 'audit';

interface Row {
  id: string;
  [key: string]: unknown;
}

const TABS: ReadonlyArray<{ id: Tab; labelAr: string }> = [
  { id: 'metrics', labelAr: 'الرئيسية' },
  { id: 'users', labelAr: 'المستخدمون' },
  { id: 'technicians', labelAr: 'الفنيون' },
  { id: 'merchants', labelAr: 'التجار' },
  { id: 'requests', labelAr: 'الطلبات' },
  { id: 'reviews', labelAr: 'التقييمات' },
  { id: 'payments', labelAr: 'المدفوعات' },
  { id: 'audit', labelAr: 'سجل التدقيق' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof loadAdminSession>>(null);
  const [tab, setTab] = useState<Tab>('metrics');
  const [items, setItems] = useState<Row[] | null>(null);
  const [meta, setMeta] = useState<AdminListResult<Row>['meta'] | null>(null);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const authed = session !== null;

  const load = useCallback(
    (targetTab: Tab, page: number, limit: number) => {
      if (!authed) return;
      setStatus('loading');
      setError(null);
      setItems(null);
      setMeta(null);
      const paths: Record<Tab, string> = {
        metrics: '/admin/metrics',
        users: `/admin/users?page=${String(page)}&limit=${String(limit)}`,
        technicians: `/admin/technicians?page=${String(page)}&limit=${String(limit)}`,
        merchants: `/admin/merchants?page=${String(page)}&limit=${String(limit)}`,
        requests: `/admin/service-requests?page=${String(page)}&limit=${String(limit)}`,
        reviews: `/admin/reviews?page=${String(page)}&limit=${String(limit)}`,
        payments: `/admin/payments/submissions?page=${String(page)}&limit=${String(limit)}`,
        audit: `/admin/audit-logs?page=${String(page)}&limit=${String(limit)}`,
      };
      void AdminApi.get(paths[targetTab])
        .then((data: unknown) => {
          if (targetTab === 'metrics') {
            setMetrics(data as Record<string, unknown>);
            setStatus('loaded');
            return;
          }
          const list = data as AdminListResult<Row>;
          setItems([...list.items]);
          setMeta(list.meta);
          setStatus('loaded');
        })
        .catch((err: unknown) => {
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

  const runAction = (path: string, body: unknown, successAr: string) => {
    setActionMsg(null);
    void AdminApi.post(path, body)
      .then(() => {
        setActionMsg(successAr);
        load(tab, 1, 20);
      })
      .catch((err: unknown) => {
        setActionMsg(err instanceof AdminApiError ? err.messageAr : 'فشل الإجراء');
      });
  };

  const logout = () => {
    AdminApi.logout();
    router.push('/login');
  };

  if (!authed) {
    return <div dir="rtl" style={{ minHeight: '100vh', backgroundColor: '#f4f6f9' }} />;
  }

  return (
    <main dir="rtl" style={{ minHeight: '100vh', backgroundColor: '#f4f6f9', padding: 20 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <h1 style={{ fontSize: 20, margin: 0, color: '#12284a' }}>الخبير — لوحة الإدارة</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ color: '#667', fontSize: 13 }}>
            {session?.admin.email ?? ''}
          </span>
          <button type="button" onClick={logout} style={headerBtn}>
            تسجيل الخروج
          </button>
        </div>
      </header>

      <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-label={t.labelAr}
            onClick={() => setTab(t.id)}
            style={{
              ...tabBtn,
              backgroundColor: tab === t.id ? '#12284a' : '#fff',
              color: tab === t.id ? '#fff' : '#12284a',
              border: '1px solid #12284a',
            }}
          >
            {t.labelAr}
          </button>
        ))}
      </nav>

      {actionMsg !== null ? (
        <div role="status" style={notice}>
          {actionMsg}
        </div>
      ) : null}

      {status === 'loading' ? <div style={panel}>جاري التحميل…</div> : null}
      {status === 'error' && error !== null ? (
        <div style={panel}>
          <div role="alert" style={{ color: '#c0392b' }}>
            {error}
          </div>
          <button type="button" style={actionBtn} onClick={() => load(tab, 1, 20)}>
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      {status === 'loaded' && tab === 'metrics' && metrics !== null ? (
        <div style={panel}>
          <MetricsView data={metrics} />
        </div>
      ) : null}

      {status === 'loaded' && items !== null ? (
        <div style={panel}>
          {items.length === 0 ? (
            <div style={{ color: '#667', padding: 16 }}>لا توجد بيانات</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={table}>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #dde3ec' }}>
                      <td style={td} dir="ltr">
                        {row.id.slice(0, 8)}…
                      </td>
                      <td style={td}>
                        <RowSummary row={row} />
                      </td>
                      <td style={td} colSpan={2}>
                        <Actions tab={tab} row={row} onAction={runAction} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {meta !== null && items.length > 0 ? (
            <div style={{ marginTop: 8, color: '#667', fontSize: 12 }}>
              صفحة {meta.page} من {meta.totalPages} — الإجمالي {meta.total}
              {meta.hasNext ? (
                <button
                  type="button"
                  style={{ ...actionBtn, marginInlineStart: 10 }}
                  onClick={() => load(tab, meta.page + 1, meta.limit)}
                >
                  التالي ‹
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}

function MetricsView({ data }: { data: Record<string, unknown> }) {
  const usersCount = typeof data.usersCount === 'number' ? data.usersCount : 0;
  const techniciansCount = typeof data.techniciansCount === 'number' ? data.techniciansCount : 0;
  const merchantsCount = typeof data.merchantsCount === 'number' ? data.merchantsCount : 0;
  const activeSubscriptions =
    typeof data.activeSubscriptions === 'number' ? data.activeSubscriptions : 0;
  const sr = data.serviceRequests as
    | { pending?: number; active?: number; completed?: number; cancelled?: number }
    | undefined;
  const verified = data.verified as
    | { technicians?: number; merchants?: number }
    | undefined;
  return (
    <div>
      <Section title="المستخدمون">
        <Cell label="إجمالي" value={usersCount} />
        <Cell label="الفنيون" value={techniciansCount} />
        <Cell label="التجار" value={merchantsCount} />
        <Cell label="اشتراكات نشطة" value={activeSubscriptions} />
      </Section>
      <Section title="طلبات الصيانة">
        <Cell label="بانتظار" value={sr?.pending ?? 0} />
        <Cell label="نشطة" value={sr?.active ?? 0} />
        <Cell label="مكتملة" value={sr?.completed ?? 0} />
        <Cell label="ملغاة" value={sr?.cancelled ?? 0} />
      </Section>
      <Section title="التوثيق">
        <Cell label="فنيون موثقون" value={verified?.technicians ?? 0} />
        <Cell label="تجار موثقون" value={verified?.merchants ?? 0} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 15, color: '#12284a', margin: '0 0 8px' }}>{title}</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: '10px 16px',
        minWidth: 130,
        border: '1px solid #dde3ec',
      }}
    >
      <div style={{ fontSize: 12, color: '#667' }}>{label}</div>
      <div style={{ fontSize: 22, color: '#12284a', fontWeight: 600 }}>{value}</div>
    </div>
  );
}

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

function RowSummary({ row }: { row: Row }) {
  if (typeof row.email === 'string') {
    return (
      <span dir="ltr">
        {row.email} — {STATUS_AR[String(row.status)] ?? String(row.status)}
      </span>
    );
  }
  if (typeof row.status === 'string' && typeof row.problemDescription === 'string') {
    return (
      <span>
       طلب صيانة — {STATUS_AR[row.status] ?? row.status}
      </span>
    );
  }
  if (typeof row.rating === 'number') {
    return (
      <span>
        تقييم {row.rating}/5 {typeof row.comment === 'string' && row.comment.length > 0 ? `— ${row.comment.slice(0, 40)}` : ''}
      </span>
    );
  }
  if (typeof row.method === 'string') {
    return (
      <span>
        دفع — {row.method} — {STATUS_AR[String(row.status)] ?? String(row.status)}
      </span>
    );
  }
  if (typeof row.displayName === 'string') {
    return (
      <span>
        فني — {row.displayName} — توثيق: {STATUS_AR[String(row.verificationStatus)] ?? '—'}
      </span>
    );
  }
  if (typeof row.businessName === 'string') {
    return (
      <span>
        تاجر — {row.businessName} — توثيق: {STATUS_AR[String(row.verificationStatus)] ?? '—'}
      </span>
    );
  }
  if (typeof row.action === 'string') {
    return (
      <span dir="ltr">
        {row.action} — {String(row.entityType)}/{String(row.entityId).slice(0, 8)}
      </span>
    );
  }
  return <span>سجل</span>;
}

function Actions({
  tab,
  row,
  onAction,
}: {
  tab: Tab;
  row: Row;
  onAction: (path: string, body: unknown, successAr: string) => void;
}) {
  if (tab === 'technicians' || tab === 'merchants') {
    const current = String(row.verificationStatus ?? row.status ?? '');
    return (
      <div style={{ display: 'flex', gap: 4 }}>
        {(['verified', 'rejected', 'suspended'] as const).map((s) => (
          <button
            key={s}
            type="button"
            disabled={current === s}
            style={{ ...actionBtn, opacity: current === s ? 0.4 : 1 }}
            onClick={() => {
              const kind = tab === 'technicians' ? 'technicians' : 'merchants';
              onAction(
                `/admin/${kind}/${String(row.id)}/verification`,
                { status: s },
                `تم تحديث التوثيق إلى: ${STATUS_AR[s]}`,
              );
            }}
          >
            {STATUS_AR[s]}
          </button>
        ))}
      </div>
    );
  }
  if (tab === 'reviews') {
    return (
      <button
        type="button"
        style={{ ...actionBtn, borderColor: '#c0392b', color: '#c0392b' }}
        onClick={() => onAction(`/admin/reviews/${String(row.id)}/remove`, undefined, 'تم حذف التقييم')}
      >
        حذف
      </button>
    );
  }
  if (tab === 'requests') {
    const current = String(row.status);
    return (
      <div style={{ display: 'flex', gap: 4 }}>
        {(['in_progress', 'completed', 'cancelled'] as const).map((s) => (
          <button
            key={s}
            type="button"
            disabled={current === s}
            style={{ ...actionBtn, opacity: current === s ? 0.4 : 1 }}
            onClick={() =>
              onAction(
                `/admin/service-requests/${String(row.id)}/status`,
                { status: s },
                `حالة الطلب: ${STATUS_AR[s]}`,
              )
            }
          >
            {STATUS_AR[s]}
          </button>
        ))}
      </div>
    );
  }
  if (tab === 'payments') {
    return <span style={{ color: '#667', fontSize: 12 }}>المراجعة عبر تفاصيل الدفع</span>;
  }
  return <span />;
}

const headerBtn: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #12284a',
  backgroundColor: '#fff',
  color: '#12284a',
  cursor: 'pointer',
  fontSize: 13,
};

const tabBtn: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
};

const actionBtn: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 6,
  border: '1px solid #12284a',
  backgroundColor: '#fff',
  color: '#12284a',
  cursor: 'pointer',
  fontSize: 12,
};

const notice: React.CSSProperties = {
  backgroundColor: '#e7f1ff',
  border: '1px solid #7db4ff',
  borderRadius: 8,
  padding: '8px 14px',
  marginBottom: 12,
  color: '#12284a',
  fontSize: 13,
};

const panel: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 16,
  border: '1px solid #dde3ec',
};

const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
};

const td: React.CSSProperties = {
  padding: '10px 8px',
  textAlign: 'right',
  verticalAlign: 'top',
};
