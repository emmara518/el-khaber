/**
 * Fault Guide progress indicator — الجهاز → العرض → النتيجة.
 *
 * Dots + connecting line + Arabic labels; the current step is navy
 * with a gold dot, completed steps are navy checks, upcoming steps
 * are muted. State is also in text (current step announced), never
 * color alone.
 */

import { color, spacing, typography } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

const STEPS_AR = ['الجهاز', 'العرض', 'النتيجة'] as const;

export function FaultProgressIndicator({ position }: { position: 0 | 1 | 2 }) {
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`خطوة ${position + 1} من 3: ${STEPS_AR[position]}`}
      style={styles.root}
    >
      {STEPS_AR.map((label, index) => {
        const done = index < position;
        const current = index === position;
        return (
          <View key={label} style={styles.segment}>
            <View style={styles.row}>
              <View
                style={[
                  styles.dot,
                  done && styles.dotDone,
                  current && styles.dotCurrent,
                ]}
              >
                {done ? <Text style={styles.check}>✓</Text> : null}
              </View>
              {index < STEPS_AR.length - 1 ? (
                <View style={[styles.line, index < position && styles.lineDone]} />
              ) : null}
            </View>
            <Text
              style={[
                styles.label,
                (done || current) && styles.labelActive,
              ]}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing[3],
  },
  segment: {
    flex: 1,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
  line: {
    position: 'absolute',
    start: '60%',
    end: '-40%',
    height: 2,
    backgroundColor: color.border.default,
  },
  lineDone: {
    backgroundColor: color.brand.navy,
  },
  label: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'center',
  },
  labelActive: {
    color: color.text.primary,
    fontWeight: typography.weight.bold,
  },
});
