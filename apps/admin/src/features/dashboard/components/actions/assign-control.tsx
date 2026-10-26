import { color, radius, spacing } from '@khabir/ui-tokens';
import { useEffect, useRef, useState } from 'react';

import { formInput, formLabel } from '../../styles';

import type { OnAction, Row } from '../../types';

import { GhostBtn, HintText } from '@/components/ui';
import { AdminApi, AdminApiError } from '@/lib/admin-api';

/**
 * WP-Admin-03 (exception path): admin assignment. The normal flow is the
 * customer's request being accepted by a technician in the mobile app;
 * this control exists only for operational recovery. Search by name/email/
 * phone — the raw id stays internal (manual entry is an advanced fallback).
 */
export function AssignControl({
  requestId,
  onAction,
}: {
  requestId: string;
  onAction: OnAction;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(null);
  const [manualId, setManualId] = useState('');
  const sequence = useRef(0);

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      setLoadError(null);
      return;
    }
    const version = ++sequence.current;
    setLoading(true);
    setLoadError(null);
    const timer = setTimeout(() => {
      AdminApi.list<Row>(
        `/admin/technicians?verification_status=verified&q=${encodeURIComponent(term)}&page=1&limit=20`,
      )
        .then((list) => {
          if (version !== sequence.current) return;
          setResults([...list.items]);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (version !== sequence.current) return;
          setLoadError(err instanceof AdminApiError ? err.messageAr : 'تعذر البحث');
          setLoading(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [open, query]);

  const chosenId = manualId.trim().length > 0 ? manualId.trim() : (selected?.id ?? '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
      <GhostBtn
        onClick={() => {
          setOpen(!open);
          setQuery('');
          setResults([]);
          setLoadError(null);
        }}
      >
        {open ? 'إخفاء الإسناد' : 'إسناد استثنائي'}
      </GhostBtn>
      {open ? (
        <>
          <HintText>
            الإسناد يتم عادةً عندما يقبل الفني الطلب من تطبيقه. استخدم هذا الخيار عند تعذر ذلك أو
            لتصحيح إداري.
          </HintText>
          {selected !== null ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
                border: `1px solid ${color.border.default}`,
                borderRadius: radius.sm,
                padding: `8px ${spacing[3]}`,
                backgroundColor: color.surface.subtle,
              }}
            >
              <span style={{ flex: 1, fontSize: 13.5 }}>{selected.label}</span>
              <GhostBtn
                onClick={() => {
                  setSelected(null);
                  setQuery('');
                }}
              >
                تغيير
              </GhostBtn>
            </div>
          ) : (
            <>
              <label style={formLabel} htmlFor={`assign-search-${requestId}`}>
                ابحث عن الفني الموثق
              </label>
              <input
                id={`assign-search-${requestId}`}
                type="search"
                dir="auto"
                style={formInput}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث بالاسم أو البريد أو الجوال…"
              />
              {loading ? <HintText>جارٍ البحث…</HintText> : null}
              {loadError !== null ? <HintText>{loadError}</HintText> : null}
              {!loading && loadError === null && query.trim().length >= 2 && results.length === 0 ? (
                <HintText>لا يوجد فني موثق مطابق.</HintText>
              ) : null}
              {results.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    border: `1px solid ${color.border.default}`,
                    borderRadius: radius.sm,
                    overflow: 'hidden',
                  }}
                >
                  {results.map((row) => {
                    const user = (row.user ?? {}) as Record<string, unknown>;
                    const email = typeof user.email === 'string' ? user.email : null;
                    const phone = typeof user.phone === 'string' ? String(user.phone) : null;
                    const name =
                      typeof row.displayName === 'string' && row.displayName.length > 0
                        ? row.displayName
                        : (email ?? 'فني');
                    const label = `${name}${email !== null ? ` · ${email}` : ''}`;
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => {
                          setSelected({ id: String(row.id), label });
                          setQuery('');
                          setResults([]);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing[2],
                          padding: `9px ${spacing[3]}`,
                          border: 'none',
                          borderBottom: `1px solid ${color.border.default}`,
                          backgroundColor: color.surface.base,
                          cursor: 'pointer',
                          textAlign: 'right',
                          fontFamily: 'inherit',
                          fontSize: 13.5,
                          color: color.text.primary,
                        }}
                      >
                        <span style={{ flex: 1 }}>
                          {name}
                          {email !== null ? (
                            <span
                              dir="ltr"
                              style={{ color: color.text.secondary, fontSize: 12, marginInlineStart: 6 }}
                            >
                              {email}
                            </span>
                          ) : null}
                        </span>
                        {phone !== null ? (
                          <span dir="ltr" style={{ color: color.text.secondary, fontSize: 12 }}>
                            {phone}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </>
          )}
          <details>
            <summary
              style={{
                cursor: 'pointer',
                fontSize: 12.5,
                color: color.text.secondary,
                margin: `${spacing[1]}px 0`,
              }}
            >
              خيارات متقدمة: إدخال معرّف الفني يدويًا
            </summary>
            <label style={formLabel} htmlFor={`assign-manual-${requestId}`}>
              معرّف الفني (UUID)
            </label>
            <input
              id={`assign-manual-${requestId}`}
              dir="ltr"
              style={formInput}
              value={manualId}
              onChange={(event) => setManualId(event.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </details>
          <GhostBtn
            disabled={chosenId.length === 0}
            onClick={() =>
              onAction(
                `/admin/service-requests/${requestId}/assign`,
                { technician_id: chosenId },
                'تم تعيين الفني للطلب',
                'تأكيد إسناد الطلب للفني المحدد؟ سيُعلَم الطرفان.',
              )
            }
          >
            تأكيد الإسناد
          </GhostBtn>
          <HintText>يتحقق الخادم من أن الفني موثق قبل إتمام الإسناد.</HintText>
        </>
      ) : null}
    </div>
  );
}
