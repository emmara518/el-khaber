import { color, spacing, typography } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, Pill } from '../../../../ui';

interface LocationPillProps {
  city: string;
  district: string;
  onPress?: () => void;
}

/**
 * The white pill anchored to the bottom of the dark hero. Shows
 * "الرياض - حي النزهة" with a location pin and a chevron.
 */
export function LocationPill({ city, district, onPress }: LocationPillProps) {
  return (
    <View style={styles.wrap}>
      <Pill
        onPress={onPress}
        accessibilityLabel={`${city} - ${district}`}
        background={color.surface.base}
        leading={<Icon name="map-pin" size={14} color={color.brand.gold} accessibilityLabel="الموقع" />}
        trailing={
          <Icon name="chevron-down" size={14} color={color.text.secondary} accessibilityLabel="تغيير الموقع" />
        }
      >
        <Text style={styles.text}>
          {city} - {district}
        </Text>
      </Pill>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingBottom: spacing[4],
  },
  text: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
});
