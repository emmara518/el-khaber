
import { useEffect, useId, useState } from 'react';

import { formInput, formLabel } from '../styles';

import type { Row } from '../types';

import { HintText } from '@/components/ui';
import { AdminApi, AdminApiError } from '@/lib/admin-api';

/**
 * Catalog-backed select (plans/entitlements). Labels come from the server;
 * the id stays internal so admins pick names, never UUIDs.
 */
export function CatalogSelect({
  label,
  path,
  value,
  onChange,
  formatOption,
  emptyLabel,
}: {
  label: string;
  path: string;
  value: string;
  onChange: (id: string) => void;
  formatOption: (row: Row) => string;
  emptyLabel: string;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [errorAr, setErrorAr] = useState<string | null>(null);
  const selectId = useId();

  useEffect(() => {
    let active = true;
    AdminApi.get<Row[]>(path)
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((err: unknown) => {
        if (active) setErrorAr(err instanceof AdminApiError ? err.messageAr : 'تعذر التحميل');
      });
    return () => {
      active = false;
    };
  }, [path]);

  return (
    <div>
      <label style={formLabel} htmlFor={selectId}>
        {label}
      </label>
      {rows === null && errorAr === null ? <HintText>جارٍ تحميل الخيارات…</HintText> : null}
      {errorAr !== null ? <HintText>{errorAr}</HintText> : null}
      {rows !== null ? (
        <select
          id={selectId}
          style={formInput}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{emptyLabel}</option>
          {rows.map((row) => (
            <option key={String(row.id)} value={String(row.id)}>
              {formatOption(row)}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
