import { color, spacing } from '@khabir/ui-tokens';


import { ROLE_AR, STATUS_AR } from '../constants';
import { formatDateAr, statusLabel } from '../helpers';

import type { Row } from '../types';

import { StatusBadge, mono } from '@/components/ui';

export function RowSummary({ row }: { row: Row }) {
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
        <span className="tabular" style={{ color: color.brand.goldInk }}>
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
    const when = formatDateAr(row.createdAt);
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
