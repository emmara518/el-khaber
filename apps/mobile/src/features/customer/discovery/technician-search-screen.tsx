import { color, radius, spacing } from '@khabir/ui-tokens';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListError, ListLoading } from '../components/list-state-view';
import { ApiFaultGuideDataSource } from '../fault-guide/api-fault-guide-data-source';

import { DiscoveryEmptyState } from './components/discovery-empty-state';
import { DiscoveryHero } from './components/discovery-hero';
import { TechnicianResultCard } from './components/technician-result-card';
import {
  ACTIVE_APPLIANCE_FILTERS,
  applyTechnicianFilters,
  activeFilterCount,
  EMPTY_TECHNICIAN_FILTERS,
  RATING_OPTIONS,
  resolveSearchContext,
  type TechnicianSearchFilters,
} from './technician-types';
import { useTechniciansViewModel } from './use-technicians-view-model';

import type { FaultGuideData } from '../fault-guide/fault-guide-types';

import { useI18n } from '@/i18n/use-i18n';
import { Card, type } from '@/ui';
import { applianceBrandAsset, SceneAction, SceneObject, SceneSection } from '@/ui/cinematic';
import { Icon } from '@/ui/icon';
import { fontFamily } from '@/ui/typography';

export default function TechnicianSearchScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ symptomId?: string }>();
  const symptomId = typeof params.symptomId === 'string' ? params.symptomId : '';
  const scrollRef = useRef<ScrollView>(null);
  const searchRef = useRef<TextInput>(null);
  const searchOffset = useRef(0);
  const editorialOffset = useRef(0);
  const { status, data, retry } = useTechniciansViewModel();
  const [guide, setGuide] = useState<FaultGuideData | null>(null);
  const [filters, setFilters] = useState<TechnicianSearchFilters>(EMPTY_TECHNICIAN_FILTERS);
  const [draft, setDraft] = useState<TechnicianSearchFilters>(EMPTY_TECHNICIAN_FILTERS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [contextApplied, setContextApplied] = useState(false);

  useEffect(() => {
    if (symptomId.length === 0) return;
    let cancelled = false;
    new ApiFaultGuideDataSource()
      .getGuide({ role: 'customer' })
      .then((loadedGuide) => {
        if (!cancelled) setGuide(loadedGuide);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [symptomId]);

  const context = useMemo(
    () => (guide !== null ? resolveSearchContext(guide, symptomId) : null),
    [guide, symptomId],
  );

  useEffect(() => {
    if (context !== null && !contextApplied) {
      setContextApplied(true);
      setFilters((current) => ({ ...current, appliance: context.applianceSlug }));
      setDraft((current) => ({ ...current, appliance: context.applianceSlug }));
    }
  }, [context, contextApplied]);

  const results = useMemo(
    () => (data !== null ? applyTechnicianFilters(data, filters) : []),
    [data, filters],
  );
  const specialtyOptions = useMemo(
    () => [...new Set((data ?? []).flatMap((technician) => technician.specialtiesAr))]
      .filter((specialty) => specialty.trim().length > 0),
    [data],
  );
  const areaOptions = useMemo(
    () => [...new Set((data ?? []).flatMap((technician) => technician.areasAr))]
      .filter((area) => area.trim().length > 0),
    [data],
  );
  const activeCount = activeFilterCount(filters);
  const selectedApplianceLabel = ACTIVE_APPLIANCE_FILTERS.find(
    (option) => option.value === filters.appliance,
  )?.labelAr;
  const applianceLabel = filters.appliance === null
    ? 'جهازك'
    : context !== null && context.applianceSlug === filters.appliance && context.applianceTitleAr.length > 0
      ? context.applianceTitleAr
      : selectedApplianceLabel ?? 'جهازك';
  const activeSummary = [
    filters.query.trim().length > 0 ? `البحث: ${filters.query.trim()}` : null,
    filters.appliance !== null ? applianceLabel : null,
    filters.specialty,
    filters.area,
    filters.minRating !== null ? `التقييم: ${filters.minRating} فأعلى` : null,
    filters.availableOnly ? 'المتاحون فقط' : null,
  ].filter((label): label is string => label !== null);

  function clearAll() {
    Keyboard.dismiss();
    setFilters(EMPTY_TECHNICIAN_FILTERS);
    setDraft(EMPTY_TECHNICIAN_FILTERS);
    setPanelOpen(false);
  }

  function explore() {
    scrollRef.current?.scrollTo({ y: editorialOffset.current + searchOffset.current, animated: false });
    searchRef.current?.focus();
  }

  return (
    <View style={styles.root}>
      <View style={[styles.navigation, { paddingTop: insets.top + spacing[2] }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          onPress={() => {
            Keyboard.dismiss();
            if (router.canGoBack()) router.back();
            else router.replace('/(customer)');
          }}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Icon name="arrow-right" size={24} color={color.surface.base} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.navigationTitle}>{t('discovery.title')}</Text>
        <Icon name="search" size={22} color={color.brand.gold} />
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <DiscoveryHero applianceLabel={applianceLabel} onExplore={explore} />
        <View style={styles.editorial} onLayout={(event) => { editorialOffset.current = event.nativeEvent.layout.y; }}>
        {context !== null && filters.appliance === context.applianceSlug ? (
          <View style={styles.context}>
            <Icon name="info" size={18} color={color.brand.navy} />
            <Text style={styles.contextText}>بحث من دليل الأعطال: {context.symptomTitleAr}</Text>
          </View>
        ) : null}
        <View
          style={styles.searchSection}
          onLayout={(event) => { searchOffset.current = event.nativeEvent.layout.y; }}
        >
          <Text accessibilityRole="header" style={styles.sectionTitle}>ابحث حسب احتياجك</Text>
          <View style={styles.searchRow}>
            <Icon name="search" size={20} color={color.text.secondary} />
            <TextInput
              ref={searchRef}
              accessibilityLabel="ابحث باسم الفني أو التخصص أو الخدمة"
              placeholder="اسم الفني أو التخصص أو الخدمة"
              placeholderTextColor={color.text.secondary}
              value={filters.query}
              onChangeText={(query) => setFilters((current) => ({ ...current, query }))}
              style={styles.search}
              textAlign="right"
              returnKeyType="search"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            {filters.query.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="مسح نص البحث"
                onPress={() => setFilters((current) => ({ ...current, query: '' }))}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              >
                <Icon name="x" size={20} color={color.text.secondary} />
              </Pressable>
            ) : null}
          </View>
          <View accessibilityRole="radiogroup" accessibilityLabel="تصفية حسب الجهاز" style={styles.applianceObjects}>
            {ACTIVE_APPLIANCE_FILTERS.map((option) => (
              <SceneObject
                key={option.value ?? 'all'}
                title={option.labelAr}
                brandAsset={option.value ? applianceBrandAsset(option.value) : undefined}
                selected={filters.appliance === option.value}
                accessibilityLabel={`تصفية حسب الجهاز: ${option.labelAr}`}
                onPress={() => {
                  setFilters((current) => ({ ...current, appliance: option.value }));
                  setDraft((current) => ({ ...current, appliance: option.value }));
                }}
              />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('discovery.filters')}
            accessibilityState={{ expanded: panelOpen }}
            onPress={() => {
              Keyboard.dismiss();
              setDraft(filters);
              setPanelOpen((open) => !open);
            }}
            style={({ pressed }) => [styles.filterToggle, pressed && styles.pressed]}
          >
            <Icon name="sliders" size={20} color={color.brand.navy} />
            <Text style={styles.filterToggleText}>{t('discovery.filters')}</Text>
            <Icon name={panelOpen ? 'chevron-up' : 'chevron-down'} size={20} color={color.brand.navy} />
          </Pressable>
          {activeCount > 0 ? (
            <View style={styles.summary}>
              <Text style={styles.summaryText}>التصفية الحالية: {activeSummary.join('، ')}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="مسح كل المرشحات والبحث"
                onPress={clearAll}
                style={({ pressed }) => [styles.summaryReset, pressed && styles.pressed]}
              >
                <Icon name="rotate-ccw" size={16} color={color.brand.navy} />
                <Text style={styles.resetText}>إعادة ضبط</Text>
              </Pressable>
            </View>
          ) : null}
          {panelOpen ? (
            <Animated.View entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}>
              <Card background={color.surface.base} padded style={styles.panel}>
                {specialtyOptions.length > 0 ? (
                  <FilterGroup label="التخصص والخدمة">
                    {specialtyOptions.map((specialty) => (
                      <FilterChip
                        key={specialty}
                        label={specialty}
                        selected={draft.specialty === specialty}
                        groupLabel="التخصص والخدمة"
                        onPress={() => setDraft((current) => ({
                          ...current,
                          specialty: current.specialty === specialty ? null : specialty,
                        }))}
                      />
                    ))}
                  </FilterGroup>
                ) : null}
                {areaOptions.length > 0 ? (
                  <FilterGroup label="مناطق الخدمة">
                    {areaOptions.map((area) => (
                      <FilterChip
                        key={area}
                        label={area}
                        selected={draft.area === area}
                        groupLabel="مناطق الخدمة"
                        onPress={() => setDraft((current) => ({ ...current, area: current.area === area ? null : area }))}
                      />
                    ))}
                  </FilterGroup>
                ) : null}
                <FilterGroup label="التقييم">
                  {RATING_OPTIONS.map((option) => (
                    <FilterChip
                      key={option.labelAr}
                      label={option.labelAr}
                      selected={draft.minRating === option.value}
                      groupLabel="التقييم"
                      onPress={() => setDraft((current) => ({ ...current, minRating: option.value }))}
                    />
                  ))}
                </FilterGroup>
                <FilterGroup label="التوفر">
                  <FilterChip
                    label="المتاحون فقط"
                    selected={draft.availableOnly}
                    groupLabel="التوفر"
                    onPress={() => setDraft((current) => ({ ...current, availableOnly: !current.availableOnly }))}
                  />
                </FilterGroup>
                <View style={styles.panelActions}>
                  <SceneAction
                    label={t('discovery.apply')}
                    style={styles.panelAction}
                    onPress={() => {
                      Keyboard.dismiss();
                      setFilters((current) => ({ ...draft, query: current.query, appliance: current.appliance }));
                      setPanelOpen(false);
                    }}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="مسح كل المرشحات والبحث"
                    onPress={clearAll}
                    style={({ pressed }) => [styles.reset, pressed && styles.pressed]}
                  >
                    <Text style={styles.resetText}>{t('discovery.clear')}</Text>
                  </Pressable>
                </View>
              </Card>
            </Animated.View>
          ) : null}
        </View>
        {status === 'loading' ? <ListLoading label={t('state.loading')} /> : null}
        {status === 'error' ? (
          <ListError
            title={t('discovery.error.title')}
            message="لم نتمكن من تحميل قائمة الفنيين الآن. تحقق من اتصالك بالإنترنت وحاول مرة أخرى."
            retryLabel={t('state.retry')}
            onRetry={retry}
          />
        ) : null}
        {status === 'loaded' && data !== null ? (
          results.length === 0 ? (
            <DiscoveryEmptyState
              hasActiveFilters={activeCount > 0}
              catalogEmpty={data.length === 0}
              onClearFilters={clearAll}
              onRetry={retry}
              onGuide={() => {
                Keyboard.dismiss();
                router.push('/(customer)/maintenance');
              }}
            />
          ) : (
            <SceneSection style={styles.list} title={`نتائج البحث (${results.length})`} eyebrow="قارن ثم اختر" body="تعرّف على التخصص والخدمات ومناطق العمل من الملف الشخصي.">
              {results.map((technician) => (
                <TechnicianResultCard
                  key={technician.id}
                  technician={technician}
                  onPress={() => {
                    Keyboard.dismiss();
                    router.push({
                      pathname: '/(customer)/technician/[id]',
                      params: {
                        id: technician.id,
                        ...(filters.appliance !== null ? { appliance: filters.appliance } : {}),
                        ...(context !== null && filters.appliance === context.applianceSlug
                          ? { symptomId: context.symptomId }
                          : {}),
                      },
                    });
                  }}
                />
              ))}
            </SceneSection>
          )
        ) : null}
        </View>
      </ScrollView>
    </View>
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

function FilterChip({ label, selected, groupLabel, onPress }: {
  label: string;
  selected: boolean;
  groupLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={`${groupLabel}: ${label}`}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
    >
      {selected ? <Icon name="check" size={16} color={color.brand.navy} /> : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.surface.subtle,
    direction: 'rtl',
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
    backgroundColor: color.brand.navy,
  },
  navigationTitle: {
    flex: 1,
    ...type.h3,
    color: color.surface.base,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingBottom: spacing[8],
  },
  editorial: {
    paddingHorizontal: spacing[5],
  },
  applianceObjects: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginVertical: spacing[4],
  },
  panelAction: {
    flexGrow: 1,
  },
  context: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
    padding: spacing[3],
    backgroundColor: color.brand.goldSoft,
    borderRadius: radius.md,
  },
  contextText: {
    flex: 1,
    ...type.caption,
    color: color.brand.navy,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  searchSection: {
    marginTop: spacing[5],
  },
  sectionTitle: {
    ...type.h3,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.md,
    backgroundColor: color.surface.base,
    paddingHorizontal: spacing[3],
    marginTop: spacing[3],
  },
  search: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    ...type.body,
    color: color.text.primary,
    paddingVertical: spacing[3],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  chips: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingVertical: spacing[3],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    maxWidth: '100%',
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
    backgroundColor: color.brand.goldSoft,
  },
  pressed: {
    opacity: 0.75,
  },
  chipText: {
    flexShrink: 1,
    ...type.bodyMedium,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  chipTextSelected: {
    color: color.text.primary,
    fontFamily: fontFamily.bold,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    minHeight: 52,
  },
  filterToggleText: {
    flex: 1,
    ...type.bodyMedium,
    color: color.brand.navy,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  summary: {
    marginTop: spacing[3],
    gap: spacing[1],
  },
  summaryText: {
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  summaryReset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minHeight: 44,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2],
  },
  panel: {
    marginTop: spacing[3],
    gap: spacing[4],
  },
  group: {
    gap: spacing[2],
  },
  groupLabel: {
    ...type.cardTitle,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  groupChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  panelActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  apply: {
    flexGrow: 1,
    backgroundColor: color.brand.navy,
    borderRadius: radius.md,
    minHeight: 50,
    padding: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    ...type.button,
    color: color.surface.base,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  reset: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    borderRadius: radius.md,
    minHeight: 50,
    padding: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    ...type.bodyMedium,
    color: color.brand.navy,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  list: {
    gap: spacing[3],
    marginTop: spacing[5],
  },
});
