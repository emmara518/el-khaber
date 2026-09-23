import { color, radius, spacing } from '@khabir/ui-tokens';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/**
 * Loading treatment for the Home body. It mirrors the real section rhythm
 * (appliance row → service grid) so the swap to loaded content does not
 * shift the layout. The pulse respects the system Reduce Motion setting.
 */
export function HomeSkeleton({ label }: { label: string }) {
  const opacity = useSharedValue(0.55);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 900, reduceMotion: ReduceMotion.System }),
      -1,
      true,
    );
  }, [opacity]);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={[styles.root, pulse]}
    >
      <Block style={styles.heading} />
      <View style={styles.row}>
        <Block style={styles.appliance} />
        <Block style={styles.appliance} />
        <Block style={styles.appliance} />
      </View>
      <Block style={styles.heading} />
      <View style={styles.row}>
        <Block style={styles.service} />
        <Block style={styles.service} />
        <Block style={styles.service} />
      </View>
    </Animated.View>
  );
}

function Block({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.block, style]} />;
}

const styles = StyleSheet.create({
  root: {
    paddingTop: spacing[6],
    gap: spacing[3],
  },
  block: {
    backgroundColor: color.border.default,
    borderRadius: radius.md,
  },
  heading: {
    width: '45%',
    height: 22,
  },
  row: {
    flexDirection: 'row',
    direction: 'rtl',
    gap: spacing[3],
  },
  appliance: {
    flex: 1,
    height: 158,
    borderRadius: radius.lg,
  },
  service: {
    width: 148,
    height: 174,
    borderRadius: radius.lg,
  },
});
