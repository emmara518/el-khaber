import { color, spacing, typography } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

interface GreetingProps {
  line1: string;
  line2: string;
}

/**
 * Centered greeting on the navy header. The reference uses
 * "مرحبا أحمد 👋" followed by a calmer sub-line.
 */
export function Greeting({ line1, line2 }: GreetingProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.line1}>{line1}</Text>
      <Text style={styles.line2}>{line2}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingBottom: spacing[4],
  },
  line1: {
    color: color.surface.base,
    fontSize: typography.size.h2,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
  },
  line2: {
    color: color.surface.base,
    fontSize: typography.size.body,
    marginTop: spacing[1],
    opacity: 0.85,
    textAlign: 'center',
  },
});
