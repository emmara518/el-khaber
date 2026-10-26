/**
 * AppSwitch — the shared on/off control for role surfaces.
 *
 * React Native Web renders `Switch` as an `<input type="checkbox" role="switch">`;
 * the accessible checked state comes from that input. Extra `aria-checked` /
 * `accessibilityState` props land on the wrapper `div`, which has no role and
 * therefore produces an invalid-ARIA report. This component passes only the
 * supported props.
 *
 * Visual state mapping (tokens only):
 * - off: neutral track + white thumb
 * - on: navy track + gold thumb (high contrast, brand-consistent)
 *
 * On web the active thumb/track colours must be explicit (`activeThumbColor` /
 * `activeTrackColor`); otherwise RN Web falls back to its teal defaults.
 */

import { color } from '@khabir/ui-tokens';
import { Platform, StyleSheet, Switch, type SwitchProps } from 'react-native';

export interface AppSwitchColors {
  readonly track: string;
  readonly thumb: string;
}

/** Pure visual mapping (unit-tested). */
export function switchColors(value: boolean): AppSwitchColors {
  return {
    track: value ? color.brand.navy : color.border.default,
    thumb: value ? color.brand.gold : color.surface.base,
  };
}

export interface AppSwitchProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
}

const WEB_ACTIVE_PROPS =
  Platform.OS === 'web'
    ? ({
        activeTrackColor: color.brand.navy,
        activeThumbColor: color.brand.gold,
      } as unknown as Partial<SwitchProps>)
    : {};

export function AppSwitch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: AppSwitchProps) {
  const colors = switchColors(value);
  return (
    <Switch
      {...WEB_ACTIVE_PROPS}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ false: color.border.default, true: color.brand.navy }}
      thumbColor={colors.thumb}
      ios_backgroundColor={color.border.default}
      style={styles.switch}
    />
  );
}

const styles = StyleSheet.create({
  // Web: 48x26 keeps the switch above the 24px touch-target minimum.
  // Native keeps the platform switch's own (already adequate) size.
  switch: Platform.OS === 'web' ? { width: 48, height: 26 } : {},
});
