/**
 * Technical Data dialog (PHASE 12) — intentional "coming soon" state.
 *
 * Customer technical specifications are not available from the current
 * data model, so this truthfully communicates that. It is informational,
 * never an error, and never fabricates specifications.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/ui/icon';
import { type } from '@/ui/typography';

interface TechnicalDataDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function TechnicalDataDialog({ visible, onClose }: TechnicalDataDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityLabel="البيانات الفنية"
    >
      <View style={styles.scrim}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.card}>
            <View style={styles.header}>
              <Icon name="info" size={22} color={color.brand.navy} />
              <Text accessibilityRole="header" style={styles.title}>
                البيانات الفنية
              </Text>
            </View>
            <Text style={styles.body}>البيانات الفنية ستأتي قريبًا.</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="إغلاق"
              onPress={onClose}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <Text style={styles.closeText}>إغلاق</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: color.overlay.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safe: { width: '100%', alignItems: 'center', paddingHorizontal: spacing[5] },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: color.surface.base,
    borderRadius: radius.xl,
    padding: spacing[5],
    gap: spacing[3],
    direction: 'rtl',
  },
  header: { flexDirection: 'row', direction: 'rtl', alignItems: 'center', gap: spacing[2] },
  title: { ...type.h3, color: color.brand.navy, textAlign: 'right', writingDirection: 'rtl' },
  body: { ...type.body, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  close: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: spacing[5],
    borderRadius: radius.md,
    backgroundColor: color.brand.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { ...type.button, color: color.surface.base },
  pressed: { opacity: 0.85 },
});
