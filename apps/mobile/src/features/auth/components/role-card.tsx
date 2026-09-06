/**
 * Account-type role card.
 *
 * Exactly three instances are ever rendered (عميل / فني / تاجر).
 * Selected state never relies on color alone: border weight, gold
 * marker dot, and the accessibility `selected` state all change.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ROLE_OPTIONS, type RoleOption } from '../roles';

import type { Role } from '@khabir/shared-types';

export { ROLE_OPTIONS };
export type { RoleOption };

export function RoleCard({
  option,
  selected,
  onSelect,
}: {
  option: RoleOption;
  selected: boolean;
  onSelect: (role: Role) => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`نوع الحساب: ${option.titleAr}. ${option.descriptionAr}${selected ? '. محدد حاليًا' : ''}`}
      accessibilityState={{ selected, checked: selected }}
      onPress={() => onSelect(option.role)}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{option.icon}</Text>
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{option.titleAr}</Text>
        <Text style={styles.description}>{option.descriptionAr}</Text>
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[styles.marker, selected && styles.markerSelected]}
      >
        {selected ? <View style={styles.markerDot} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.lg,
    padding: spacing[4],
    gap: spacing[3],
    minHeight: 84,
  },
  cardSelected: {
    borderColor: color.brand.gold,
    borderWidth: 2,
    backgroundColor: color.surface.base,
  },
  pressed: {
    opacity: 0.8,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: color.surface.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  description: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: color.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerSelected: {
    borderColor: color.brand.gold,
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: color.brand.gold,
  },
});
