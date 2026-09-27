/**
 * Technician Services screen (T-F) — Customer visual language.
 *
 * AppHeader → PageTitle → attached service cards → add action →
 * catalog sheet. Removal is a separated destructive action behind a
 * confirmation. No cinematic header; approved assets only, no prices
 * invented (a server `priceFrom` shows only when present).
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { availableCatalogServices, type TechnicianAttachedService } from './technician-services-types';
import { useTechnicianServicesViewModel } from './use-technician-services-view-model';

import {
  ActionButton,
  AppHeader,
  BrandImage,
  Card,
  Icon,
  ListEmpty,
  ListError,
  ListLoading,
  PageTitle,
  SectionHeading,
} from '@/ui';
import { fontFamily, type } from '@/ui/typography';

function ServiceTile() {
  return (
    <View style={styles.tile}>
      <BrandImage name="maintenance" size={40} />
    </View>
  );
}

export default function TechnicianServicesScreen() {
  const router = useRouter();
  const vm = useTechnicianServicesViewModel();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<TechnicianAttachedService | null>(null);

  const available = availableCatalogServices(vm.catalog, vm.attached);
  const busy = vm.actionStatus === 'submitting' || vm.actionStatus === 'removing';

  return (
    <View style={styles.root}>
      <AppHeader
        onPressNotifications={() => router.push('/(technician)/notifications')}
        onPressAvatar={() => router.push('/(technician)/profile')}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageTitle eyebrow="التخصص والخدمات" title="الخدمات" body="أضف الخدمات التي تقدّمها ليراها العملاء عند الطلب." />

        {vm.loadStatus === 'loading' ? <ListLoading label="جارٍ تحميل الخدمات" brandAsset="toolbox" /> : null}
        {vm.loadStatus === 'error' ? (
          <ListError
            title="تعذر تحميل الخدمات"
            message={vm.loadError?.message ?? ''}
            retryLabel="إعادة المحاولة"
            onRetry={vm.reload}
          />
        ) : null}

        {vm.loadStatus === 'loaded' ? (
          <>
            {vm.actionStatus === 'error' && vm.actionError !== null ? (
              <View accessibilityRole="alert" accessibilityLabel={`خطأ: ${vm.actionError}`} style={styles.inlineError}>
                <Text style={styles.inlineErrorText}>{vm.actionError}</Text>
              </View>
            ) : null}

            <View style={styles.section}>
              <SectionHeading title="خدماتك الحالية" eyebrow="ما تقدّمه للعملاء" />
              {vm.attached.length === 0 ? (
                <ListEmpty
                  icon="tool"
                  iconLabel="لا توجد خدمات"
                  brandAsset="no-requests"
                  title="لم تُضف خدمات بعد"
                  body="أضف الخدمات التي تقدمها من كتالوج الخدمات ليظهر ملفك للعملاء."
                  actionLabel="إضافة خدمة"
                  onAction={() => setCatalogOpen(true)}
                />
              ) : (
                <View style={styles.list}>
                  {vm.attached.map((service) => (
                    <Card key={service.serviceId} background={color.surface.base} padded style={styles.card}>
                      <View style={styles.row}>
                        <ServiceTile />
                        <View style={styles.copy}>
                          <Text style={styles.name} numberOfLines={1}>
                            {service.nameAr}
                          </Text>
                          <Text style={styles.meta} numberOfLines={1}>
                            {[service.applianceNameAr, service.priceFrom !== null ? `يبدأ من ${service.priceFrom}` : '']
                              .filter((p) => p.length > 0)
                              .join(' · ') || 'خدمة معتمدة'}
                          </Text>
                        </View>
                        <ActionButton
                          variant="destructive"
                          label="إزالة"
                          disabled={busy}
                          loading={vm.pendingServiceId === service.serviceId && vm.actionStatus === 'removing'}
                          loadingLabel="جارٍ الإزالة"
                          onPress={() => setConfirmRemove(service)}
                          style={styles.remove}
                        />
                      </View>
                    </Card>
                  ))}
                </View>
              )}
              <ActionButton icon="plus" label="إضافة خدمة" onPress={() => setCatalogOpen(true)} />
            </View>
          </>
        ) : null}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal
        visible={catalogOpen}
        transparent
        animationType="slide"
        accessibilityLabel="كتالوج الخدمات"
        onRequestClose={() => setCatalogOpen(false)}
      >
        <View style={styles.scrim}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text accessibilityRole="header" style={styles.sheetTitle}>
                كتالوج الخدمات
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="إغلاق الكتالوج"
                onPress={() => setCatalogOpen(false)}
                style={styles.close}
              >
                <Icon name="x" size={20} color={color.text.primary} accessibilityLabel="إغلاق" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.catalog} showsVerticalScrollIndicator={false}>
              {available.length === 0 ? (
                <Text style={styles.muted}>تمت إضافة كل الخدمات المتاحة إلى ملفك.</Text>
              ) : (
                available.map((item) => {
                  const pending = vm.pendingServiceId === item.id && vm.actionStatus === 'submitting';
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityLabel={`إضافة خدمة ${item.nameAr}`}
                      accessibilityState={{ disabled: busy }}
                      disabled={busy}
                      onPress={() => vm.add(item.id)}
                      style={({ pressed }) => [pressed && styles.pressed, busy && styles.disabledRow]}
                    >
                      <Card background={color.surface.base} padded style={styles.catalogCard}>
                        <View style={styles.copy}>
                          <Text style={styles.name}>{item.nameAr}</Text>
                          {item.applianceNameAr.length > 0 ? <Text style={styles.meta}>{item.applianceNameAr}</Text> : null}
                        </View>
                        {pending ? (
                          <ActivityIndicator accessibilityLabel="جارٍ الإضافة" color={color.brand.navy} />
                        ) : (
                          <Icon name="plus-circle" size={22} color={color.brand.navy} accessibilityLabel="إضافة" />
                        )}
                      </Card>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={confirmRemove !== null}
        transparent
        animationType="fade"
        accessibilityLabel="تأكيد إزالة الخدمة"
        onRequestClose={() => setConfirmRemove(null)}
      >
        <View style={styles.scrimCenter}>
          <Card background={color.surface.base} padded style={styles.dialog}>
            <Text accessibilityRole="header" style={styles.dialogTitle}>
              إزالة الخدمة
            </Text>
            <Text style={styles.body}>
              {confirmRemove !== null ? `سيتم إزالة «${confirmRemove.nameAr}» من خدماتك. يمكنك إضافتها لاحقًا.` : ''}
            </Text>
            <View style={styles.dialogActions}>
              <ActionButton
                variant="destructiveSolid"
                label="نعم، إزالة"
                loading={busy}
                loadingLabel="جارٍ الإزالة"
                onPress={() => {
                  if (confirmRemove !== null) vm.remove(confirmRemove.serviceId);
                  setConfirmRemove(null);
                }}
                style={styles.dialogAction}
              />
              <ActionButton variant="secondary" label="تراجع" onPress={() => setConfirmRemove(null)} style={styles.dialogAction} />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle },
  content: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[8], gap: spacing[4] },
  section: { gap: spacing[3] },
  list: { gap: spacing[3] },
  card: { gap: spacing[2] },
  row: { flexDirection: 'row', direction: 'rtl', alignItems: 'center', gap: spacing[3] },
  tile: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: color.surface.subtle,
    borderWidth: 1,
    borderColor: color.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: spacing[1] },
  name: { ...type.cardTitle, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
  meta: { ...type.caption, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  remove: { minHeight: 44, paddingVertical: spacing[2] },
  inlineError: {
    backgroundColor: color.error.soft,
    borderWidth: 1,
    borderColor: color.error.DEFAULT,
    borderRadius: radius.md,
    padding: spacing[3],
  },
  inlineErrorText: { ...type.body, color: color.error.DEFAULT, textAlign: 'right', writingDirection: 'rtl' },
  bottomSpacer: { height: spacing[2] },
  scrim: { flex: 1, backgroundColor: color.overlay.scrim, justifyContent: 'flex-end' },
  scrimCenter: {
    flex: 1,
    backgroundColor: color.overlay.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  sheet: {
    backgroundColor: color.surface.subtle,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
    paddingTop: spacing[4],
  },
  sheetHeader: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  sheetTitle: { ...type.h3, color: color.text.primary, textAlign: 'right', fontFamily: fontFamily.bold },
  close: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  catalog: { paddingHorizontal: spacing[4], paddingBottom: spacing[6], gap: spacing[3] },
  catalogCard: { flexDirection: 'row', direction: 'rtl', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] },
  muted: { ...type.body, color: color.text.secondary, textAlign: 'center', writingDirection: 'rtl', paddingVertical: spacing[5] },
  pressed: { opacity: 0.85 },
  disabledRow: { opacity: 0.5 },
  dialog: { width: '100%', maxWidth: 420, gap: spacing[2] },
  dialogTitle: { ...type.h3, color: color.text.primary, textAlign: 'right', fontFamily: fontFamily.bold },
  body: { ...type.body, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
  dialogActions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
  dialogAction: { flex: 1 },
});
