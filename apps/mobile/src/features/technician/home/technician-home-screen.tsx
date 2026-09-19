import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { verificationCopy } from './technician-home-types';
import { useTechnicianHomeViewModel } from './use-technician-home-view-model';

import { useI18n } from '@/i18n/use-i18n';
import { Avatar, Icon, RatingStars } from '@/ui';
import { SceneAction, SceneHero, SceneSection } from '@/ui/cinematic';

export default function TechnicianHomeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { status, data, error, retry } = useTechnicianHomeViewModel();

  if (status === 'loading' || status === 'error' || data === null) {
    return (
      <SafeAreaView edges={['top']} style={styles.root}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <SceneHero
            compact
            asset="technician_dashboard_hero"
            eyebrow="مساحة العمل"
            title={t('tech.home.today')}
            body={status === 'loading' ? t('state.loading') : error?.message ?? t('tech.home.error')}
            action={status !== 'loading' ? <SceneAction label={t('state.retry')} onPress={retry} /> : undefined}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const verification = verificationCopy(data.profile.verification);
  const active = data.active;

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.identity}>
          <Avatar initials={data.profile.initialsAr} size={40} accessibilityLabel={data.profile.nameAr} />
          <View style={styles.identityCopy}>
            <Text style={styles.name}>{data.profile.nameAr}</Text>
            <Text style={styles.caption}>{data.profile.specialtyAr} · {data.profile.areasAr.join('، ')}</Text>
          </View>
          <Text style={styles.availability}>{data.profile.availabilityLabelAr}</Text>
        </View>
        <SceneHero
          compact
          asset="technician_dashboard_hero"
          eyebrow="اليوم · مساحة العمل"
          title={active?.taskAr ?? t('tech.home.noActive')}
          body={active ? `${active.customerNameAr} · ${active.applianceAr} · ${active.statusLabelAr}` : 'تابع الطلبات الواردة وحدّد خطوتك التالية.'}
          action={<SceneAction label={active ? t('tech.active.openFromDetail') : t('tech.home.orders')} onPress={() => active ? router.push({ pathname: '/(technician)/active-service', params: { id: active.id } }) : router.push('/(technician)/orders')} />}
        >
          {active ? <Text style={styles.activeTime}>{active.startedAr}</Text> : null}
          <View style={styles.today}>
            <Metric value={data.today.inProgress} label={t('tech.home.inProgress')} />
            <Metric value={data.today.newRequests} label={t('tech.home.newRequests')} />
            <Metric value={data.today.completedToday} label={t('tech.home.completedToday')} />
          </View>
        </SceneHero>
        <View style={styles.content}>
          <SceneSection asset="technician_requests" eyebrow="قائمة الانتظار" title={t('tech.home.incoming')} body={t('tech.home.incomingHint')} action={<SceneAction variant="secondary" label={t('tech.home.showAll')} onPress={() => router.push('/(technician)/orders')} />}>
            {data.incoming.length === 0 ? <Text style={styles.body}>{t('tech.home.incomingEmpty')}</Text> : data.incoming.map((item) => (
              <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`فتح طلب ${item.customerNameAr}: ${item.problemAr}`} onPress={() => router.push({ pathname: '/(technician)/orders/[id]', params: { id: item.id } })} style={({ pressed }) => [styles.request, pressed && styles.pressed]}>
                <View style={styles.requestCopy}>
                  <Text style={styles.caption}>{item.timeAr} · {item.customerNameAr}</Text>
                  <Text style={styles.name}>{item.applianceAr} · {item.problemAr}</Text>
                </View>
                <Icon name="arrow-left" size={20} color={color.brand.navy} />
              </Pressable>
            ))}
          </SceneSection>
          <SceneSection asset="technician_dashboard_performance" eyebrow="الأداء الفعلي" title={t('tech.home.rating')}>
            <RatingStars rating={data.profile.rating} reviewCount={data.profile.reviewCount} />
            <Text style={styles.body}>{data.profile.reviewCount} {t('tech.home.reviews')}</Text>
          </SceneSection>
          <SceneSection title={verification.titleAr} body={data.profile.verificationNoteAr}>
            <SceneAction variant="secondary" label="إدارة الملف والخدمات" onPress={() => router.push('/(technician)/profile')} />
            <SceneAction variant="secondary" label={t('tech.home.messages')} onPress={() => router.push('/(technician)/messages')} />
          </SceneSection>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return <View style={styles.metric}><Text style={styles.number}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle },
  scroll: { paddingBottom: spacing[8], direction: 'rtl' },
  identity: { padding: spacing[4], flexDirection: 'row', gap: spacing[2], alignItems: 'center' },
  identityCopy: { flex: 1, minWidth: 0 },
  availability: { color: color.brand.navy, fontSize: typography.size.caption, backgroundColor: color.brand.goldSoft, padding: spacing[2], borderRadius: radius.md, maxWidth: 100, textAlign: 'right' },
  content: { padding: spacing[5], gap: spacing[3] },
  title: { color: color.brand.navy, fontSize: typography.size.h2, fontWeight: typography.weight.bold, lineHeight: 36, textAlign: 'right', writingDirection: 'rtl' },
  name: { color: color.brand.navy, fontSize: typography.size.body, fontWeight: typography.weight.bold, lineHeight: 28, textAlign: 'right', writingDirection: 'rtl' },
  body: { color: color.text.secondary, fontSize: typography.size.body, lineHeight: 28, textAlign: 'right', writingDirection: 'rtl' },
  caption: { color: color.text.secondary, fontSize: typography.size.caption, lineHeight: 24, textAlign: 'right', writingDirection: 'rtl' },
  today: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: color.brand.navyDeep, paddingTop: spacing[3], marginTop: spacing[3], gap: spacing[2] },
  metric: { flexGrow: 1, flexBasis: 80 },
  number: { color: color.brand.gold, fontSize: 30, fontWeight: typography.weight.bold, lineHeight: 42, textAlign: 'right' },
  metricLabel: { color: color.surface.base, fontSize: typography.size.caption, lineHeight: 24, textAlign: 'right', writingDirection: 'rtl' },
  activeTime: { color: color.brand.goldSoft, lineHeight: 24, textAlign: 'right' },
  request: { flexDirection: 'row', gap: spacing[3], alignItems: 'center', borderBottomWidth: 1, borderBottomColor: color.border.default, paddingVertical: spacing[3], minHeight: 76 },
  requestCopy: { flex: 1 },
  pressed: { opacity: 0.75 },
});
