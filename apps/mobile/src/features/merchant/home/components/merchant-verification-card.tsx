/**
 * Merchant Home — Verification status card.
 *
 * Renders the REAL 4-state verification model (pending | verified |
 * rejected | action_required) with its established copy and an actionable
 * entry point where action is required. Green surface only for `verified`;
 * gold surface (the brand accent) otherwise. Never colour alone — the title
 * and an icon carry the state.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MerchantVerification } from '../merchant-home-types';

import { Card, Icon, type } from '@/ui';


export function MerchantVerificationCard({
  verification,
  headlineAr,
  noteAr,
  onPressDetails,
}: {
  verification: MerchantVerification;
  headlineAr: string;
  noteAr: string;
  onPressDetails: () => void;
}) {
  const verified = verification === 'verified';
  const background = verified ? color.success.soft : color.brand.goldSoft;
  const borderColor = verified ? color.success.DEFAULT : color.brand.gold;
  const icon = verified ? 'check-circle' : verification === 'pending' ? 'clock' : 'alert-circle';
  const iconColor = verified ? color.success.DEFAULT : color.brand.navy;

  return (
    <Card background={background} borderColor={borderColor} padded style={styles.card}>
      <View
        style={[styles.iconWrap, verified ? styles.iconWrapVerified : styles.iconWrapAttention]}
      >
        <Icon name={icon} size={22} color={iconColor} accessible={false} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{headlineAr}</Text>
        {noteAr.length > 0 ? (
          <Text style={styles.note} numberOfLines={2}>
            {noteAr}
          </Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`عرض تفاصيل حالة الحساب: ${headlineAr}`}
        onPress={onPressDetails}
        hitSlop={8}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Text style={styles.actionText}>عرض التفاصيل</Text>
        <Icon name="chevron-left" size={16} color={color.brand.navy} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[3],
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: color.surface.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapVerified: {},
  iconWrapAttention: {},
  copy: { flex: 1, minWidth: 0, gap: 2 },
  title: {
    ...type.cardTitle,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  note: {
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  action: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[1],
    minHeight: 44,
    paddingHorizontal: spacing[2],
  },
  actionText: {
    ...type.label,
    color: color.brand.navy,
    writingDirection: 'rtl',
  },
  pressed: { opacity: 0.7 },
});
