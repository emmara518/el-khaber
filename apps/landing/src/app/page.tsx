import { color, spacing, typography } from '@khabir/ui-tokens';

/**
 * Landing bootstrap page. Real marketing content is added in later tasks.
 */
export default function LandingHome() {
  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: color.surface.base,
        padding: spacing[6],
      }}
    >
      <h1
        style={{
          color: color.brand.navy,
          fontSize: typography.size.display,
          fontWeight: typography.weight.semibold,
          margin: 0,
        }}
      >
        الخبير
      </h1>
      <p
        style={{
          color: color.text.secondary,
          fontSize: typography.size.body,
          marginTop: spacing[3],
        }}
      >
        Al-Khabir · premium home-appliance service platform · bootstrap
      </p>
    </main>
  );
}
