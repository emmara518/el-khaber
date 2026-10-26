/**
 * NotificationPreferencesCard — server-authoritative preference toggles
 * (WP-Notifications).
 *
 * Rendered at the top of the shared notification center for every role.
 * Toggles write through to the server immediately; nothing is considered
 * saved before the server confirms it. While a save is in flight the
 * toggles are disabled; failures surface inline with the last confirmed
 * values kept on screen.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useNotificationPreferencesViewModel } from './use-notification-preferences-view-model';

import type { NotificationsDataSource, NotificationsRole } from './notifications-data-source';

import { AppSwitch, Card, Icon, ListError, ListLoading } from '@/ui';
import { type } from '@/ui/typography';

export function NotificationPreferencesCard({
  role,
  source,
}: {
  role: NotificationsRole;
  /**
   * Testability seam (preview/screenshot harnesses only): overrides the
   * API-backed source. Production callers omit it and hit the server.
   */
  source?: NotificationsDataSource;
}) {
  const vm = useNotificationPreferencesViewModel(role, source);

  if (vm.status === 'loading') {
    return <ListLoading label="جارٍ تحميل تفضيلات الإشعارات" brandAsset="no-requests" />;
  }

  if (vm.status === 'error' || vm.preferences === null) {
    return (
      <ListError
        title="تعذر تحميل التفضيلات"
        message={vm.error ?? ''}
        retryLabel="إعادة المحاولة"
        onRetry={vm.retry}
      />
    );
  }

  const prefs = vm.preferences;

  return (
    <Card background={color.surface.base} padded style={styles.card}>
      <View style={styles.heading}>
        <Icon name="bell" size={18} color={color.brand.navy} />
        <Text style={styles.headingText}>تفضيلات الإشعارات</Text>
      </View>

      <PreferenceRow
        label="تحديثات طلبات الصيانة"
        hint="الحالة والقبول والتعيين والتنفيذ"
        value={prefs.requestStatus}
        disabled={vm.saving}
        onChange={(next) => vm.setPreference('requestStatus', next)}
      />
      <View style={styles.divider} />
      <PreferenceRow
        label="تحديثات الاشتراك والدفع"
        hint="التفعيل ومراجعة إثبات الدفع والتجديد"
        value={prefs.subscription}
        disabled={vm.saving}
        onChange={(next) => vm.setPreference('subscription', next)}
      />

      {vm.saving ? <Text style={styles.saving}>جارٍ الحفظ…</Text> : null}
      {vm.saveError !== null ? (
        <View style={styles.saveErrorRow}>
          <Text accessibilityRole="alert" style={styles.saveError}>
            {vm.saveError}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إعادة محاولة حفظ التفضيلات"
            onPress={() => vm.retry()}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.mandatoryNote}>
        إشعارات التحقق من الحساب والتنبيهات الإدارية المهمة تصل دائمًا ولا يمكن إيقافها.
      </Text>
    </Card>
  );
}

function PreferenceRow({
  label,
  hint,
  value,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <AppSwitch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, gap: spacing[3] },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  headingText: { ...type.cardTitle, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  copy: { flex: 1, gap: 2 },
  label: { ...type.label, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
  hint: { ...type.caption, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  divider: { height: 1, backgroundColor: color.border.default },
  saving: { ...type.caption, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  saveErrorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  saveError: { ...type.caption, color: color.error.ink, textAlign: 'right', writingDirection: 'rtl', flex: 1 },
  retryText: { ...type.label, color: color.brand.navy },
  mandatoryNote: {
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  pressed: { opacity: 0.85 },
});
