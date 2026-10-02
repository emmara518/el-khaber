import { color, radius, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { priceLineAr } from '../../src/features/subscriptions/subscription-presentation';
import {
  canCancelRenewal,
  canSelectPlan,
  subscribeNextAction,
  type PaymentMethod,
  type SubscriptionPlan,
} from '../../src/features/subscriptions/subscription-types';
import {
  useSubscriptionViewModel,
  type SubscriptionViewState,
} from '../../src/features/subscriptions/use-subscription-view-model';
import { ListError, ListLoading } from '../../src/ui';

import { useI18n } from '@/i18n/use-i18n';
import { AppHeader, Card, Icon, PageTitle, type } from '@/ui';

export default function SubscriptionScreen() {
  const vm = useSubscriptionViewModel('customer');
  const { t } = useI18n();
  const router = useRouter();
  const current = vm.current;

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [chosenMethod, setChosenMethod] = useState<PaymentMethod | null>(null);
  const [reference, setReference] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  function openPayment(plan: SubscriptionPlan): void {
    setSelectedPlan(plan);
    setChosenMethod(null);
    setReference('');
    setLocalError(null);
    vm.resetSubmit();
  }
  function closePayment(): void {
    setSelectedPlan(null);
    vm.resetSubmit();
  }
  function submitPayment(): void {
    if (selectedPlan === null) return;
    if (chosenMethod === null) {
      setLocalError('اختر طريقة الدفع');
      return;
    }
    if (reference.trim().length < 4) {
      setLocalError('أدخل مرجع التحويل (٤ أحرف على الأقل)');
      return;
    }
    setLocalError(null);
    vm.submitPayment({
      planId: selectedPlan.id,
      method: chosenMethod,
      transferReference: reference.trim(),
    });
  }

  return (
    <View style={styles.root}>
      <AppHeader
        onPressNotifications={() => router.push('/(customer)/notifications')}
        onPressAvatar={() => router.push('/(customer)/profile')}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {vm.status === 'loading' ? <ListLoading label={t('state.loading')} /> : null}
      {vm.status === 'error' ? (
        <ListError
          title="تعذر تحميل الاشتراك"
          message={vm.error?.message ?? ''}
          retryLabel={t('state.retry')}
          onRetry={vm.reload}
        />
      ) : null}
      {vm.status === 'loaded' ? (
        <>
          <View style={styles.titleWrap}>
            <PageTitle
              eyebrow="الاشتراكات"
              title={current?.planNameAr ?? 'لا يوجد اشتراك نشط'}
              body={
                current === null
                  ? 'استعرض الباقات المتاحة. يتم تفعيل الاشتراك بعد مراجعة الدفع من الإدارة.'
                  : 'يتم تفعيل الاشتراك بعد مراجعة الدفع من الإدارة، ويمكنك متابعة حالة طلباتك أدناه.'
              }
            />
          </View>
          <View style={styles.sections}>
            {current !== null ? (
              <Card background={color.surface.base} padded style={styles.card}>
                <Text style={styles.sectionTitle}>اشتراكك الحالي</Text>
                <Text style={styles.planName}>{current.planNameAr}</Text>
                <Text style={styles.metaText}>الحالة: {current.statusAr}</Text>
                <Text style={styles.metaText}>
                  ينتهي في: {formatPeriodEnd(current.currentPeriodEnd)}
                </Text>
                <Text style={styles.metaText}>
                  التجديد: {current.renewalEnabled ? 'مفعّل' : 'موقوف'}
                </Text>
                <Text style={styles.metaText}>
                  {priceLineAr(current.price, current.currency, current.billingInterval)}
                </Text>
                {canCancelRenewal(current) ? (
                  <>
                    {vm.cancelError !== null ? (
                      <Text accessibilityRole="alert" style={styles.error}>
                        {vm.cancelError}
                      </Text>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="إيقاف التجديد التلقائي"
                      disabled={vm.cancelling}
                      onPress={vm.cancelRenewal}
                      style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                    >
                      {vm.cancelling ? (
                        <ActivityIndicator accessibilityLabel="جارٍ الإيقاف" color={color.brand.navy} />
                      ) : (
                        <Text style={styles.secondaryText}>إيقاف التجديد التلقائي</Text>
                      )}
                    </Pressable>
                  </>
                ) : null}
              </Card>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>الباقات المتاحة</Text>
              {vm.plans.length === 0 ? (
                <Card background={color.surface.base} padded>
                  <Text style={styles.muted}>لا توجد باقات متاحة حاليًا.</Text>
                </Card>
              ) : (
                vm.plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    isCurrent={current?.status === 'active' && current.planId === plan.id}
                    selectable={canSelectPlan(plan, current)}
                    nextLabel={subscribeNextAction(plan, current).labelAr}
                    onSelect={() => openPayment(plan)}
                  />
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>طلبات الدفع</Text>
              {vm.submissions.length === 0 ? (
                <Card background={color.surface.base} padded>
                  <Text style={styles.muted}>لا توجد طلبات دفع سابقة.</Text>
                </Card>
              ) : (
                vm.submissions.map((submission) => (
                  <Card key={submission.id} background={color.surface.base} padded style={styles.card}>
                    <Text style={styles.metaText}>الحالة: {submission.statusAr}</Text>
                    <Text style={styles.muted}>المرجع: {submission.transferReference}</Text>
                  </Card>
                ))
              )}
            </View>
          </View>
        </>
      ) : null}

      <PaymentDialog
        vm={vm}
        plan={selectedPlan}
        method={chosenMethod}
        reference={reference}
        localError={localError}
        onSelectMethod={setChosenMethod}
        onChangeReference={setReference}
        onSubmit={submitPayment}
        onClose={closePayment}
      />
      </ScrollView>
    </View>
  );
}

function PlanCard({
  plan,
  isCurrent,
  selectable,
  nextLabel,
  onSelect,
}: {
  plan: SubscriptionPlan;
  isCurrent: boolean;
  selectable: boolean;
  nextLabel: string;
  onSelect: () => void;
}) {
  return (
    <Card
      background={isCurrent ? color.brand.goldSoft : color.surface.base}
      borderColor={isCurrent ? color.brand.gold : color.border.default}
      padded
      style={styles.card}
    >
      <Text style={styles.planName}>{plan.nameAr}</Text>
      <Text style={styles.metaText}>
        {priceLineAr(plan.price, plan.currency, plan.billingInterval)}
      </Text>
      <Text style={styles.muted}>{nextLabel}</Text>
      {selectable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`اختيار باقة ${plan.nameAr}`}
          onPress={onSelect}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>اختيار الباقة</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

function PaymentDialog({
  vm,
  plan,
  method,
  reference,
  localError,
  onSelectMethod,
  onChangeReference,
  onSubmit,
  onClose,
}: {
  vm: SubscriptionViewState;
  plan: SubscriptionPlan | null;
  method: PaymentMethod | null;
  reference: string;
  localError: string | null;
  onSelectMethod: (method: PaymentMethod) => void;
  onChangeReference: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  if (plan === null) return null;

  const selectedMethodConfig = vm.methods.find((m) => m.method === method) ?? null;
  const submitting = vm.submitStatus === 'submitting';
  const succeeded = vm.submitStatus === 'success';

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      accessibilityLabel="طلب دفع الاشتراك"
      onRequestClose={onClose}
    >
      <View style={styles.scrim}>
        <Card background={color.surface.base} padded style={styles.dialog}>
          <Text accessibilityRole="header" style={styles.dialogTitle}>
            طلب اشتراك: {plan.nameAr}
          </Text>
          <Text style={styles.metaText}>
            {priceLineAr(plan.price, plan.currency, plan.billingInterval)}
          </Text>

          {succeeded ? (
            <>
              <View style={styles.successBox}>
                <Icon name="check-circle" size={18} color={color.success.DEFAULT} accessibilityLabel="تم الإرسال" />
                <Text style={styles.muted}>تم إرسال طلب الدفع. سيُفعّل الاشتراك بعد مراجعة الإدارة.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="إغلاق"
                onPress={onClose}
                style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
              >
                <Text style={styles.primaryText}>إغلاق</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>طريقة الدفع</Text>
              {vm.methods.length === 0 ? (
                <Text style={styles.muted}>لا توجد وسائل دفع مفعّلة حاليًا.</Text>
              ) : (
                <View style={styles.methods}>
                  {vm.methods.map((option) => {
                    const selected = method === option.method;
                    return (
                      <Pressable
                        key={option.method}
                        accessibilityRole="radio"
                        accessibilityLabel={`طريقة الدفع: ${option.displayName}${selected ? '، محدد حاليًا' : ''}`}
                        accessibilityState={{ selected, checked: selected }}
                        onPress={() => onSelectMethod(option.method)}
                        style={({ pressed }) => [styles.method, selected && styles.methodSelected, pressed && styles.pressed]}
                      >
                        <Text style={[styles.methodText, selected && styles.methodTextSelected]}>
                          {option.displayName}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {selectedMethodConfig !== null ? (
                <Text style={styles.muted}>
                  حوّل المبلغ إلى: {selectedMethodConfig.displayName} — {selectedMethodConfig.accountIdentifier}
                </Text>
              ) : null}

              <Text style={styles.fieldLabel}>مرجع التحويل</Text>
              <TextInput
                accessibilityLabel="مرجع التحويل"
                placeholder="مثال: رقم عملية التحويل"
                placeholderTextColor={color.text.secondary}
                value={reference}
                onChangeText={onChangeReference}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
                style={styles.input}
                textAlign="right"
              />

              {localError !== null ? (
                <Text accessibilityRole="alert" style={styles.error}>{localError}</Text>
              ) : null}
              {vm.submitError !== null ? (
                <Text accessibilityRole="alert" style={styles.error}>{vm.submitError}</Text>
              ) : null}

              <Text style={styles.note}>
                لن يُفعّل الاشتراك تلقائيًا؛ تتم المراجعة من الإدارة بعد التسجيل.
              </Text>

              <View style={styles.dialogActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="إرسال طلب الدفع"
                  accessibilityState={{ disabled: submitting, busy: submitting }}
                  onPress={onSubmit}
                  disabled={submitting}
                  style={({ pressed }) => [styles.primary, submitting && styles.disabled, pressed && !submitting && styles.pressed]}
                >
                  {submitting ? (
                    <ActivityIndicator accessibilityLabel="جارٍ إرسال الطلب" color={color.surface.base} />
                  ) : (
                    <Text style={styles.primaryText}>
                      {vm.submitStatus === 'error' ? 'إعادة المحاولة' : 'إرسال طلب الدفع'}
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="إلغاء"
                  onPress={onClose}
                  disabled={submitting}
                  style={({ pressed }) => [styles.secondaryInline, pressed && styles.pressed]}
                >
                  <Text style={styles.secondaryText}>إلغاء</Text>
                </Pressable>
              </View>
            </>
          )}
        </Card>
      </View>
    </Modal>
  );
}

function formatPeriodEnd(iso: string): string {
  return new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle, direction: 'rtl' },
  content: { paddingTop: spacing[6], paddingBottom: spacing[8], direction: 'rtl' },
  titleWrap: { paddingHorizontal: spacing[5], paddingBottom: spacing[4] },
  sections: { paddingHorizontal: spacing[5], gap: spacing[4] },
  section: { gap: spacing[3] },
  sectionTitle: { ...type.h3, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
  card: { gap: spacing[1], marginBottom: spacing[3] },
  planName: { ...type.h3, color: color.brand.navy, textAlign: 'right', writingDirection: 'rtl' },
  metaText: { ...type.body, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  muted: { ...type.body, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  error: { ...type.body, color: color.error.DEFAULT, textAlign: 'right', writingDirection: 'rtl' },
  note: { ...type.caption, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  fieldLabel: { ...type.bodyMedium, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl', marginTop: spacing[2] },
  primary: {
    backgroundColor: color.brand.navy,
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
  primaryText: { ...type.button, color: color.surface.base },
  secondary: {
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    borderRadius: radius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
  secondaryText: { ...type.bodyMedium, color: color.brand.navy },
  secondaryInline: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    borderRadius: radius.md,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methods: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  method: {
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    backgroundColor: color.surface.base,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    minHeight: 44,
    justifyContent: 'center',
  },
  methodSelected: { borderColor: color.brand.navy, borderWidth: 2 },
  methodText: { ...type.body, color: color.text.secondary },
  methodTextSelected: { ...type.bodyMedium, color: color.text.primary },
  input: {
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.md,
    backgroundColor: color.surface.base,
    ...type.body,
    color: color.text.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 52,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[2] },
  scrim: { flex: 1, backgroundColor: color.overlay.scrim, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[6] },
  dialog: { width: '100%', maxWidth: 460, gap: spacing[2] },
  dialogTitle: { ...type.h3, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
  dialogActions: { flexDirection: 'row', direction: 'rtl', gap: spacing[3], marginTop: spacing[3] },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
});
