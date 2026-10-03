/**
 * Merchant Messages screen (Phase D) — Customer visual language.
 *
 * AppHeader → PageTitle → conversation cards. Each row is a product inquiry
 * from a customer/technician; opening it launches the shared chat dialog in
 * the merchant role. Real data only (no fake last message or participant).
 */

import { color, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ChatDialog } from '../../customer/chat/chat-dialog';

import { useMerchantMessagesViewModel } from './use-merchant-messages-view-model';

import type { MerchantConversationItem } from './merchant-messages-types';

import { AppHeader, Avatar, Card, Icon, ListEmpty, ListError, ListLoading, PageTitle, screenReveal } from '@/ui';
import { type } from '@/ui/typography';

const chatKeyFor = (conversationId: string) => `conv-${conversationId}`;

export default function MerchantMessagesScreen() {
  const router = useRouter();
  const { status, data, error, retry } = useMerchantMessagesViewModel();
  const [open, setOpen] = useState<MerchantConversationItem | null>(null);

  return (
    <>
      <View style={styles.root}>
        <AppHeader
          onPressNotifications={() => router.push('/(merchant)/notifications')}
          onPressAvatar={() => router.push('/(merchant)/profile')}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <PageTitle eyebrow="التواصل" title="الرسائل" body="رسائل العملاء بخصوص منتجاتك." />

          {status === 'loading' ? <ListLoading label="جارٍ تحميل الرسائل" asset="merchant_products" /> : null}
          {status === 'error' ? (
            <ListError
              title="تعذر تحميل الرسائل"
              message={error?.message ?? ''}
              retryLabel="إعادة المحاولة"
              onRetry={retry}
            />
          ) : null}
          {status === 'loaded' && data ? (
            data.conversations.length === 0 ? (
              <ListEmpty
                asset="merchant_products"
                icon="message-circle"
                iconLabel="لا توجد رسائل"
                title="لا توجد رسائل بعد"
                body="عندما يراسلك عميل بخصوص أحد منتجاتك ستظهر المحادثة هنا."
              />
            ) : (
              <Animated.View entering={screenReveal} style={styles.list}>
                {data.conversations.map((conversation) => (
                  <Pressable
                    key={conversation.id}
                    accessibilityRole="button"
                    accessibilityLabel={`افتح محادثة ${conversation.peerNameAr}${
                      conversation.unreadCount > 0 ? `، ${conversation.unreadCount} غير مقروء` : ''
                    }`}
                    onPress={() => setOpen(conversation)}
                    style={({ pressed }) => [pressed && styles.pressed]}
                  >
                    <Card background={color.surface.base} padded style={styles.card}>
                      <View style={styles.row}>
                        <Avatar initials={conversation.peerNameAr.slice(0, 1)} size={52} accessibilityLabel={conversation.peerNameAr} />
                        <View style={styles.middle}>
                          <View style={styles.topLine}>
                            <Text style={styles.name}>{conversation.peerNameAr}</Text>
                            <Text style={styles.time}>{conversation.updatedAtAr}</Text>
                          </View>
                          <Text style={styles.snippet} numberOfLines={1}>
                            {conversation.lastMessageAr !== null && conversation.lastMessageAr.trim().length > 0
                              ? conversation.lastMessageAr
                              : 'لا توجد رسائل بعد'}
                          </Text>
                        </View>
                        {conversation.unreadCount > 0 ? (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{conversation.unreadCount}</Text>
                          </View>
                        ) : null}
                        <Icon name="chevron-left" size={20} color={color.brand.navy} />
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </Animated.View>
            )
          ) : null}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>

      {open !== null ? (
        <ChatDialog
          visible
          onClose={() => setOpen(null)}
          conversationId={chatKeyFor(open.id)}
          technicianNameAr={open.peerNameAr}
          peerNameAr={open.peerNameAr}
          role="merchant"
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle },
  content: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[8], gap: spacing[4] },
  list: { gap: spacing[3] },
  card: { gap: spacing[2] },
  row: { flexDirection: 'row', direction: 'rtl', alignItems: 'center', gap: spacing[3] },
  middle: { flex: 1, minWidth: 0 },
  topLine: { flexDirection: 'row', direction: 'rtl', alignItems: 'center', justifyContent: 'space-between' },
  name: { ...type.cardTitle, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
  time: { ...type.caption, color: color.text.secondary },
  snippet: { ...type.caption, color: color.text.secondary, marginTop: spacing[1], textAlign: 'right', writingDirection: 'rtl' },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: color.error.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { ...type.caption, color: color.surface.base, writingDirection: 'rtl' },
  pressed: { opacity: 0.9 },
  bottomSpacer: { height: spacing[2] },
});
