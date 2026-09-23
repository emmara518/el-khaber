import { color, spacing } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { REQUEST_GROUPS, requestGroupIndex } from './service-request-scenes';
import { SERVICE_REQUEST_STEPS } from './service-request-types';

import { fontFamily, type } from '@/ui/typography';

const STEPS_AR = ['الجهاز', 'المشكلة', 'الوصف', 'الصور', 'الموقع', 'الموعد', 'المراجعة'];

export function ServiceRequestProgress({ index }: { index: number }) {
  const groupIndex = requestGroupIndex(SERVICE_REQUEST_STEPS[index] ?? 'appliance');
  return (
    <View accessibilityRole="text" accessibilityLiveRegion="polite" accessibilityLabel={`الخطوة ${index + 1} من ٧: ${STEPS_AR[index]}`} style={styles.root}>
      <View style={styles.groups}>
        {REQUEST_GROUPS.map((group, i) => (
          <View key={group.title} style={styles.group}>
            <View style={[styles.line, i <= groupIndex && styles.active]} />
            <Text style={[styles.groupLabel, i === groupIndex && styles.current]}>{group.title}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.label}>{index + 1} / ٧ · {STEPS_AR[index]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingVertical: spacing[4], gap: spacing[2], direction: 'rtl' },
  groups: { flexDirection: 'row', gap: spacing[2] },
  group: { flex: 1, gap: spacing[2] },
  line: { height: 4, borderRadius: 2, backgroundColor: color.border.default },
  active: { backgroundColor: color.brand.gold },
  groupLabel: { ...type.caption, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  current: { color: color.brand.navy, fontFamily: fontFamily.bold },
  label: { ...type.body, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
});
