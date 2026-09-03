import { color, spacing, typography } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '../../../../i18n/use-i18n';
import { IconBadge } from '../../../../ui';

/**
 * Home header — the dark navy hero bar that contains the notification
 * bell, the Al-Khabir wordmark, and the customer avatar. Matches
 * the reference design.
 */
interface HomeHeaderProps {
  avatarInitials: string;
  onPressNotifications?: () => void;
  onPressAvatar?: () => void;
}

export function HomeHeader({
  avatarInitials,
  onPressNotifications,
  onPressAvatar,
}: HomeHeaderProps) {
  const { t } = useI18n();
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.notifications')}
          onPress={onPressNotifications}
          hitSlop={8}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <IconBadge
            glyph="🔔"
            size={36}
            background={color.surface.base}
            foreground={color.brand.navy}
            accessibilityLabel={t('home.notifications')}
          />
        </Pressable>
        <Text style={styles.wordmark}>الخبير</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onPressAvatar}
          hitSlop={8}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarInitials}</Text>
          </View>
        </Pressable>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  wordmark: {
    color: color.surface.base,
    fontSize: typography.size.h2,
    fontWeight: typography.weight.bold,
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
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
  iconButton: {
    width: 36,
    height: 36,
  },
  pressed: {
    opacity: 0.7,
  },
});
