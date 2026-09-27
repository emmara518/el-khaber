/**
 * Home subscription card (PHASE 11) — a native product card, not a banner.
 *
 * Real data only (subscription view model): shows a promotion when the
 * customer has no active subscription, and a membership summary when
 * they do. Renders nothing while loading/on error so it never shows a
 * half-state or competes with the Home hierarchy.
 */

import { color, radius, shadow, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSubscriptionViewModel } from '@/features/subscriptions/use-subscription-view-model';
import { BrandImage } from '@/ui/brand-image';
import { Icon } from '@/ui/icon';
import { type } from '@/ui/typography';

export function SubscriptionCard({ onPress }: { onPress: () => void }) {
  const vm = useSubscriptionViewModel('customer');
  if (vm.status !== 'loaded') return null;

  const current = vm.current;
  const isActive = current !== null && current.status === 'active';
  const cheapest = [...vm.plans].sort((a, b) => a.price - b.price)[0];

  const eyebrow = isActive ? 'عضويتك' : 'الخبير المميز';
  const title = isActive
    ? `أنت مشترك في ${current.planNameAr}`
    : 'اشترك في الخبير واستفد أكثر';
  const body = isActive
    ? `الحالة: ${current.statusAr} · التجديد ${current.renewalEnabled ? 'مفعّل' : 'موقوف'}`
    : cheapest !== undefined
      ? `باقات بأسعار واضحة تبدأ من ${cheapest.price} ${cheapest.currency} / ${cheapest.billingInterval}.`
      : 'تعرّف على باقات الخبير ومزاياها.';
  const cta = isActive ? 'إدارة الاشتراك' : 'استكشف الباقات';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}. ${cta}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <View style={styles.stage} accessibilityRole="image" accessibilityLabel="الخبير المميز">
          <BrandImage name="premium" size={92} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.body} numberOfLines={3}>
            {body}
          </Text>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{cta}</Text>
            <Icon name="chevron-left" size={16} color={color.surface.base} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.brand.goldSoft,
    borderRadius: radius.xl,
    overflow: 'hidden',
    direction: 'rtl',
    ...shadow.medium,
  },
  row: { flexDirection: 'row', direction: 'rtl', alignItems: 'stretch' },
  stage: { width: '32%', minHeight: 172, alignItems: 'center', justifyContent: 'center' },
  copy: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing[4],
    paddingStart: spacing[3],
    paddingEnd: spacing[4],
    gap: spacing[1],
    justifyContent: 'center',
  },
  eyebrow: { ...type.label, color: color.warning.DEFAULT, textAlign: 'right', writingDirection: 'rtl' },
  title: { ...type.h3, color: color.brand.navy, textAlign: 'right', writingDirection: 'rtl' },
  body: { ...type.caption, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl', marginTop: spacing[1], opacity: 0.85 },
  cta: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    alignSelf: 'flex-start',
    marginTop: spacing[2],
    minHeight: 40,
    paddingHorizontal: spacing[4],
    borderRadius: radius.pill,
    backgroundColor: color.brand.navy,
  },
  ctaText: { ...type.label, color: color.surface.base, writingDirection: 'rtl' },
  pressed: { opacity: 0.9 },
});
