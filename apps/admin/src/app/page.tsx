import { color, radius, spacing, typography } from '@khabir/ui-tokens';

import { IconShieldCheck } from '@/components/icon';

/**
 * Admin bootstrap page. The operational console lives at `/dashboard`
 * (login at `/login`); this entry point links there.
 */
export default function AdminHome() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color.surface.subtle,
        padding: spacing[6],
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: radius.md,
            backgroundColor: color.brand.navy,
            color: color.brand.gold,
            boxShadow: `0 4px 12px rgba(11, 31, 58, 0.12)`,
            marginBottom: spacing[4],
          }}
        >
          <IconShieldCheck size={30} />
        </span>
        <h1
          style={{
            color: color.text.primary,
            fontSize: typography.size.h1,
            fontWeight: Number(typography.weight.semibold) as 600,
            margin: 0,
          }}
        >
          الخبير — Admin
        </h1>
        <p
          style={{
            color: color.text.secondary,
            fontSize: typography.size.caption,
            marginTop: spacing[2],
          }}
        >
          Al-Khabir admin dashboard
        </p>
        <a
          href="/login"
          style={{
            display: 'inline-block',
            marginTop: spacing[5],
            padding: '12px 28px',
            backgroundColor: color.brand.navy,
            color: '#fff',
            borderRadius: radius.sm,
            fontSize: typography.size.button,
            fontWeight: Number(typography.weight.medium) as 500,
            textDecoration: 'none',
            boxShadow: `0 4px 12px rgba(11, 31, 58, 0.1)`,
          }}
        >
          تسجيل الدخول
        </a>
      </div>
    </main>
  );
}
