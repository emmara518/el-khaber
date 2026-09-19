import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ListError, ListLoading } from '../../src/features/customer/components/list-state-view';
import { canCancelRenewal, subscribeNextAction } from '../../src/features/subscriptions/subscription-types';
import { useSubscriptionViewModel } from '../../src/features/subscriptions/use-subscription-view-model';

import { useI18n } from '@/i18n/use-i18n';
import { SceneAction, SceneHero, SceneSection } from '@/ui/cinematic';
import { Icon } from '@/ui/icon';

export default function SubscriptionScreen() {
  const vm = useSubscriptionViewModel('customer');
  const { t } = useI18n();
  const current = vm.current;
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {vm.status === 'loading' ? <ListLoading label={t('state.loading')} /> : null}
      {vm.status === 'error' ? (
        <ListError title="تعذر تحميل الاشتراك" message={vm.error?.message ?? ''} retryLabel={t('state.retry')} onRetry={vm.reload} />
      ) : null}
      {vm.status === 'loaded' ? (
        <>
          <SceneHero compact asset="subscription_hero" eyebrow="الاشتراكات · قراءة فقط" title={current?.planNameAr ?? 'لا يوجد اشتراك نشط'} body={current === null
            ? 'تعرض هذه الشاشة باقاتك المتاحة وحالة اشتراكك. الشراء الإلكتروني غير متاح بعد؛ للأكثر أمانًا لا نعد بتفعيل قبل تأكيد الإدارة.'
            : `حالة الاشتراك: ${current.statusAr}.`} />
          <View style={styles.sections}>
            {current !== null ? (
              <SceneSection eyebrow="اشتراكك الحالي" title={current.planNameAr} body={`الحالة: ${current.statusAr} · التجديد ${current.renewalEnabled ? 'مفعّل' : 'موقوف'}`}>
                <View style={styles.meta}>
                  <Text style={styles.metaText}>ينتهي في: {formatPeriodEnd(current.currentPeriodEnd)}</Text>
                  <Text style={styles.metaText}>السعر: {current.price} {current.currency} / {current.billingInterval}</Text>
                </View>
                {current.entitlements.length > 0 ? (
                  <View style={styles.entitlements}>
                    {current.entitlements.map((code) => (
                      <View key={code} style={styles.entitlement}>
                        <Icon name="check-circle" size={16} color={color.success.DEFAULT} accessibilityLabel="ميزة" />
                        <Text style={styles.entitlementText}>{code}</Text>
                      </View>
                    ))}
                  </View>
                ) : <Text style={styles.muted}>لا توجد مزايا فعّالة مسجلة.</Text>}
                {canCancelRenewal(current) ? (
                  <>
                    {vm.cancelError !== null ? <Text accessibilityRole="alert" style={styles.error}>{vm.cancelError}</Text> : null}
                    <SceneAction variant="secondary" label="إيقاف التجديد التلقائي" loading={vm.cancelling} onPress={vm.cancelRenewal} />
                  </>
                ) : null}
              </SceneSection>
            ) : null}
            <SceneSection asset="subscription_premium" title="الباقات المتاحة" body="الأسعار المعروضة من سجل الباقات. الشراء الإلكتروني لم يُفعّل بعد؛ عند تفعيله سيعمل عبر مراجعة الدفع اليدوي.">
              {vm.plans.length === 0 ? <Text style={styles.muted}>لا توجد باقات متاحة حاليًا.</Text> : (
                <View style={styles.plans}>
                  {vm.plans.map((plan) => {
                    const action = subscribeNextAction(plan, current);
                    const isCurrent = action.kind === 'renewal_off' || (current?.status === 'active' && current.planId === plan.id);
                    return (
                      <View key={plan.id} style={[styles.plan, isCurrent && styles.planCurrent]}>
                        <View style={styles.planHead}>
                          <Text style={styles.planName}>{plan.nameAr}</Text>
                          <Text style={styles.planPrice}>{plan.price} {plan.currency} / {plan.billingInterval}</Text>
                        </View>
                        <Text style={styles.muted}>{action.labelAr}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </SceneSection>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function formatPeriodEnd(iso: string): string {
  return new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing[6], paddingBottom: spacing[8], direction: 'rtl' },
  sections: { paddingHorizontal: spacing[5], gap: spacing[3] },
  meta: { gap: spacing[1] },
  metaText: { color: color.text.secondary, fontSize: typography.size.body, lineHeight: 28, textAlign: 'right', writingDirection: 'rtl' },
  planHead: { gap: spacing[1] },
  entitlements: { gap: spacing[2], paddingVertical: spacing[2] },
  entitlement: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  entitlementText: { color: color.text.primary, fontSize: typography.size.body, lineHeight: 26, textAlign: 'right', writingDirection: 'rtl' },
  plans: { gap: spacing[3] },
  plan: { borderWidth: 1, borderColor: color.border.default, borderRadius: radius.lg, padding: spacing[4], gap: spacing[2], backgroundColor: color.surface.base },
  planCurrent: { borderColor: color.brand.gold, backgroundColor: color.brand.goldSoft },
  planName: { color: color.brand.navy, fontSize: typography.size.h3, lineHeight: 30, fontWeight: typography.weight.bold, textAlign: 'right', writingDirection: 'rtl' },
  planPrice: { color: color.text.secondary, fontSize: typography.size.body, textAlign: 'right', writingDirection: 'rtl' },
  muted: { color: color.text.secondary, fontSize: typography.size.body, lineHeight: 26, textAlign: 'right', writingDirection: 'rtl' },
  error: { color: color.error.DEFAULT, fontSize: typography.size.body, textAlign: 'right', writingDirection: 'rtl' },
});
