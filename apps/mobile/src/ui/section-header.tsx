import { color, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../i18n/use-i18n';

import { type } from './typography';

import type { TranslationKey } from '../i18n/use-i18n';

interface SectionHeaderProps {
  titleKey: TranslationKey;
  /** Optional "View all" affordance. The reference design uses "اعرض الكل". */
  showAll?: boolean;
  /** Custom label for the trailing action (Arabic). Defaults to the
   * i18n key `home.showAll`. */
  showAllLabel?: string;
  onPressShowAll?: () => void;
  /** Override the title text directly. */
  title?: string;
}

/**
 * Section header used across the Home screen:
 *
 *   <Section title>              <View all>
 *   <Section title>                          [no trailing action]
 */
export function SectionHeader({
  titleKey,
  title,
  showAll = false,
  showAllLabel,
  onPressShowAll,
}: SectionHeaderProps) {
  const { t } = useI18n();
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title ?? t(titleKey)}</Text>
      {showAll ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showAllLabel ?? t('home.showAll')}
          onPress={onPressShowAll}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionText}>{showAllLabel ?? t('home.showAll')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[6],
    marginBottom: spacing[3],
  },
  title: {
    ...type.h3,
    color: color.text.primary,
  },
  action: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
  },
  actionPressed: {
    opacity: 0.6,
  },
  actionText: {
    ...type.label,
    color: color.text.secondary,
  },
});
