/**
 * M-D deferred Add-Product handoff (M-C creates nothing).
 * The catalog "إضافة منتج" CTA lands here with `?deferred=1`;
 * this screen preserves the intent, states that product creation
 * arrives next, and exits cleanly. NO form, NO fake creation.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { useI18n } from '../../../src/i18n/use-i18n';
import { Card } from '../../../src/ui/card';

export default function NewProductRoute() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('merchant.newProduct.title')}
      </Text>
      <Card background={color.surface.base} padded style={styles.card}>
        <Text style={styles.emoji}>➕</Text>
        <Text style={styles.body}>{t('merchant.newProduct.body')}</Text>
      </Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('merchant.newProduct.backToCatalog')}
        onPress={() => router.replace('/(merchant)/products')}
        style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
      >
        <Text style={styles.primaryText}>{t('merchant.newProduct.backToCatalog')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
  },
  title: {
    color: color.text.primary,
    fontSize: typography.size.h2,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: spacing[4],
  },
  card: {
    alignItems: 'center',
    gap: spacing[2],
  },
  emoji: {
    fontSize: 48,
  },
  body: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 26,
  },
  primary: {
    backgroundColor: color.brand.navy,
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
  },
  pressed: {
    opacity: 0.85,
  },
  primaryText: {
    color: color.surface.base,
    fontSize: typography.size.button,
    fontWeight: typography.weight.semibold,
  },
});
