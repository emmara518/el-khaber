import { color, radius, shadow, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BrandAssetName } from '@/ui/brand-assets';

import { BrandImage } from '@/ui/brand-image';
import { type } from '@/ui/typography';


interface ServiceCardProps {
  title: string;
  body: string;
  asset: BrandAssetName;
  onPress: () => void;
  accessibilityLabel?: string;
}

/**
 * Service card — asset-led. The approved brand feature mark leads on a
 * large neutral stage, so the service is recognised visually before the
 * title and supporting line are read.
 */
export function ServiceCard({ title, body, asset, onPress, accessibilityLabel }: ServiceCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${title}، ${body}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.stage}>
        <BrandImage name={asset} size={76} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {body}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 148,
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.low,
  },
  pressed: {
    opacity: 0.9,
  },
  stage: {
    height: 96,
    backgroundColor: color.surface.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    padding: spacing[3],
    gap: spacing[1],
  },
  title: {
    ...type.cardTitle,
    color: color.brand.navy,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  body: {
    ...type.caption,
    color: color.text.secondary,
    minHeight: 34,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
