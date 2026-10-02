/**
 * Auth screen shell.
 *
 * Navy hero (brand identity, matching the Customer wordmark treatment) +
 * white body card. Centers content at max 480px so 320–430px viewports
 * all render without overflow. All body text defaults to right-aligned
 * Arabic.
 *
 * Optional, backward-compatible extras:
 *  - `onBack`        renders a back control in the navy hero.
 *  - `centerHeading` centres the title/subtitle (used by Registration,
 *                    whose intro is a centred heading per the reference).
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ReactNode } from 'react';

import { Icon } from '@/ui/icon';
import { type } from '@/ui/typography';


interface AuthScreenProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Accessibility label for the screen heading. Defaults to title. */
  headingLabel?: string;
  /** Optional back control rendered inside the navy hero. */
  onBack?: () => void;
  /** Centre the title/subtitle instead of right-aligning them. */
  centerHeading?: boolean;
}

export function AuthScreen({
  title,
  subtitle,
  children,
  headingLabel,
  onBack,
  centerHeading = false,
}: AuthScreenProps) {
  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.heroSafe}>
        <View style={styles.hero}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="رجوع"
              onPress={onBack}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            >
              <Icon name="chevron-left" size={24} color={color.surface.base} />
            </Pressable>
          ) : null}
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
          <Text
            accessibilityRole="header"
            style={[styles.title, centerHeading && styles.headingCentered]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, centerHeading && styles.headingCentered]}>{subtitle}</Text>
          ) : null}
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
  back: {
    position: 'absolute',
    top: spacing[4],
    end: spacing[4],
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  brand: {
    ...type.display,
    color: color.surface.base,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  tagline: {
    ...type.body,
    color: color.brand.goldSoft,
    marginTop: spacing[2],
    textAlign: 'center',
    writingDirection: 'rtl',
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
  headingCentered: {
    textAlign: 'center',
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
