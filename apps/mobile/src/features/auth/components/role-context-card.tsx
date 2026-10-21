/**
 * Role context card (registration).
 *
 * The role was already chosen on the Role Selection screen, so this is
 * CONTEXT, not a second decision: it shows the approved role artwork,
 * "حسابك كـ" + the role name + a one-line explanation, and a single
 * secondary action to change the account type.
 *
 * Layout follows the approved registration reference: the role artwork
 * sits at the start (right), the copy beside it, and the change action
 * on the end side. On narrow viewports the change action drops to its own
 * row so the role copy never truncates.
 *
 * Generic across the three roles (registration stays common).
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { RoleOption } from '../roles';

import { Icon } from '@/ui/icon';
import { roleSelectionAsset } from '@/ui/role-selection-assets';
import { type } from '@/ui/typography';

/** One-line explanation of what registering as this role means. */
const REGISTRATION_BLURB: Record<RoleOption['role'], string> = {
  customer: 'تسجيل كعميل لطلب صيانة أجهزتك',
  technician: 'تسجيل كفني لاستقبال طلبات الصيانة',
  merchant: 'تسجيل كتاجر لعرض منتجاتك وإدارة متجرك',
};

export function RoleContextCard({
  option,
  onChangeRole,
}: {
  option: RoleOption;
  onChangeRole: () => void;
}) {
  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`حسابك كـ ${option.titleAr}. ${REGISTRATION_BLURB[option.role]}`}
      style={styles.card}
    >
      <View style={styles.head}>
        <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no">
          <Image
            source={roleSelectionAsset(option.role)}
            accessible={false}
            importantForAccessibility="no"
            resizeMode="contain"
            style={styles.avatarImage}
          />
        </View>
        <View style={styles.texts}>
          <Text style={styles.eyebrow}>حسابك كـ</Text>
          <Text style={styles.name}>{option.titleAr}</Text>
          <Text style={styles.blurb}>{REGISTRATION_BLURB[option.role]}</Text>
        </View>
      </View>
      <View style={styles.changeRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="تغيير نوع الحساب"
          onPress={onChangeRole}
          style={({ pressed }) => [styles.change, pressed && styles.pressed]}
        >
          <Text style={styles.changeText}>تغيير نوع الحساب</Text>
          <Icon name="chevron-left" size={16} color={color.brand.navy} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface.subtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border.default,
    padding: spacing[4],
    gap: spacing[3],
    direction: 'rtl',
  },
  head: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[3],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  name: {
    ...type.h2,
    color: color.brand.navy,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  blurb: {
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: spacing[1],
  },
  changeRow: {
    flexDirection: 'row',
    direction: 'rtl',
    justifyContent: 'flex-end',
  },
  change: {
    minHeight: 44,
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
  },
  changeText: {
    ...type.label,
    color: color.brand.navy,
    writingDirection: 'rtl',
  },
  pressed: {
    opacity: 0.85,
  },
});
