import { color, spacing, typography } from '@khabir/ui-tokens';

/**
 * Admin bootstrap page. The operational console lives at `/dashboard`
 * (login at `/login`); this entry point links there.
 */
export default function AdminHome() {
  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: color.surface.subtle,
        padding: spacing[6],
      }}
    >
      <h1
        style={{
          color: color.brand.navy,
          fontSize: typography.size.h1,
          fontWeight: typography.weight.semibold,
          margin: 0,
        }}
      >
        الخبير — Admin
      </h1>
      <p
        style={{
          color: color.text.secondary,
          fontSize: typography.size.body,
          marginTop: spacing[2],
        }}
      >
        Al-Khabir admin dashboard · <a href="/login">تسجيل الدخول</a>
      </p>
    </main>
  );
}
