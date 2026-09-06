/**
 * Verification badge — platform trust marker.
 *
 * Copy is deliberately restrained: "موثّق من الخبير" with the
 * meaning "تم التحقق من الهوية والخبرة". It never implies
 * government accreditation or guaranteed quality. Verified and
 * unverified states differ in icon + text, never color alone.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

export function VerificationBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <View
        accessibilityRole="text"
        accessibilityLabel="موثّق من الخبير: تم التحقق من الهوية والخبرة"
        style={[styles.badge, styles.verified]}
      >
        <Text style={[styles.icon, styles.verifiedText]}>✓</Text>
        <Text style={[styles.label, styles.verifiedText]}>موثّق من الخبير</Text>
      </View>
    );
  }
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel="لم يتم توثيقه بعد"
      style={[styles.badge, styles.unverified]}
    >
      <Text style={[styles.icon, styles.unverifiedText]}>○</Text>
      <Text style={[styles.label, styles.unverifiedText]}>لم يتم توثيقه بعد</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    gap: spacing[1],
  },
  verified: {
    backgroundColor: color.success.soft,
  },
  unverified: {
    backgroundColor: color.surface.subtle,
    borderWidth: 1,
    borderColor: color.border.default,
  },
  icon: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
  },
  label: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  verifiedText: {
    color: color.success.DEFAULT,
  },
  unverifiedText: {
    color: color.text.secondary,
  },
});
