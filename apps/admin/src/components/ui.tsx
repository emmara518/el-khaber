'use client';

/**
 * Small shared admin primitives built on @khabir/ui-tokens.
 * Status badges, buttons, pagination, table states. No duplicate
 * foundations — inline styles + tokens only, matching this app.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useEffect, useId, useRef } from 'react';

import {
  IconAlert,
  IconChevronLeft,
  IconChevronRight,
  IconInbox,
  IconRefresh,
} from './icon';

import type { CSSProperties, ReactNode, Ref } from 'react';

/* ------------------------------------------------------------------ */
/* Status badge                                                        */
/* ------------------------------------------------------------------ */

type BadgeTone = 'success' | 'error' | 'warning' | 'neutral' | 'info';

const BADGE_TONES: Record<BadgeTone, string> = {
  success: color.success.soft,
  error: color.error.soft,
  warning: color.brand.goldSoft,
  neutral: color.surface.subtle,
  info: `color-mix(in srgb, ${color.brand.navy} 7%, ${color.surface.base})`,
};

export function badgeTone(statusAr: string): BadgeTone {
  if (['مقبول', 'مكتمل', 'موثق', 'نشط'].includes(statusAr)) return 'success';
  if (['مرفوض', 'موقوف', 'ملغي', 'محذوف'].includes(statusAr)) return 'error';
  if (['بانتظار', 'في الطريق', 'قيد التنفيذ'].includes(statusAr)) return 'warning';
  if (['عميل', 'فني', 'تاجر'].includes(statusAr)) return 'info';
  return 'neutral';
}

