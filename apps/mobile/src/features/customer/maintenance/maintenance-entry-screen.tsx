/**
 * Customer Maintenance entry screen (Batch A).
 *
 * Appliance picker (3 locked categories) + how-it-works steps +
 * popular symptom teasers filtered inline by the selected appliance.
 * Selection never relies on color alone (border weight + "محدد"
 * suffix in the accessible label). The full diagnostic drill-down
 * ships in Batch B; this screen makes no diagnostic claims.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ListEmpty, ListError, ListLoading } from '../components/list-state-view';

import { issuesForAppliance, type MaintenanceAppliance } from './maintenance-entry-types';
import { useMaintenanceEntryViewModel } from './use-maintenance-entry-view-model';

import type { ApplianceSlug } from '../home/data/customer-home-types';

import { useI18n } from '@/i18n/use-i18n';
import { Card, SectionHeader } from '@/ui';


export default function MaintenanceEntryScreen() {
  const { t } = useI18n();
  const { status, data, error, retry } = useMaintenanceEntryViewModel();
  const [selected, setSelected] = useState<ApplianceSlug | null>(null);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('maintenance.title')}
      </Text>
      <Text style={styles.subtitle}>{t('maintenance.subtitle')}</Text>

      {status === 'loading' ? <ListLoading label={t('state.loading')} /> : null}
      {status === 'error' ? (
        <ListError
          title={t('requests.error.title')}
          message={error?.message ?? ''}
          retryLabel={t('state.retry')}
          onRetry={retry}
        />
      ) : null}
      {status === 'loaded' && data ? (
        <>
          <SectionHeader titleKey="maintenance.appliances" />
          <View accessibilityRole="radiogroup" accessibilityLabel={t('maintenance.appliances')} style={styles.appliances}>
            {data.appliances.map((appliance) => {
              const isSelected = selected === appliance.slug;
              return (
                <ApplianceOption
                  key={appliance.slug}
                  appliance={appliance}
                  selected={isSelected}
                  onSelect={() => setSelected(isSelected ? null : appliance.slug)}
                />
              );
            })}
          </View>

          <SectionHeader titleKey="maintenance.steps" />
          <Card background={color.surface.base} padded style={styles.stepsCard}>
            {data.stepsAr.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </Card>

          <SectionHeader titleKey="maintenance.popular" />
          {selected === null ? (
            <ListEmpty
              icon="🛠️"
              iconLabel="اختر جهازًا"
              title={t('maintenance.empty.title')}
              body={t('maintenance.empty.body')}
            />
          ) : (
            <View style={styles.issues}>
              {issuesForAppliance(data.popularIssues, selected).map((issue) => (
                <Card key={issue.id} background={color.surface.base} padded style={styles.issueCard}>
                  <Text style={styles.issueTitle}>{issue.titleAr}</Text>
                  <Text style={styles.issueMeta}>{issue.reportsAr}</Text>
                </Card>
              ))}
            </View>
          )}
        </>
      ) : null}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function ApplianceOption({
  appliance,
  selected,
  onSelect,
}: {
  appliance: MaintenanceAppliance;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`الجهاز: ${appliance.titleAr}. ${appliance.techniciansAr}${selected ? '. محدد حاليًا' : ''}`}
      accessibilityState={{ selected, checked: selected }}
      onPress={onSelect}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
    >
      <Text style={styles.optionIcon}>{appliance.icon}</Text>
      <Text style={styles.optionTitle}>{appliance.titleAr}</Text>
      <Text style={styles.optionMeta}>{appliance.techniciansAr}</Text>
    </Pressable>
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
  },
  subtitle: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  appliances: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  option: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.lg,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
    minHeight: 120,
    justifyContent: 'center',
  },
  optionSelected: {
    borderColor: color.brand.gold,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.8,
  },
  optionIcon: {
    fontSize: 32,
  },
  optionTitle: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  optionMeta: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'center',
  },
  stepsCard: {
    gap: spacing[3],
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.brand.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: color.surface.base,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
  stepText: {
    flex: 1,
    color: color.text.primary,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  issues: {
    gap: spacing[3],
  },
  issueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  issueTitle: {
    flex: 1,
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  issueMeta: {
    color: color.brand.gold,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    marginStart: spacing[3],
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
