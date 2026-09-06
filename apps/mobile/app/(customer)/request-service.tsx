/**
 * Deferred service-request handoff (Batch C → owned by Batch D).
 *
 * The profile "اطلب خدمة" CTA lands here with
 * `?technicianId=&appliance=&symptomId=`. This screen preserves and
 * displays that context, states that the full request form arrives
 * next, and exits cleanly. It creates NO request and fakes NOTHING.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSafeBack } from '../../src/features/customer/components/use-safe-back';
import { MockTechnicianDataSource } from '../../src/features/customer/discovery/mock-technician-data-source';
import { findTechnician } from '../../src/features/customer/discovery/technician-types';
import { MockFaultGuideDataSource } from '../../src/features/customer/fault-guide/mock-fault-guide-data-source';
import { useI18n } from '../../src/i18n/use-i18n';
import { Card } from '../../src/ui/card';

export default function RequestServiceRoute() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ technicianId?: string; appliance?: string; symptomId?: string }>();
  const technicianId = typeof params.technicianId === 'string' ? params.technicianId : '';
  const symptomId = typeof params.symptomId === 'string' ? params.symptomId : '';

  const [technicianName, setTechnicianName] = useState<string | null>(null);
  const [context, setContext] = useState<string | null>(null);
  const safeBack = useSafeBack('/(customer)/find-technician');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const techs = await new MockTechnicianDataSource().getTechnicians({ role: 'customer' });
        if (cancelled) return;
        const tech = findTechnician(techs, technicianId);
        if (tech) setTechnicianName(tech.nameAr);
        if (symptomId.length > 0) {
          const guide = await new MockFaultGuideDataSource().getGuide({ role: 'customer' });
          if (cancelled) return;
          const symptom = guide.symptoms.find((s) => s.id === symptomId);
          if (symptom) {
            const applianceTitle =
              guide.appliances.find((a) => a.slug === symptom.applianceSlug)?.titleAr ?? '';
            setContext(`${applianceTitle} — ${symptom.titleAr}`);
          }
        }
      } catch {
        // Names are a nicety; the handoff message stands alone.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [technicianId, symptomId]);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('discovery.handoff.title')}
      </Text>
      <Card background={color.surface.base} padded style={styles.card}>
        <Text style={styles.emoji}>📝</Text>
        <Text style={styles.body}>{t('discovery.handoff.body')}</Text>
        {technicianName !== null ? (
          <View style={styles.context}>
            <Text style={styles.contextLabel}>{t('discovery.handoff.technician')}</Text>
            <Text style={styles.contextValue}>{technicianName}</Text>
          </View>
        ) : null}
        {context !== null ? (
          <View style={styles.context}>
            <Text style={styles.contextLabel}>{t('discovery.handoff.context')}</Text>
            <Text style={styles.contextValue}>{context}</Text>
          </View>
        ) : null}
      </Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('discovery.handoff.backToProfile')}
        onPress={safeBack}
        style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
      >
        <Text style={styles.primaryText}>{t('discovery.handoff.backToProfile')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('discovery.handoff.backToSearch')}
        onPress={() => router.replace('/(customer)/find-technician')}
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryText}>{t('discovery.handoff.backToSearch')}</Text>
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
