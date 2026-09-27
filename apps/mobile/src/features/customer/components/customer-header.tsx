/**
 * Internal Customer header — the shared structural header for internal
 * (non-Home) Customer screens: Profile, Messages, Requests, Fault Guide,
 * Subscription.
 *
 * Deliberately photographic-free: hierarchy comes from typography,
 * spacing and shape on the existing navy surface, NOT from a decorative
 * scene image. Home keeps its promotional imagery.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type } from '@/ui/typography';

interface CustomerHeaderProps {
  /** Small gold context label (e.g. "حسابي"). */
  eyebrow?: string;
  /** Strong white page title. */
  title: string;
  /** Optional light supporting line. */
  body?: string;
}

export function CustomerHeader({ eyebrow, title, body }: CustomerHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing[5] }]}>
      {eyebrow !== undefined ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {body !== undefined ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: color.brand.navy,
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[6],
    gap: spacing[2],
    direction: 'rtl',
    borderBottomStartRadius: radius.xl,
    borderBottomEndRadius: radius.xl,
  },
  eyebrow: {
    ...type.label,
    color: color.brand.gold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  title: {
    ...type.h1,
    color: color.surface.base,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  body: {
    ...type.body,
    color: color.border.default,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
