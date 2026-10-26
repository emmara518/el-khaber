import { color, radius, spacing } from '@khabir/ui-tokens';
import { useEffect, useId, useRef, useState } from 'react';

import { ROLE_AR } from '../constants';
import { formInput, formLabel } from '../styles';

import type { Row } from '../types';

import { GhostBtn, HintText, StatusBadge } from '@/components/ui';
import { AdminApi, AdminApiError } from '@/lib/admin-api';

function userLabel(row: Row): string {
  const email = typeof row.email === 'string' && row.email.length > 0 ? row.email : null;
  const phone = typeof row.phone === 'string' && row.phone.length > 0 ? String(row.phone) : null;
  return email ?? phone ?? '—';
}

/**
 * Searchable user picker (email/phone) for admin forms. The raw id is kept in
 * component state only — admins never see or paste a UUID.
 */
export function UserPicker({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  hint?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorAr, setErrorAr] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const sequence = useRef(0);
  const inputId = useId();

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      setErrorAr(null);
      return;
    }
    const version = ++sequence.current;
    setLoading(true);
    setErrorAr(null);
    const timer = setTimeout(() => {
      AdminApi.list<Row>(`/admin/users?q=${encodeURIComponent(term)}&page=1&limit=8`)
        .then((list) => {
          if (version !== sequence.current) return;
          setResults([...list.items]);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (version !== sequence.current) return;
          setErrorAr(err instanceof AdminApiError ? err.messageAr : 'تعذر البحث');
          setLoading(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  if (value.length > 0) {
    return (
      <div>
        <span style={formLabel}>{label}</span>
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
          <span dir="ltr" style={{ flex: 1, fontSize: 13.5, wordBreak: 'break-all' }}>
            {selectedLabel ?? 'مستخدم محدد'}
          </span>
          <GhostBtn
            onClick={() => {
              onChange('');
              setSelectedLabel(null);
              setQuery('');
              setResults([]);
            }}
          >
            تغيير
          </GhostBtn>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label style={formLabel} htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        type="search"
        dir="auto"
        style={formInput}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="ابحث بالبريد الإلكتروني أو رقم الجوال…"
      />
      {hint !== undefined ? <HintText>{hint}</HintText> : null}
      {loading ? <HintText>جارٍ البحث…</HintText> : null}
      {errorAr !== null ? <HintText>{errorAr}</HintText> : null}
      {!loading && errorAr === null && query.trim().length >= 2 && results.length === 0 ? (
        <HintText>لا توجد نتائج مطابقة.</HintText>
      ) : null}
      {results.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            border: `1px solid ${color.border.default}`,
            borderRadius: radius.sm,
            overflow: 'hidden',
            marginTop: spacing[1],
          }}
        >
          {results.map((row) => {
            const role = typeof row.role === 'string' ? row.role : null;
            const phone =
              typeof row.phone === 'string' && row.phone.length > 0 ? String(row.phone) : null;
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => {
                  setSelectedLabel(userLabel(row));
                  onChange(String(row.id));
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
                <span dir="ltr" style={{ flex: 1, wordBreak: 'break-all' }}>
                  {userLabel(row)}
                </span>
                {phone !== null ? (
                  <span dir="ltr" style={{ color: color.text.secondary, fontSize: 12 }}>
                    {phone}
                  </span>
                ) : null}
                {role !== null ? <StatusBadge label={ROLE_AR[role] ?? role} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
