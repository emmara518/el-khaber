/**
 * Discovery empty state — "no technicians yet" done properly.
 *
 * Two honest scenarios:
 * - catalogEmpty: the backend has no technicians at all yet.
 * - filtered: results exist but none match the current filters.
 *
 * Composition: the cinematic registry illustration (`technician_placeholder_male`
 * for an empty catalog, `fault_empty` for over-narrow filters) anchors the visual, followed by ماذا حدث؟ / لماذا؟ /
 * ماذا أفعل؟ — real next actions only (clear filters, retry, or the
 * Fault Guide). No fake cards, no emoji.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useI18n } from '@/i18n/use-i18n';
import { BrandImage } from '@/ui/brand-image';
import { Icon } from '@/ui/icon';
import { type } from '@/ui/typography';


export function DiscoveryEmptyState({
  hasActiveFilters,
  catalogEmpty,
  onClearFilters,
  onRetry,
  onGuide,
}: {
  hasActiveFilters: boolean;
  catalogEmpty: boolean;
  onClearFilters: () => void;
  onRetry: () => void;
  onGuide: () => void;
}) {
  const { t } = useI18n();
  const enter = useSharedValue(0);

  enter.value = withDelay(80, withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }));

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 22 }],
  }));

  const title = catalogEmpty
    ? 'لا يوجد فنيون متاحون حالياً'
    : t('discovery.empty.title');
  const body = catalogEmpty
    ? 'تُبنى قائمة الفنيين تدريجياً مع انضمام فنيين معتمدين. يمكنك تشخيص جهازك من دليل الأعطال في الوقت الحالي.'
    : t('discovery.empty.body');

  return (
    <Reanimated.View accessibilityRole="alert" accessibilityLabel={title} style={[styles.root, enterStyle]}>
      <View style={styles.art}>
        <BrandImage
          name={catalogEmpty ? 'no-requests' : 'no-results'}
          size={132}
          accessibilityLabel={catalogEmpty ? 'لا يوجد فنيون متاحون' : 'لا توجد نتائج مطابقة للبحث الحالي'}
        />
      </View>

      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>

      <View style={styles.hints}>
        <View style={styles.hintRow}>
          <Icon name="check" size={14} color={color.brand.navy} accessibilityLabel="تلميح" />
          <Text style={styles.hintText}>{t('discovery.empty.hintFilters')}</Text>
        </View>
        <View style={styles.hintRow}>
          <Icon name="check" size={14} color={color.brand.navy} accessibilityLabel="تلميح" />
          <Text style={styles.hintText}>{t('discovery.empty.hintLater')}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {hasActiveFilters ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('discovery.clear')}
            onPress={onClearFilters}
            style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.pressed]}
          >
            <Text style={styles.btnPrimaryText}>{t('discovery.clear')}</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="فتح دليل الأعطال"
          onPress={onGuide}
          style={({ pressed }) => [styles.btn, hasActiveFilters ? styles.btnGhost : styles.btnPrimary, pressed && styles.pressed]}
        >
          <Icon name="book" size={16} color={hasActiveFilters ? color.brand.navy : color.surface.base} />
          <Text style={hasActiveFilters ? styles.btnGhostText : styles.btnPrimaryText}>دليل الأعطال</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('state.retry')}
          onPress={onRetry}
          style={({ pressed }) => [styles.btnRetry, pressed && styles.pressed]}
        >
          <Icon name="rotate-ccw" size={16} color={color.brand.navy} />
        </Pressable>
      </View>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    backgroundColor: color.surface.base,
    borderRadius: radius.xl,
    padding: spacing[5],
    marginTop: spacing[5],
    gap: spacing[2],
    borderWidth: 1,
    borderColor: color.border.default,
  },
  art: {
    width: 156,
    height: 156,
    borderRadius: radius.lg,
    backgroundColor: color.surface.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  title: {
    ...type.h3,
    color: color.text.primary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  body: {
    ...type.body,
    color: color.text.secondary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  hints: {
    alignSelf: 'stretch',
    marginTop: spacing[2],
    gap: spacing[2],
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  hintText: {
    flex: 1,
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  actions: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing[2],
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRetry: {
    minWidth: 50,
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: color.brand.navy,
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
  },
  pressed: {
    opacity: 0.85,
  },
  btnPrimaryText: {
    ...type.button,
    color: color.surface.base,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  btnGhostText: {
    ...type.button,
    color: color.brand.navy,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
