/**
 * Merchant Home — Product summary metric.
 *
 * A compact operational count card (value + label) on a semantic soft
 * surface, carrying an approved brand mark. Only REAL counts are passed in
 * — the callback of the caller decides which metrics exist. Reuses the
 * shared tokens/typography; not a new design language.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import type { BrandAssetName } from '@/ui';

import { BrandImage, type } from '@/ui';


export type MerchantMetricTone = 'success' | 'gold' | 'neutral';

export function MerchantMetricCard({
  value,
  label,
  asset,
  tone,
}: {
  value: number;
  label: string;
  asset: BrandAssetName;
  tone: MerchantMetricTone;
}) {
  const background =
    tone === 'success' ? color.success.soft : tone === 'gold' ? color.brand.goldSoft : color.surface.subtle;
  return (
    <View
      style={[styles.card, { backgroundColor: background }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${String(value)} ${label}`}
    >
      <BrandImage name={asset} size={28} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: 88,
    borderRadius: radius.lg,
    padding: spacing[3],
    gap: spacing[1],
    alignItems: 'flex-start',
    minWidth: 0,
  },
  value: {
    ...type.number,
    fontSize: 26,
    lineHeight: 34,
    color: color.brand.navy,
    textAlign: 'right',
  },
  label: {
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
