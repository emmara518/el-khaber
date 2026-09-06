/**
 * Technician Search screen (Batch C).
 *
 * Two entries, one screen: contextual (from Fault Guide via
 * `?symptomId=`, appliance pre-filtered but editable) and general
 * (all technicians). Live search + appliance chips; the remaining
 * facets live in a filter panel with explicit apply/reset.
 * Deterministic filtering only — no ranking invented.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ListEmpty, ListError, ListLoading } from '../components/list-state-view';
import { MockFaultGuideDataSource } from '../fault-guide/mock-fault-guide-data-source';

import { TechnicianResultCard } from './components/technician-result-card';
import {
  ACTIVE_APPLIANCE_FILTERS,
  applyTechnicianFilters,
  activeFilterCount,
  AREA_OPTIONS,
  EMPTY_TECHNICIAN_FILTERS,
  RATING_OPTIONS,
  resolveSearchContext,
  SPECIALTY_OPTIONS,
  type TechnicianSearchFilters,
} from './technician-types';
import { useTechniciansViewModel } from './use-technicians-view-model';

import type { FaultGuideData } from '../fault-guide/fault-guide-types';

import { useI18n } from '@/i18n/use-i18n';
import { Card } from '@/ui';


export default function TechnicianSearchScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ symptomId?: string }>();
  const symptomId = typeof params.symptomId === 'string' ? params.symptomId : '';

  const { status, data, error, retry } = useTechniciansViewModel();
  const [guide, setGuide] = useState<FaultGuideData | null>(null);

  const [filters, setFilters] = useState<TechnicianSearchFilters>(EMPTY_TECHNICIAN_FILTERS);
  const [draft, setDraft] = useState<TechnicianSearchFilters>(EMPTY_TECHNICIAN_FILTERS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [contextApplied, setContextApplied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    new MockFaultGuideDataSource()
      .getGuide({ role: 'customer' })
      .then((g) => {
        if (!cancelled) setGuide(g);
      })
      .catch(() => {
        // Context is a nicety; general search works without it.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const context = useMemo(
    () => (guide !== null ? resolveSearchContext(guide, symptomId) : null),
    [guide, symptomId],
  );

  // Pre-filter by the contextual appliance exactly once (still editable).
  useEffect(() => {
    if (context !== null && !contextApplied) {
      setContextApplied(true);
      setFilters((f) => ({ ...f, appliance: context.applianceSlug }));
      setDraft((d) => ({ ...d, appliance: context.applianceSlug }));
    }
  }, [context, contextApplied]);

  const results = useMemo(
    () => (data !== null ? applyTechnicianFilters(data, filters) : []),
    [data, filters],
  );
  const activeCount = activeFilterCount(filters);

  function clearAll() {
    setFilters(EMPTY_TECHNICIAN_FILTERS);
    setDraft(EMPTY_TECHNICIAN_FILTERS);
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('discovery.title')}
      </Text>
      <Text style={styles.subtitle}>{t('discovery.subtitle')}</Text>

      {context !== null ? (
        <Card background={color.brand.navy} borderColor={color.brand.navy} padded style={styles.context}>
          <Text style={styles.contextTitle}>فنيون مناسبون لـ {context.applianceTitleAr}</Text>
          <Text style={styles.contextBody}>{context.symptomTitleAr}</Text>
        </Card>
      ) : null}

      {status === 'loading' ? <ListLoading label={t('state.loading')} /> : null}
      {status === 'error' ? (
        <ListError
          title={t('discovery.error.title')}
          message={error?.message ?? ''}
          retryLabel={t('state.retry')}
          onRetry={retry}
        />
      ) : null}
      {status === 'loaded' && data !== null ? (
        <>
          <TextInput
            accessibilityLabel="ابحث باسم الفني أو التخصص أو الخدمة"
            placeholder="ابحث باسم الفني أو التخصص…"
            placeholderTextColor={color.text.secondary}
            value={filters.query}
            onChangeText={(query) => setFilters((f) => ({ ...f, query }))}
            style={styles.search}
            textAlign="right"
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {ACTIVE_APPLIANCE_FILTERS.map((option) => {
              const selected = filters.appliance === option.value;
              return (
                <Pressable
                  key={option.value ?? 'all'}
                  accessibilityRole="tab"
                  accessibilityLabel={`تصفية حسب الجهاز: ${option.labelAr}${selected ? '، محدد حاليًا' : ''}`}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setFilters((f) => ({ ...f, appliance: option.value }));
                    setDraft((d) => ({ ...d, appliance: option.value }));
                  }}
                  style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.labelAr}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`خيارات التصفية المتقدمة${activeCount > 0 ? `، ${activeCount} مرشحات نشطة` : ''}`}
            onPress={() => {
              setDraft(filters);
              setPanelOpen((open) => !open);
            }}
            style={({ pressed }) => [styles.filterToggle, pressed && styles.pressed]}
          >
            <Text style={styles.filterToggleText}>
              ⚙️ {t('discovery.filters')}{activeCount > 0 ? ` (${activeCount})` : ''}
            </Text>
            <Text style={styles.filterToggleText}>{panelOpen ? '▴' : '▾'}</Text>
          </Pressable>

          {panelOpen ? (
            <Card background={color.surface.base} padded style={styles.panel}>
              <FilterGroup label="التخصص">
                {SPECIALTY_OPTIONS.map((specialty) => (
                  <FilterChip
                    key={specialty}
                    label={specialty}
                    selected={draft.specialty === specialty}
                    groupLabel="التخصص"
                    onPress={() =>
                      setDraft((d) => ({ ...d, specialty: d.specialty === specialty ? null : specialty }))
                    }
                  />
                ))}
              </FilterGroup>
              <FilterGroup label="التقييم">
                {RATING_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.labelAr}
                    label={option.labelAr}
                    selected={draft.minRating === option.value}
                    groupLabel="التقييم"
                    onPress={() => setDraft((d) => ({ ...d, minRating: option.value }))} 
                  />
                ))}
              </FilterGroup>
              <FilterGroup label="المنطقة">
                {AREA_OPTIONS.map((area) => (
                  <FilterChip
                    key={area}
                    label={area}
                    selected={draft.area === area}
                    groupLabel="المنطقة"
                    onPress={() => setDraft((d) => ({ ...d, area: d.area === area ? null : area }))} 
                  />
                ))}
              </FilterGroup>
              <Pressable
                accessibilityRole="togglebutton"
                accessibilityLabel={`الفنيون المتاحون فقط${draft.availableOnly ? '، مفعّل' : ''}`}
                accessibilityState={{ selected: draft.availableOnly }}
                onPress={() => setDraft((d) => ({ ...d, availableOnly: !d.availableOnly }))}
                style={({ pressed }) => [styles.availability, draft.availableOnly && styles.chipSelected, pressed && styles.pressed]}
              >
                <Text style={[styles.chipText, draft.availableOnly && styles.chipTextSelected]}>
                  {draft.availableOnly ? '✓ ' : ''}المتاحون فقط
                </Text>
              </Pressable>
              <View style={styles.panelActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="تطبيق المرشحات"
                  onPress={() => {
                    setFilters(draft);
                    setPanelOpen(false);
                  }}
                  style={({ pressed }) => [styles.apply, pressed && styles.pressed]}
                >
                  <Text style={styles.applyText}>{t('discovery.apply')}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="مسح كل المرشحات"
                  onPress={() => {
                    clearAll();
                    setPanelOpen(false);
                  }}
                  style={({ pressed }) => [styles.reset, pressed && styles.pressed]}
                >
                  <Text style={styles.resetText}>{t('discovery.clear')}</Text>
                </Pressable>
              </View>
            </Card>
          ) : null}

          <Text style={styles.count}>عدد النتائج: {results.length}</Text>

          {results.length === 0 ? (
            <ListEmpty
              icon="🔍"
              iconLabel="لا نتائج"
              title={t('discovery.empty.title')}
              body={t('discovery.empty.body')}
              actionLabel={t('discovery.clear')}
              onAction={clearAll}
            />
          ) : (
            <View style={styles.list}>
              {results.map((technician) => (
                <TechnicianResultCard
                  key={technician.id}
                  technician={technician}
                  onPress={() =>
                    router.push({
                      pathname: '/(customer)/technician/[id]',
                      params: {
                        id: technician.id,
                        ...(filters.appliance !== null ? { appliance: filters.appliance } : {}),
                        ...(symptomId.length > 0 ? { symptomId } : {}),
                      },
                    })
                  }
                />
              ))}
            </View>
          )}
        </>
      ) : null}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.groupChips}>{children}</View>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  groupLabel,
  onPress,
}: {
  label: string;
  selected: boolean;
  groupLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={`${groupLabel}: ${label}${selected ? '، محدد' : ''}`}
      accessibilityState={{ selected, checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {selected ? '✓ ' : ''}{label}
      </Text>
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
  context: {
    marginTop: spacing[4],
    gap: spacing[1],
  },
  contextTitle: {
    color: color.brand.gold,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  contextBody: {
    color: color.surface.base,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  search: {
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.md,
    backgroundColor: color.surface.base,
    color: color.text.primary,
    fontSize: typography.size.body,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 52,
    marginTop: spacing[4],
  },
  chips: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingVertical: spacing[3],
  },
  chip: {
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    backgroundColor: color.surface.base,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    minHeight: 44,
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: color.brand.gold,
    borderWidth: 2,
    backgroundColor: color.brand.goldSoft,
  },
  pressed: {
    opacity: 0.75,
  },
  chipText: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  chipTextSelected: {
    color: color.text.primary,
    fontWeight: typography.weight.bold,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    minHeight: 52,
  },
  filterToggleText: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  panel: {
    marginTop: spacing[3],
    gap: spacing[4],
  },
  group: {
    gap: spacing[2],
  },
  groupLabel: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
  },
  groupChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  availability: {
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    backgroundColor: color.surface.base,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  panelActions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  apply: {
    flex: 1,
    backgroundColor: color.brand.navy,
    borderRadius: radius.md,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    color: color.surface.base,
    fontSize: typography.size.button,
    fontWeight: typography.weight.semibold,
  },
  reset: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    borderRadius: radius.md,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  count: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    marginTop: spacing[3],
    textAlign: 'right',
  },
  list: {
    gap: spacing[3],
    marginTop: spacing[2],
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