export function StatusBadge({ label }: { label: string }) {
  const tone = BADGE_TONES[badgeTone(label)];
  return (
    <span
      className="status-badge"
      style={{
        display: 'inline-block',
        padding: `${spacing[1]}px ${spacing[3]}px`,
        borderRadius: radius.pill,
        backgroundColor: tone,
        color: color.brand.navy,
        border: `1px solid color-mix(in srgb, ${color.brand.navy} 12%, ${tone})`,
        lineHeight: 1.6,
        fontSize: 12,
        fontWeight: Number(typography.weight.medium) as 500,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

export const btnBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: spacing[2],
  borderRadius: radius.sm,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: Number(typography.weight.medium) as 500,
  transition: 'background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
  fontFamily: 'inherit',
  lineHeight: 1.6,
  minHeight: 44,
  boxSizing: 'border-box',
};

export function GhostBtn({
  children,
  onClick,
  danger,
  disabled,
  title,
  buttonRef,
}: {
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={danger ? 'ghost-btn ghost-btn-danger' : 'ghost-btn'}
      style={{
        ...btnBase,
        padding: '6px 12px',
        backgroundColor: danger ? color.error.soft : color.surface.base,
        color: color.brand.navy,
        border: `1px solid ${danger ? color.error.DEFAULT : color.border.default}`,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

export function SolidBtn({
  children,
  onClick,
  disabled,
  submitting,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  submitting?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || submitting}
      aria-busy={submitting || undefined}
      onClick={onClick}
      className="solid-btn"
      style={{
        ...btnBase,
        padding: '10px 20px',
        backgroundColor: color.brand.navy,
        color: '#fff',
        border: 'none',
        boxShadow: disabled || submitting ? 'none' : `0 2px 8px rgba(11, 31, 58, 0.25)`,
        opacity: disabled || submitting ? 0.6 : 1,
        cursor: disabled || submitting ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Panel / sections                                                    */
/* ------------------------------------------------------------------ */

export function Panel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="panel"
      style={{
        backgroundColor: color.surface.base,
        borderRadius: radius.md,
        padding: spacing[6],
        minWidth: 0,
        border: `1px solid ${color.border.default}`,
        boxShadow: `0 1px 3px rgba(11, 31, 58, 0.05), 0 4px 14px rgba(11, 31, 58, 0.05)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 16,
        fontWeight: Number(typography.weight.semibold) as 600,
        color: color.text.primary,
        margin: `0 0 ${spacing[3]}px`,
      }}
    >
      {children}
    </h2>
  );
}

export function HintText({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        color: color.text.secondary,
        fontSize: 12.5,
        marginBottom: spacing[3],
        lineHeight: 1.7,
      }}
    >
      {children}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || dialog === null) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    cancelRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      dir="rtl"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={busy || undefined}
      className="confirm-dialog"
      style={{
        border: `1px solid ${color.border.default}`,
        borderRadius: radius.lg,
        padding: 0,
        backgroundColor: color.surface.base,
        color: color.text.primary,
        maxWidth: 420,
        width: 'calc(100% - 32px)',
        boxShadow: '0 12px 40px rgba(6, 23, 45, 0.25)',
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          padding: `${spacing[5]}px ${spacing[6]}px ${spacing[4]}px`,
        }}
      >
        <h3
          id={titleId}
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: Number(typography.weight.semibold) as 600,
            color: color.text.primary,
          }}
        >
          {title}
        </h3>
        <p
          id={descriptionId}
          style={{
            margin: `${spacing[2]}px 0 0`,
            fontSize: 13.5,
            lineHeight: 1.8,
            color: color.text.secondary,
          }}
        >
          {description}
        </p>
      </div>
      <footer
        className="dialog-footer dialog-actions"
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          gap: spacing[2],
          padding: `${spacing[3]}px ${spacing[6]}px ${spacing[5]}px`,
          borderTop: `1px solid ${color.border.default}`,
        }}
      >
        <GhostBtn buttonRef={cancelRef} onClick={() => { if (!busy) onClose(); }}>
          إلغاء
        </GhostBtn>
        <SolidBtn submitting={busy} onClick={() => { if (!busy) onConfirm(); }}>
          {busy ? 'جارٍ التنفيذ…' : 'تأكيد'}
        </SolidBtn>
      </footer>
    </dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Table states                                                        */
/* ------------------------------------------------------------------ */

export function SkeletonRows({ rows = 6, cols = 3 }: { rows?: number; cols?: number }) {
  return (
    <tbody aria-busy="true" aria-label="جارٍ تحميل البيانات">
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} aria-hidden="true">
          {Array.from({ length: cols }, (_, c) => (
            <td key={c} style={td}>
              <div className="skeleton" style={{ width: c === 0 ? '55%' : '80%' }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ padding: `${spacing[8]}px ${spacing[4]}px`, textAlign: 'center' }}>
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 52,
          height: 52,
          borderRadius: '50%',
          backgroundColor: color.brand.goldSoft,
          color: color.brand.navy,
          marginBottom: spacing[3],
        }}
      >
        <IconInbox size={24} />
      </span>
      <div style={{ color: color.text.primary, fontWeight: Number(typography.weight.medium) as 500 }}>
        {title}
      </div>
      {hint !== undefined ? (
        <div style={{ color: color.text.secondary, fontSize: 13, marginTop: spacing[2] }}>{hint}</div>
      ) : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[3],
        padding: spacing[4],
        backgroundColor: color.error.soft,
        borderRadius: radius.sm,
        color: color.brand.navy,
      }}
    >
      <IconAlert size={18} />
      <span style={{ flex: 1, fontSize: 13.5 }}>{message}</span>
      <GhostBtn onClick={onRetry}>
        <IconRefresh size={14} />
        إعادة المحاولة
      </GhostBtn>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pagination (RTL: next = chevron-left, prev = chevron-right)          */
/* ------------------------------------------------------------------ */

export function Pagination({
  page,
  totalPages,
  total,
  onGo,
}: {
  page: number;
  totalPages: number;
  total: number;
  onGo: (page: number) => void;
}) {
  return (
    <nav
      aria-label="التنقل بين الصفحات"
      className="pagination"
      style={{
        marginTop: spacing[3],
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing[2],
        color: color.text.secondary,
        fontSize: 12.5,
      }}
    >
      <span className="tabular" role="status" aria-atomic="true">
        صفحة {page} من {totalPages} · {total} سجل
      </span>
      <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
        <GhostBtn disabled={page <= 1} onClick={() => onGo(page - 1)} title="السابق">
          <IconChevronRight size={14} />
          السابق
        </GhostBtn>
        <GhostBtn disabled={page >= totalPages} onClick={() => onGo(page + 1)} title="التالي">
          التالي
          <IconChevronLeft size={14} />
        </GhostBtn>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Shared table cell styles                                            */
/* ------------------------------------------------------------------ */

export const th: CSSProperties = {
  padding: '10px 12px',
  textAlign: 'right',
  fontSize: 12,
  fontWeight: Number(typography.weight.medium) as 500,
  color: color.text.secondary,
  borderBottom: `1px solid ${color.border.default}`,
  borderTop: `1px solid ${color.border.default}`,
  whiteSpace: 'nowrap',
};

export const td: CSSProperties = {
  padding: '12px',
  textAlign: 'right',
  verticalAlign: 'middle',
  fontSize: 13.5,
  color: color.text.primary,
  borderBottom: `1px solid ${color.border.default}`,
};

export const mono: CSSProperties = {
  fontFamily: 'ui-monospace, Cascadia Mono, Consolas, Segoe UI, Tahoma, system-ui, monospace',
  fontSize: 12.5,
  color: color.text.secondary,
  direction: 'ltr',
  unicodeBidi: 'embed',
};
