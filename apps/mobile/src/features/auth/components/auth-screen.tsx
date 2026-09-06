/**
 * Auth screen shell.
 *
 * Navy hero (brand identity, matches the Customer Home hero) + white
 * body card. Centers content at max 480px so 320–430px viewports all
 * render without overflow. All text defaults to right-aligned Arabic.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ReactNode } from 'react';

interface AuthScreenProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Accessibility label for the screen heading. Defaults to title. */
  headingLabel?: string;
}

export function AuthScreen({ title, subtitle, children, headingLabel }: AuthScreenProps) {
  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.heroSafe}>
        <View style={styles.hero}>
          <Text
            accessibilityRole="header"
            accessibilityLabel={headingLabel ?? title}
            style={styles.brand}
          >
            الخبير
          </Text>
          <Text style={styles.tagline}>صيانة موثوقة لأجهزتك المنزلية</Text>
        </View>
      </SafeAreaView>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.body}>{children}</View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.surface.subtle,
  },
  heroSafe: {
    backgroundColor: color.brand.navy,
  },
  hero: {
    backgroundColor: color.brand.navy,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
    alignItems: 'center',
  },
  brand: {
    color: color.surface.base,
    fontSize: typography.size.h1,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
  },
  tagline: {
    color: color.brand.goldSoft,
    fontSize: typography.size.body,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4] * -1,
    paddingBottom: spacing[8],
  },
  card: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: color.surface.base,
    borderColor: color.border.default,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[5],
    marginTop: spacing[4] * -1,
  },
  title: {
    color: color.text.primary,
    fontSize: typography.size.h2,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    marginTop: spacing[2],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  body: {
    marginTop: spacing[5],
    gap: spacing[4],
  },
});
