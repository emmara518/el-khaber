/**
 * AppHeader — the shared navy identity bar used by every role's
 * top-level screens. Structural only (no photography): notification
 * action, the centred El-Khabir wordmark, and the user context
 * (optional availability pill + avatar initials).
 *
 * Role-neutral by design: Customer, Technician and Merchant differ only
 * in the props they pass, never in a separate header system.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from './icon';
import { fontFamily, type } from './typography';

interface AppHeaderProps {
  /** Centred brand wordmark. Defaults to الخبير. */
  title?: string;
  /** Small line under the wordmark. */
  subtitle?: string;
  /** Optional availability pill label shown next to the avatar. */
  availabilityLabel?: string;
  avatarInitials?: string;
  /** Unread notification count; a badge shows when > 0. */
  notificationCount?: number;
  onPressNotifications?: () => void;
  onPressAvatar?: () => void;
  style?: StyleProp<ViewStyle>;
}

const SLOT = 44;

export function AppHeader({
  title = 'الخبير',
  subtitle = 'صيانة • فنيين • متجر',
  availabilityLabel,
  avatarInitials,
  notificationCount = 0,
  onPressNotifications,
  onPressAvatar,
  style,
}: AppHeaderProps) {
  return (
    <SafeAreaView edges={['top']} style={[styles.safe, style]}>
      <View style={styles.row}>
        <View style={styles.slot}>
          {onPressNotifications ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                notificationCount > 0 ? `الإشعارات، ${notificationCount} غير مقروء` : 'الإشعارات'
              }
              onPress={onPressNotifications}
              hitSlop={8}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Icon name="bell" size={18} color={color.brand.navy} />
              {notificationCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText} numberOfLines={1}>
                    {notificationCount > 9 ? '٩+' : notificationCount.toLocaleString('ar-EG')}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
        </View>

        <View style={styles.brandSlot}>
          <Text accessibilityRole="header" accessibilityLabel={title} style={styles.wordmark}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.tagline}>{subtitle}</Text> : null}
        </View>

        <View style={[styles.slot, styles.slotEnd]}>
          {availabilityLabel ? (
            <View style={styles.availability}>
              <View style={styles.availabilityDot} />
              <Text style={styles.availabilityText} numberOfLines={1}>
                {availabilityLabel}
              </Text>
            </View>
          ) : null}
          {onPressAvatar || avatarInitials ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="الملف الشخصي"
              onPress={onPressAvatar}
              disabled={!onPressAvatar}
              hitSlop={8}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <View style={styles.avatar}>
                {avatarInitials !== undefined && avatarInitials.trim().length > 0 ? (
                  <Text style={styles.avatarText}>{avatarInitials}</Text>
                ) : (
                  <Icon name="user" size={18} color={color.brand.navy} />
                )}
              </View>
            </Pressable>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: color.brand.navy },
  row: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  slot: { width: SLOT, alignItems: 'center', justifyContent: 'center' },
  slotEnd: {
    width: 'auto',
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[2],
    justifyContent: 'flex-end',
  },
  brandSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  avatarText: { ...type.label, color: color.brand.navy, fontFamily: fontFamily.bold },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.surface.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availability: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[1] + 2,
    backgroundColor: color.brand.goldSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    maxWidth: 120,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.success.DEFAULT,
  },
  availabilityText: {
    ...type.label,
    color: color.brand.navy,
    writingDirection: 'rtl',
    flexShrink: 1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    end: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: color.error.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { ...type.navigation, color: color.surface.base, fontFamily: fontFamily.bold },
  pressed: { opacity: 0.7 },
});
