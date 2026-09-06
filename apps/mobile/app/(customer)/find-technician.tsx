/**
 * Deferred technician-search entry (Batch B → replaced in Batch C).
 *
 * The Fault Guide "ابحث عن فني" CTA lands here with the selected
 * `symptomId`. This screen preserves that context, states clearly
 * that technician search arrives next, and offers typed exits back
 * to the guide and home. No dead interaction, no invented search.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MockFaultGuideDataSource } from '../../src/features/customer/fault-guide/mock-fault-guide-data-source';
import { useI18n } from '../../src/i18n/use-i18n';
import { Card } from '../../src/ui/card';

export default function FindTechnicianRoute() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ symptomId?: string }>();
  const symptomId = typeof params.symptomId === 'string' ? params.symptomId : '';
  const [context, setContext] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    new MockFaultGuideDataSource()
      .getGuide({ role: 'customer' })
      .then((guide) => {
        if (cancelled || symptomId.length === 0) return;
        const symptom = guide.symptoms.find((s) => s.id === symptomId);
        if (!symptom) return;
        const applianceTitle =
          guide.appliances.find((a) => a.slug === symptom.applianceSlug)?.titleAr ?? '';
        setContext(`${applianceTitle} — ${symptom.titleAr}`);
      })
      .catch(() => {
        // Context is a nicety; the deferred message stands alone.
      });
    return () => {
      cancelled = true;
    };
  }, [symptomId]);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('fault.deferred.title')}
      </Text>
      <Card background={color.surface.base} padded style={styles.card}>
        <Text style={styles.emoji}>🔍</Text>
        <Text style={styles.body}>{t('fault.deferred.body')}</Text>
        {context !== null ? (
          <View style={styles.context}>
            <Text style={styles.contextLabel}>{t('fault.deferred.context')}</Text>
            <Text style={styles.contextValue}>{context}</Text>
          </View>
        ) : null}
      </Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('fault.deferred.backToGuide')}
        onPress={() => router.back()}
        style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
      >
        <Text style={styles.primaryText}>{t('fault.deferred.backToGuide')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('fault.deferred.backToHome')}
        onPress={() => router.replace('/(customer)')}
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryText}>{t('fault.deferred.backToHome')}</Text>
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
  context: {
    marginTop: spacing[2],
    backgroundColor: color.surface.subtle,
    borderRadius: radius.md,
    padding: spacing[3],
    width: '100%',
  },
  contextLabel: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    textAlign: 'right',
  },
  contextValue: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
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
  secondary: {
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    borderRadius: radius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[3],
  },
  secondaryText: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
});
