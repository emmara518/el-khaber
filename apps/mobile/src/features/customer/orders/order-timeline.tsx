/**
 * Order timeline — vertical stepper for the documented lifecycle.
 *
 * Done steps: navy check. Current step: gold dot + emphasized card.
 * Upcoming steps: muted. State is text + icon, never color alone;
 * timestamps render only when fixture data provides them.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import type { TimelineStep } from './order-detail-types';

export function OrderTimeline({ steps }: { steps: ReadonlyArray<TimelineStep> }) {
  return (
    <View accessibilityLabel="مراحل الطلب" style={styles.root}>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <View
            key={step.status}
            accessibilityRole="text"
            accessibilityLabel={`${step.titleAr}، ${step.state === 'done' ? 'مكتملة' : step.state === 'current' ? 'المرحلة الحالية' : 'قادمة'}${step.atAr ? `، ${step.atAr}` : ''}`}
            style={styles.row}
          >
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  step.state === 'done' && styles.dotDone,
                  step.state === 'current' && styles.dotCurrent,
                ]}
              >
                {step.state === 'done' ? <Text style={styles.check}>✓</Text> : null}
                {step.state === 'current' ? <View style={styles.pulse} /> : null}
              </View>
              {last ? null : (
                <View style={[styles.line, step.state === 'done' && styles.lineDone]} />
              )}
            </View>
            <View style={[styles.card, step.state === 'current' && styles.cardCurrent]}>
              <Text style={[styles.title, step.state === 'upcoming' && styles.muted]}>
                {step.titleAr}
              </Text>
              <Text style={[styles.explanation, step.state === 'upcoming' && styles.muted]}>
                {step.explanationAr}
              </Text>
              {step.atAr !== null ? <Text style={styles.time}>{step.atAr}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  rail: {
    alignItems: 'center',
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    borderColor: color.brand.navy,
    backgroundColor: color.brand.navy,
  },
  dotCurrent: {
    borderColor: color.brand.navy,
    backgroundColor: color.brand.gold,
  },
  check: {
    color: color.surface.base,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
  },
  pulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: color.brand.navy,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: color.border.default,
  },
  lineDone: {
    backgroundColor: color.brand.navy,
  },
  card: {
    flex: 1,
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  cardCurrent: {
    borderColor: color.brand.gold,
    borderWidth: 2,
  },
  title: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  explanation: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  time: {
    color: color.brand.navy,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    marginTop: spacing[2],
    textAlign: 'right',
  },
  muted: {
    color: color.text.secondary,
  },
});
