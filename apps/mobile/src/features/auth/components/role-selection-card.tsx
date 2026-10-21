/**
 * Role-selection card — the premium vertical role tile used by the
 * Customer "Choose Account Type" screen.
 *
 * One reusable component renders all three roles: approved role artwork
 * (primary visual), role name, supporting description, then the
 * selection control. Selection is communicated structurally, never by
 * colour alone — the control swaps an empty ring for a gold check and
 * the card gains a gold border + gold-tinted surface.
 *
 * Source of truth for the composition: the approved role-selection
 * reference. Business contract is unchanged: the card only reports the
 * chosen `role` upward.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ROLE_OPTIONS, type RoleOption } from '../roles';

import type { Role } from '@khabir/shared-types';

import { usePressScale } from '@/ui';
import { Icon } from '@/ui/icon';
import { ROLE_ASPECT_RATIO, roleSelectionAsset } from '@/ui/role-selection-assets';
import { type } from '@/ui/typography';

export { ROLE_OPTIONS };
export type { RoleOption };

export function RoleSelectionCard({
  option,
  selected,
  onSelect,
}: {
  option: RoleOption;
  selected: boolean;
  onSelect: (role: Role) => void;
}) {
  const press = usePressScale(0.97);

  return (
    <Animated.View style={[styles.cell, press.style]}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={`نوع الحساب: ${option.titleAr}. ${option.descriptionAr}${
          selected ? '. محدَّد' : ''
        }`}
        accessibilityState={{ selected, checked: selected }}
        aria-checked={selected}
        onPress={() => onSelect(option.role)}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={({ pressed }) => [
          styles.card,
          selected && styles.cardSelected,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.artWrap}>
          <Image
            source={roleSelectionAsset(option.role)}
            accessible={false}
            importantForAccessibility="no"
            resizeMode="contain"
            style={styles.art}
          />
        </View>
        <Text style={styles.title}>{option.titleAr}</Text>
        <Text style={styles.description}>{option.descriptionAr}</Text>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[styles.control, selected && styles.controlSelected]}
        >
          {selected ? <Icon name="check" size={16} color={color.brand.navy} /> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    minWidth: 0,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    padding: spacing[2],
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
    direction: 'rtl',
  },
  cardSelected: {
    borderColor: color.brand.gold,
    backgroundColor: 'rgba(233, 168, 36, 0.12)',
  },
  pressed: {
    opacity: 0.9,
  },
  artWrap: {
    width: '100%',
    aspectRatio: ROLE_ASPECT_RATIO,
    marginBottom: spacing[1],
  },
  art: {
    width: '100%',
    height: '100%',
  },
  title: {
    ...type.cardTitle,
    color: color.surface.base,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  description: {
    ...type.caption,
    color: 'rgba(255, 255, 255, 0.72)',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: spacing[1],
    marginBottom: spacing[2],
  },
  control: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  controlSelected: {
    borderColor: color.brand.gold,
    backgroundColor: color.brand.gold,
  },
});
