import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { merchantVerificationCopy } from './merchant-home-types';
import { useMerchantHomeViewModel } from './use-merchant-home-view-model';

import { useI18n } from '@/i18n/use-i18n';
import { Avatar, Icon } from '@/ui';
import { SceneAction, SceneHero, SceneSection } from '@/ui/cinematic';
import { sceneAssets } from '@/ui/scene-assets';

export default function MerchantHomeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { status, data, error, retry } = useMerchantHomeViewModel();

  if (status === 'loading' || status === 'error' || data === null) {
    return (
      <SafeAreaView edges={['top']} style={styles.root}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <SceneHero
            compact
            asset="merchant_dashboard_hero"
            eyebrow="مساحة التاجر"
            title={t('merchant.home.catalog')}
            body={status === 'loading' ? t('state.loading') : error?.message ?? t('merchant.home.error')}
            action={status !== 'loading' ? <SceneAction label={t('state.retry')} onPress={retry} /> : undefined}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const verification = merchantVerificationCopy(data.profile.verification);

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.identity}>
          <Avatar initials={data.profile.initialsAr} size={44} accessibilityLabel={`رمز ${data.profile.businessNameAr}`} />
          <View style={styles.copy}>
            <Text style={styles.eyebrow}>مساحة التاجر</Text>
            <Text accessibilityRole="header" style={styles.title}>{data.profile.businessNameAr}</Text>
            <Text style={styles.body}>{data.profile.cityAr}</Text>
          </View>
        </View>
        <View style={styles.catalogDesk}>
          <View style={styles.catalogHeading}>
            <View style={styles.copy}>
              <Text style={styles.gold}>الكتالوج · مركز التحكم</Text>
              <Text style={styles.total}>{data.catalog.totalProducts}</Text>
              <Text style={styles.light}>{t('merchant.home.total')}</Text>
            </View>
            <Image accessible={false} source={sceneAssets.merchant_dashboard_hero} style={styles.deskArt} resizeMode="cover" />
          </View>
          <SceneAction label={t('merchant.home.addProduct')} onPress={() => router.push('/(merchant)/products/new')} />
          <SceneAction variant="secondary" label={t('merchant.home.products')} onPress={() => router.push('/(merchant)/products')} />
        </View>
        <View style={styles.inventory}>
          <View style={styles.inventoryMetric}><Icon name="package" size={22} color={color.brand.navy} /><Text style={styles.number}>{data.catalog.activeProducts}</Text><Text style={styles.body}>{t('merchant.home.active')}</Text></View>
          <View style={styles.inventoryMetric}><Icon name="pause-circle" size={22} color={color.brand.navy} /><Text style={styles.number}>{data.catalog.inactiveProducts}</Text><Text style={styles.body}>{t('merchant.home.inactive')}</Text></View>
        </View>
        <SceneSection asset="merchant_products" title="منتجات واضحة وسهلة الإدارة" body="راجع تفاصيل منتجاتك وأسعارها وحالة ظهورها من الكتالوج." action={<SceneAction variant="secondary" label="تصفّح وإدارة المنتجات" onPress={() => router.push('/(merchant)/products')} />} />
        <SceneSection asset="merchant_sales" eyebrow="إدارة المتجر" title={data.subscription?.planNameAr ?? 'الاشتراك'} body={data.subscription?.statusAr ?? 'لا توجد بيانات اشتراك متاحة.'} action={<SceneAction variant="secondary" label="إعدادات المتجر والاشتراك" onPress={() => router.push('/(merchant)/settings')} />} />
        <SceneSection title={`${t('merchant.home.verification')}: ${verification.titleAr}`} body={data.profile.verificationNoteAr}>
          <SceneAction variant="secondary" label="ملف المتجر" onPress={() => router.push('/(merchant)/profile')} />
        </SceneSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle },
  content: { padding: spacing[5], paddingBottom: spacing[8], direction: 'rtl', gap: spacing[4] },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { color: color.text.secondary, fontSize: typography.size.caption, lineHeight: 24, textAlign: 'right' },
  title: { color: color.brand.navy, fontSize: typography.size.h2, fontWeight: typography.weight.bold, lineHeight: 36, textAlign: 'right', writingDirection: 'rtl' },
  body: { color: color.text.secondary, fontSize: typography.size.body, lineHeight: 28, textAlign: 'right', writingDirection: 'rtl' },
  catalogDesk: { backgroundColor: color.brand.navy, borderRadius: radius.xl, padding: spacing[4], gap: spacing[3] },
  catalogHeading: { flexDirection: 'row', gap: spacing[3], alignItems: 'center', paddingBottom: spacing[3] },
  deskArt: { width: 120, height: 144, borderRadius: radius.lg },
  gold: { color: color.brand.gold, fontSize: typography.size.caption, lineHeight: 24, textAlign: 'right' },
  light: { color: color.surface.base, fontSize: typography.size.body, lineHeight: 28, textAlign: 'right' },
  total: { color: color.surface.base, fontSize: 48, fontWeight: typography.weight.bold, lineHeight: 64, textAlign: 'right' },
  inventory: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  inventoryMetric: { flexGrow: 1, flexBasis: 120, gap: spacing[1], padding: spacing[4], backgroundColor: color.brand.goldSoft, borderRadius: radius.lg },
  number: { color: color.brand.navy, fontSize: 28, lineHeight: 40, fontWeight: typography.weight.bold, textAlign: 'right' },
});
