/**
 * Reusable Customer step progress (connected stepper).
 *
 * Replaces detached floating circles with a deliberate workflow
 * component: connected nodes on a progress track, with three explicit
 * states — completed, current, upcoming — communicated by shape, fill
 * AND text (never colour alone).
 *
 * RTL: the steps array is rendered in logical order; because the app is
 * RTL, step 0 is the right-most node, preserving الجهاز → العرض → النتيجة.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/ui/icon';
import { fontFamily, type } from '@/ui/typography';

const NODE = 32;

interface StepProgressProps {
  /** Ordered step labels (logical order, not visual). */
  steps: ReadonlyArray<string>;
  /** 0-based index of the current step. */
  current: number;
}

export function StepProgress({ steps, current }: StepProgressProps) {
  const last = steps.length - 1;
  const currentLabel = steps[current] ?? '';
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`الخطوة ${current + 1} من ${steps.length}: ${currentLabel}`}
      style={styles.root}
    >
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <Fragment key={label}>
            <View style={styles.nodeWrap}>
              <View
                style={[
                  styles.node,
                  done && styles.nodeDone,
                  active && styles.nodeCurrent,
                ]}
              >
                {done ? (
                  <Icon name="check" size={15} color={color.surface.base} />
                ) : active ? (
                  <View style={styles.currentDot} />
                ) : null}
              </View>
              <Text
                style={[
                  styles.label,
                  done && styles.labelDone,
                  active && styles.labelCurrent,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
            {index < last ? (
              <View style={[styles.connector, index < current && styles.connectorDone]} />
            ) : null}
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'flex-start',
    paddingVertical: spacing[4],
  },
  nodeWrap: {
    alignItems: 'center',
    width: 72,
  },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: 2,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDone: {
    borderColor: color.brand.navy,
    backgroundColor: color.brand.navy,
  },
  nodeCurrent: {
    borderColor: color.brand.navy,
    backgroundColor: color.brand.gold,
  },
  currentDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: color.brand.navy,
  },
  connector: {
    flex: 1,
    height: 2,
    marginTop: NODE / 2 - 1,
    marginHorizontal: -spacing[3],
    backgroundColor: color.border.default,
  },
  connectorDone: {
    backgroundColor: color.brand.navy,
  },
  label: {
    ...type.caption,
    color: color.text.secondary,
    marginTop: spacing[1],
    textAlign: 'center',
  },
  labelDone: {
    color: color.text.primary,
    fontFamily: fontFamily.semibold,
  },
  labelCurrent: {
    color: color.brand.navy,
    fontFamily: fontFamily.bold,
  },
});
