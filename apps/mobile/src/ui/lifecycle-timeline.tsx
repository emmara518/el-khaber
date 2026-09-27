/**
 * LifecycleTimeline — the shared vertical status progression used by
 * Technician request/active-service screens. Presentation only: the
 * caller supplies the ordered steps (labels + state) from the
 * server-owned lifecycle. Never colour alone — marker + label + state.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from './icon';
import { fontFamily, type } from './typography';

export type LifecycleStepState = 'done' | 'current' | 'upcoming';

export interface LifecycleStep {
  key: string;
  label: string;
  state: LifecycleStepState;
}

const STATE_LABEL_AR: Record<LifecycleStepState, string> = {
  done: 'مكتملة',
  current: 'الآن',
  upcoming: 'قادمة',
};

export function LifecycleTimeline({ steps }: { steps: ReadonlyArray<LifecycleStep> }) {
  return (
    <View>
      {steps.map((step) => (
        <View
          key={step.key}
          style={styles.step}
          accessible
          accessibilityLabel={`${step.label}، ${STATE_LABEL_AR[step.state]}`}
        >
          <View style={[styles.marker, step.state !== 'upcoming' && styles.reached]}>
            <Icon
              name={step.state === 'done' ? 'check' : 'clock'}
              size={16}
              color={step.state === 'upcoming' ? color.text.secondary : color.surface.base}
            />
          </View>
          <Text style={[styles.label, step.state === 'current' && styles.current]}>{step.label}</Text>
          <Text style={styles.state}>{STATE_LABEL_AR[step.state]}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', direction: 'rtl', alignItems: 'center', gap: spacing[3], minHeight: 44 },
  marker: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: color.surface.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reached: { backgroundColor: color.brand.navy },
  label: {
    flex: 1,
    ...type.body,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  current: { fontFamily: fontFamily.bold, color: color.brand.navy },
  state: { ...type.caption, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
});
