/**
 * Home header — the navy identity bar. The El-Khabir wordmark is the
 * visual centre of the screen: equal-width side slots keep "الخبير"
 * exactly centred, with only the notification action and the user
 * context flanking it (no LTR-style left-aligned logo).
 */

import { color, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n/use-i18n';
import { Icon } from '@/ui/icon';
import { type } from '@/ui/typography';

interface HomeHeaderProps {
  avatarInitials: string;
  onPressNotifications?: () => void;
  onPressAvatar?: () => void;
}

const SLOT = 44;

export function HomeHeader({
  avatarInitials,
  onPressNotifications,
  onPressAvatar,
}: HomeHeaderProps) {
  const { t } = useI18n();
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.row}>
        <View style={styles.slot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.notifications')}
            onPress={onPressNotifications}
            hitSlop={8}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Icon name="bell" size={18} color={color.brand.navy} />
          </Pressable>
        </View>

        <View style={styles.brandSlot}>
          <Text accessibilityRole="header" accessibilityLabel="الخبير" style={styles.wordmark}>
            الخبير
          </Text>
          <Text style={styles.tagline}>صيانة • فنيين • متجر</Text>
        </View>

        <View style={[styles.slot, styles.slotEnd]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="الملف الشخصي"
            onPress={onPressAvatar}
            hitSlop={8}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{avatarInitials}</Text>
            </View>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: color.brand.navy,
  },
  row: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  slot: {
    width: SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEnd: {
    alignItems: 'center',
  },
  brandSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    ...type.display,
    fontSize: 24,
    lineHeight: 34,
    color: color.surface.base,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  tagline: {
    ...type.caption,
    color: color.brand.goldSoft,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.surface.base,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: color.brand.gold,
  },
  avatarText: {
    ...type.label,
    color: color.brand.navy,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.surface.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
