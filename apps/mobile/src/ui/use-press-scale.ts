/**
 * usePressScale — one restrained press-feedback motion utility.
 *
 * Replaces the several hand-rolled `useSharedValue(1)` + `withTiming`
 * copies scattered across cards, tab items and CTAs. A short scale dip on
 * press-in and an ease back on press-out; both honour the OS Reduce Motion
 * preference, so motion never blocks or distracts users who opted out.
 *
 * Returns props to spread onto an `Animated.View` that wraps the pressable
 * content. Durations are intentionally tiny (100ms in / 150ms out) so the
 * effect reads as feedback, never as a task delay.
 */

import { useCallback } from 'react';
import { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export function usePressScale(pressedScale = 0.97) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const animate = useCallback(
    (pressed: boolean) => {
      scale.value = withTiming(pressed ? pressedScale : 1, {
        duration: pressed ? 100 : 150,
        reduceMotion: ReduceMotion.System,
      });
    },
    [pressedScale, scale],
  );
  return {
    style,
    onPressIn: useCallback(() => animate(true), [animate]),
    onPressOut: useCallback(() => animate(false), [animate]),
  };
}
