import { color, spacing, typography } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { Pill } from '../../../../ui';

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
        leading={
          <Text style={styles.pin}>📍</Text>
        }
        trailing={
          <Text style={styles.chevron}>⌄</Text>
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
  pin: {
    fontSize: typography.size.body,
  },
  chevron: {
    color: color.text.secondary,
    fontSize: typography.size.body,
  },
  text: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
});
