/**
 * Service request step indicator — 7 steps, compact.
 *
 * Numbered dots with the current step in gold-on-navy and completed
 * steps checked; the textual "الخطوة X من ٧: <name>" announcement
 * carries the state for assistive tech (never color alone).
 */

import { color, spacing, typography } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

const STEPS_AR = [
  'الجهاز',
  'المشكلة',
  'الوصف',
  'الصور',
  'الموقع',
  'الموعد',
  'المراجعة',
] as const;

export function ServiceRequestProgress({ index }: { index: number }) {
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`الخطوة ${index + 1} من ${STEPS_AR.length}: ${STEPS_AR[index]}`}
      style={styles.root}
    >
      <View style={styles.dots}>
        {STEPS_AR.map((label, i) => {
          const done = i < index;
          const current = i === index;
          return (
            <View
              key={label}
              style={[styles.dot, done && styles.dotDone, current && styles.dotCurrent]}
            >
              {done ? (
                <Text style={styles.check}>✓</Text>
              ) : (
                <Text style={[styles.number, current && styles.numberCurrent]}>{i + 1}</Text>
              )}
            </View>
          );
        })}
      </View>
      <Text style={styles.label}>{STEPS_AR[index]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
  number: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
  },
  numberCurrent: {
    color: color.brand.navy,
  },
  label: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
});
