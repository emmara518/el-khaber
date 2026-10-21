/**
 * StatusUnit — asset-first request status (ISSUE: status asset too small).
 *
 * The approved status emblem is the PRIMARY visual anchor; the Arabic
 * label is supporting text. One architecture for every lifecycle state —
 * only the asset and its semantic tone change.
 *
 * The transparent brand asset sits on the neutral card surface (never a
 * navy fill), and the state is conveyed by asset + label + tone (never
 * colour alone).
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { BrandImage } from './brand-image';
import { fontFamily, type } from './typography';

import type { BrandAssetName } from './brand-assets';
import type { OrderStatus } from '../features/customer/home/data/customer-home-types';
import type { CustomerRequestStatus } from '../features/customer/requests/customer-requests-types';
import type { MerchantProductStatus } from '../features/merchant/products/merchant-product-types';

type AnyStatus = OrderStatus | CustomerRequestStatus | MerchantProductStatus;

interface StatusUnitProps {
  status: AnyStatus;
  label: string;
  /** Approved status emblem — the primary element. */
  icon?: BrandAssetName;
  style?: StyleProp<ViewStyle>;
}

export function StatusUnit({ status, label, icon, style }: StatusUnitProps) {
  return (
    <View accessible accessibilityLabel={label} style={[styles.card, style]}>
      {icon ? <BrandImage name={icon} size={46} /> : null}
      <Text style={[styles.label, { color: TONE[status] }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const TONE: Record<AnyStatus, string> = {
  pending: color.warning.DEFAULT,
  accepted: color.brand.navy,
  on_the_way: color.brand.navy,
  in_progress: color.success.DEFAULT,
  scheduled: color.brand.navy,
  completed: color.text.secondary,
  cancelled: color.error.DEFAULT,
  active: color.success.DEFAULT,
  suspended: color.text.secondary,
};

const styles = StyleSheet.create({
  card: {
    width: 88,
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[1],
    backgroundColor: color.surface.subtle,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.lg,
  },
  label: {
    ...type.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
    fontFamily: fontFamily.semibold,
  },
});
