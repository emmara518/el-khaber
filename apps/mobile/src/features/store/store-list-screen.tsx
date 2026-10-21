/**
 * Store list screen (Phase D) — shared by Customer and Technician.
 *
 * Reads the public product contract through `useStoreViewModel`. States:
 * loading / populated / empty / error. Real data only.
 */

import { color, spacing } from '@khabir/ui-tokens';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { StoreProductCard } from './components/store-product-card';
import { useStoreViewModel } from './use-store-view-model';

import { useI18n } from '@/i18n/use-i18n';
import { AppHeader, ListEmpty, ListError, ListLoading, PageTitle, screenReveal } from '@/ui';

export function StoreListScreen({
  role,
  onPressNotifications,
  onPressAvatar,
  onOpenProduct,
}: {
  role: 'customer' | 'technician';
  onPressNotifications: () => void;
  onPressAvatar: () => void;
  onOpenProduct: (productId: string) => void;
}) {
  const { t } = useI18n();
  const { status, data, error, retry } = useStoreViewModel(role);

  return (
    <View style={styles.root}>
      <AppHeader onPressNotifications={onPressNotifications} onPressAvatar={onPressAvatar} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageTitle eyebrow="المتجر" title={t('store.title')} body={t('store.subtitle')} />

        {status === 'loading' ? <ListLoading label={t('state.loading')} brandAsset="spare-parts" /> : null}

        {status === 'error' ? (
          <ListError
            title={t('store.error.title')}
            message={error?.message ?? ''}
            retryLabel={t('state.retry')}
            onRetry={retry}
          />
        ) : null}

        {status === 'loaded' && data ? (
          data.length === 0 ? (
            <ListEmpty
              brandAsset="spare-parts"
              icon="package"
              iconLabel="لا توجد منتجات"
              title={t('store.empty.title')}
              body={t('store.empty.body')}
            />
          ) : (
            <Animated.View entering={screenReveal} style={styles.list}>
              {data.map((product) => (
                <StoreProductCard
                  key={product.id}
                  product={product}
                  onPress={() => onOpenProduct(product.id)}
                />
              ))}
            </Animated.View>
          )
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle, direction: 'rtl' },
  content: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[8] },
  list: { gap: spacing[3], marginTop: spacing[2] },
  bottomSpacer: { height: spacing[6] },
});
