/**
 * Pure accessibility rule for icons, kept out of the RN component so it is
 * unit-testable without a renderer.
 *
 * An icon is decorative by default (it must not become a stray focus target
 * or a duplicate announcement). It only becomes its own accessibility element
 * when it carries an explicit label, unless a caller overrides explicitly.
 */
export function iconIsAccessible(
  accessibilityLabel: string | undefined,
  accessible: boolean | undefined,
): boolean {
  return accessible ?? accessibilityLabel !== undefined;
}
