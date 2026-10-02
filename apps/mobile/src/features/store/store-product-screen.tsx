/**
 * Store product detail screen (Phase D) — shared by Customer and Technician.
 *
 * States: loading / loaded / not-found / error. The not-found state is the
 * same for a missing product and a product that is no longer publicly
 * visible (the API returns an identical 404). Real data only.
 */

import { color, spacing } from '@khabir/ui-tokens';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChatDialog } from '../customer/chat/chat-dialog';

import { useStoreProductViewModel } from './use-store-view-model';

import { useI18n } from '@/i18n/use-i18n';
import { ActionButton, AppHeader, Card, Icon, ListEmpty, ListError, ListLoading, ProductImage, SectionHeading, type } from '@/ui';

export function StoreProductScreen({
  role,
  productId,
  onPressNotifications,
  onPressAvatar,
  onBack,
}: {
  role: 'customer' | 'technician';
  productId: string;
  onPressNotifications: () => void;
  onPressAvatar: () => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const { status, data, error, retry } = useStoreProductViewModel(role, productId);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <View style={styles.root}>
      <AppHeader onPressNotifications={onPressNotifications} onPressAvatar={onPressAvatar} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('store.product.back')}
          onPress={onBack}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Icon name="arrow-right" size={20} color={color.brand.navy} />
          <Text style={styles.backText}>{t('store.title')}</Text>
        </Pressable>

        {status === 'loading' ? <ListLoading label={t('state.loading')} asset="merchant_products" /> : null}

        {status === 'error' ? (
          <ListError
            title={t('store.error.title')}
            message={error?.message ?? ''}
            retryLabel={t('state.retry')}
            onRetry={retry}
          />
        ) : null}

        {status === 'not-found' ? (
          <ListEmpty
            asset="merchant_products"
            icon="package"
            iconLabel="منتج غير متاح"
            title={t('store.product.missing')}
            body={t('store.product.missingBody')}
            actionLabel={t('store.product.back')}
            onAction={onBack}
          />
        ) : null}

        {status === 'loaded' && data ? (
          <>
            <Card background={color.surface.base} padded style={styles.card}>
              <View style={styles.imageWrap}>
                <ProductImage imageUrl={data.imageUrl} nameAr={data.nameAr} size={200} />
              </View>
              <Text accessibilityRole="header" style={styles.name}>
                {data.nameAr}
              </Text>
              {data.merchantNameAr !== null && data.merchantNameAr.trim().length > 0 ? (
                <Text style={styles.merchant}>
                  {t('store.product.merchant')}: {data.merchantNameAr}
                </Text>
              ) : null}
              {data.price !== null ? (
                <Text style={styles.price}>{data.price} جنيه</Text>
              ) : (
                <Text style={styles.noPrice}>{t('store.product.priceUnspecified')}</Text>
              )}
            </Card>

            {data.descriptionAr !== null && data.descriptionAr.trim().length > 0 ? (
              <SectionHeading title={t('store.product.description')} body={data.descriptionAr} />
            ) : null}

            <ActionButton
              icon="message-circle"
              label={t('store.product.contactMerchant')}
              accessibilityLabel={t('store.product.contactMerchant')}
              onPress={() => setChatOpen(true)}
            />
          </>
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {status === 'loaded' && data ? (
        <ChatDialog
          visible={chatOpen}
          onClose={() => setChatOpen(false)}
          conversationId={`product-chat-${data.id}`}
          technicianNameAr={data.merchantNameAr ?? t('store.product.merchant')}
          peerNameAr={data.merchantNameAr ?? t('store.product.merchant')}
          serviceTitle={data.nameAr}
          role={role}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle, direction: 'rtl' },
  content: { paddingHorizontal: spacing[5], paddingTop: spacing[3], paddingBottom: spacing[8], gap: spacing[3] },
  back: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[2],
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  backText: { ...type.bodyMedium, color: color.brand.navy, writingDirection: 'rtl' },
  card: { alignItems: 'center', gap: spacing[2] },
  imageWrap: { alignItems: 'center', justifyContent: 'center' },
  name: { ...type.h2, color: color.text.primary, textAlign: 'center', writingDirection: 'rtl' },
  merchant: { ...type.caption, color: color.brand.navy, textAlign: 'center', writingDirection: 'rtl' },
  price: { ...type.h3, color: color.brand.navy, textAlign: 'center', writingDirection: 'rtl' },
  noPrice: { ...type.body, color: color.text.secondary, textAlign: 'center', writingDirection: 'rtl' },
  pressed: { opacity: 0.7 },
  bottomSpacer: { height: spacing[6] },
});
