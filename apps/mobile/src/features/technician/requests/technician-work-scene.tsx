import { color, spacing, typography } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { buildTimeline } from '../../customer/orders/order-detail-types';

import { TECHNICIAN_STATUS_LABELS, type TechnicianRequest } from './technician-request-types';

import type { SceneAssetName } from '@/ui/scene-assets';
import type { ReactNode } from 'react';

import { Icon } from '@/ui';
import { SceneHero, SceneSection } from '@/ui/cinematic';


const scenes: Record<TechnicianRequest['status'], SceneAssetName> = {
  pending: 'technician_requests',
  accepted: 'technician_dashboard_hero',
  on_the_way: 'tracking_on_the_way',
  in_progress: 'tracking_in_progress',
  completed: 'tracking_completed',
  cancelled: 'technician_requests',
};

export function TechnicianWorkScene({ request, hint, action }: { request: TechnicianRequest; hint?: string; action?: ReactNode }) {
  return (
    <View style={styles.root}>
      <SceneHero compact asset={scenes[request.status]} eyebrow={`طلب ${request.id} · ${request.statusLabelAr}`} title={request.problemAr} body={hint ?? `${request.applianceAr} · ${request.customerNameAr}`} action={action} />
      <SceneSection title="مسار الخدمة" eyebrow={request.status === 'cancelled' ? 'أُغلق الطلب بالإلغاء' : 'الحالة المسجلة للطلب'}>
        {request.status === 'cancelled' ? <Text style={styles.label}>ملغي · لا توجد خطوة تالية</Text> : buildTimeline(request.status, {}).map((step) => (
          <View key={step.status} style={styles.step} accessibilityLabel={`${TECHNICIAN_STATUS_LABELS[step.status]}، ${step.state === 'done' ? 'مكتملة' : step.state === 'current' ? 'الحالية' : 'قادمة'}`}>
            <View style={[styles.marker, step.state !== 'upcoming' && styles.reached]}>
              <Icon name={step.state === 'done' ? 'check' : 'clock'} size={16} color={step.state === 'upcoming' ? color.text.secondary : color.surface.base} />
            </View>
            <Text style={[styles.label, step.state === 'current' && styles.current]}>{TECHNICIAN_STATUS_LABELS[step.status]}</Text>
            <Text style={styles.state}>{step.state === 'done' ? 'مكتملة' : step.state === 'current' ? 'الآن' : 'قادمة'}</Text>
          </View>
        ))}
      </SceneSection>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { direction: 'rtl' },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], minHeight: 44 },
  marker: { width: 32, height: 32, borderRadius: 16, backgroundColor: color.surface.subtle, alignItems: 'center', justifyContent: 'center' },
  reached: { backgroundColor: color.brand.navy },
  label: { flex: 1, color: color.text.primary, fontSize: typography.size.body, lineHeight: 26, textAlign: 'right', writingDirection: 'rtl' },
  current: { fontWeight: typography.weight.bold },
  state: { color: color.text.secondary, fontSize: typography.size.caption, lineHeight: 24, textAlign: 'right' },
});
