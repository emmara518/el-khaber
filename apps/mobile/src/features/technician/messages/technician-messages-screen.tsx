/**
 * Technician Messages screen (T-G, WP-Inbox) — Customer visual language.
 *
 * AppHeader → PageTitle → conversation cards from the unified inbox:
 * peer label + real snippet + time + real unread badge + order context.
 * Opening a row launches the shared chat dialog in the technician role
 * on the REAL conversation id; closing refreshes read badges.
 */

import { color, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChatDialog } from '../../customer/chat/chat-dialog';

import { useTechnicianMessagesViewModel } from './use-technician-messages-view-model';

import type { TechnicianConversationItem } from './technician-messages-types';

import {
  AppHeader,
  Avatar,
  Card,
  Icon,
  ListEmpty,
  ListError,
  ListLoading,
  PageTitle,
  UnreadBadge,
} from '@/ui';
import { type } from '@/ui/typography';

const chatKeyFor = (conversationId: string) => `conv-${conversationId}`;

export default function TechnicianMessagesScreen() {
  const router = useRouter();
  const { status, data, error, retry, refresh } = useTechnicianMessagesViewModel();
  const [open, setOpen] = useState<TechnicianConversationItem | null>(null);

  return (
    <>
      <View style={styles.root}>
        <AppHeader
          onPressNotifications={() => router.push('/(technician)/notifications')}
          onPressAvatar={() => router.push('/(technician)/profile')}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <PageTitle
            eyebrow="التواصل"
            title="الرسائل"
            body="محادثاتك مع العملاء مرتبطة بطلباتك الجارية."
          />

          {status === 'loading' ? (
            <ListLoading label="جارٍ تحميل المحادثات" brandAsset="toolbox" />
          ) : null}
          {status === 'error' ? (
            <ListError
              title="تعذر تحميل المحادثات"
              message={error?.message ?? ''}
              retryLabel="إعادة المحاولة"
              onRetry={retry}
            />
          ) : null}
          {status === 'loaded' && data ? (
            data.conversations.length === 0 ? (
              <ListEmpty
                brandAsset="no-requests"
                icon="message-circle"
                iconLabel="لا توجد محادثات"
                title="لا توجد محادثات بعد"
                body="عند قبول طلب وإسناده إليك ستظهر المحادثة هنا."
              />
            ) : (
              <View style={styles.list}>
                {data.conversations.map((conversation) => (
                  <Pressable
                    key={conversation.id}
                    accessibilityRole="button"
                    accessibilityLabel={`افتح محادثة ${conversation.orderRefAr}${
                      conversation.unreadCount > 0 ? `، ${conversation.unreadCount} غير مقروء` : ''
                    }`}
                    onPress={() => setOpen(conversation)}
                    style={({ pressed }) => [pressed && styles.pressed]}
                  >
                    <Card background={color.surface.base} padded style={styles.card}>
                      <View style={styles.row}>
                        <Avatar
                          initials={conversation.initialsAr}
                          imageUrl={conversation.avatarUrl}
                          size={52}
                          accessibilityLabel={conversation.peerNameAr}
                        />
                        <View style={styles.middle}>
                          <View style={styles.topLine}>
                            <Text style={styles.name}>{conversation.peerNameAr}</Text>
                            <Text style={styles.time}>{conversation.timeAr}</Text>
                          </View>
                          {conversation.orderRefAr.length > 0 ? (
                            <Text style={styles.ref} numberOfLines={1}>
                              {conversation.orderRefAr}
                            </Text>
                          ) : null}
                          {conversation.lastMessageAr !== null &&
                          conversation.lastMessageAr.trim().length > 0 ? (
                            <Text style={styles.snippet} numberOfLines={1}>
                              {conversation.lastMessageAr}
                            </Text>
                          ) : (
                            <Text style={styles.snippetEmpty}>لا توجد رسائل بعد</Text>
                          )}
                        </View>
                        <UnreadBadge count={conversation.unreadCount} />
                        <Icon name="chevron-left" size={20} color={color.brand.navy} />
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </View>
            )
          ) : null}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>

      {open !== null ? (
        <ChatDialog
          visible
          onClose={() => {
            setOpen(null);
            refresh();
          }}
          conversationId={chatKeyFor(open.id)}
          technicianNameAr={open.peerNameAr}
          peerNameAr={open.peerNameAr}
          serviceTitle={open.orderRefAr}
          role="technician"
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle },
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[4],
  },
  list: { gap: spacing[3] },
  card: { gap: spacing[2] },
  row: { flexDirection: 'row', direction: 'rtl', alignItems: 'center', gap: spacing[3] },
  middle: { flex: 1, minWidth: 0 },
  topLine: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: { ...type.cardTitle, color: color.text.primary, textAlign: 'right' },
  time: { ...type.caption, color: color.text.secondary },
  ref: {
    ...type.caption,
    color: color.text.secondary,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  snippet: {
    ...type.body,
    color: color.text.primary,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  snippetEmpty: {
    ...type.caption,
    color: color.text.secondary,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  pressed: { opacity: 0.9 },
  bottomSpacer: { height: spacing[2] },
});
