/**
 * PageTitle — the shared structural page heading used below the navy
 * AppHeader on internal screens (Customer / Technician / Merchant).
 * No photography: hierarchy comes from typography + spacing.
 */

import { color, spacing } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { type } from './typography';

interface PageTitleProps {
  eyebrow?: string;
  title: string;
  body?: string;
}

export function PageTitle({ eyebrow, title, body }: PageTitleProps) {
  return (
    <View style={styles.root}>
      {eyebrow !== undefined ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {body !== undefined ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing[1], direction: 'rtl' },
  eyebrow: { ...type.label, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  title: { ...type.h1, color: color.brand.navy, textAlign: 'right', writingDirection: 'rtl' },
  body: { ...type.body, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
});
