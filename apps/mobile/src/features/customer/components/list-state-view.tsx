/**
 * Shared async list states for Customer screens (docs/04_UI_UX.md §23).
 *
 * One file, three small primitives — `ListLoading`, `ListEmpty`,
 * `ListError` — reused by Requests / Maintenance / Messages so every
 * list defines loading, empty, error, and retry identically.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/ui/card';

export function ListLoading({ label }: { label: string }) {
  return (
    <Card background={color.surface.base} padded style={styles.center}>
      <ActivityIndicator accessibilityLabel={label} color={color.brand.navy} />
      <Text style={styles.muted}>{label}</Text>
    </Card>
  );
}

export function ListEmpty({
  icon,
  iconLabel,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: string;
  iconLabel: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card background={color.surface.base} padded style={styles.center}>
      <View accessibilityRole="image" accessibilityLabel={iconLabel} style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.muted}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

export function ListError({
  title,
  message,
  retryLabel,
  onRetry,
}: {
  title: string;
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <Card background={color.surface.base} padded style={styles.center}>
      <View accessibilityRole="image" accessibilityLabel="خطأ" style={styles.iconWrap}>
        <Text style={styles.icon}>⚠️</Text>
      </View>
      <Text accessibilityRole="alert" accessibilityLabel={`${title}. ${message}`} style={styles.title}>
        {title}
      </Text>
      <Text style={styles.muted}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={retryLabel}
        onPress={onRetry}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
      >
        <Text style={styles.ctaText}>{retryLabel}</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    marginTop: spacing[5],
    gap: spacing[2],
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: color.surface.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 30,
  },
  title: {
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  muted: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  cta: {
    backgroundColor: color.brand.navy,
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
  pressed: {
    opacity: 0.85,
  },
  ctaText: {
    color: color.surface.base,
    fontSize: typography.size.button,
    fontWeight: typography.weight.semibold,
  },
});
