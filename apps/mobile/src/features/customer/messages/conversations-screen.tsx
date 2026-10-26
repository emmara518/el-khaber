/**
 * Customer Messages screen — unified inbox (Batch A, WP-Inbox).
 *
 * Avatar + name + order context + real snippet + time + real unread
 * badge. A row opens the shared chat dialog on the REAL conversation
 * id (`conv-<id>`); closing it silently refreshes the list so read
 * badges settle from server truth.
 */

import { color, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChatDialog } from '../chat/chat-dialog';

import { useConversationsViewModel } from './use-conversations-view-model';

import type { ConversationItem } from './conversations-types';

import { useI18n } from '@/i18n/use-i18n';
import { formatArNumber } from '@/lib/api-format';
import { ListEmpty, ListError, ListLoading } from '@/ui';
import { AppHeader, Avatar, Card, PageTitle, type, UnreadBadge } from '@/ui';
import { SceneSection } from '@/ui/cinematic';

/** Chat conversation key for a real conversation id (WP-Inbox). */
const chatKeyFor = (conversationId: string) => `conv-${conversationId}`;

export default function ConversationsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { status, data, error, retry, refresh } = useConversationsViewModel();
  const [open, setOpen] = useState<ConversationItem | null>(null);

  return (
    <>
      <View style={styles.root}>
        <AppHeader
          onPressNotifications={() => router.push('/(customer)/notifications')}
          onPressAvatar={() => router.push('/(customer)/profile')}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.editorial}>
            <PageTitle
              eyebrow={t('messages.subtitle')}
              title={t('messages.title')}
              body="محادثاتك مرتبطة بطلباتك الحالية، وكل رسالة تصل للفني المعني."
            />
            {status === 'loading' ? <ListLoading label={t('state.loading')} /> : null}
            {status === 'error' ? (
              <ListError
                asset="fault_empty"
                title={t('messages.error.title')}
                message={error?.message ?? ''}
                retryLabel={t('state.retry')}
                onRetry={retry}
              />
            ) : null}
            {status === 'loaded' && data ? (
              data.conversations.length === 0 ? (
                <ListEmpty
                  brandAsset="messages"
                  icon="message-circle"
                  iconLabel="لا توجد محادثات"
                  title={t('messages.empty.title')}
                  body={t('messages.empty.body')}
                />
              ) : (
                <SceneSection
                  title={`${formatArNumber(data.conversations.length)} محادثة`}
                  body="افتح المحادثات للتواصل مع الفني."
                >
                  <View style={styles.list}>
                    {data.conversations.map((conversation) => (
                      <ConversationRow
                        key={conversation.id}
                        conversation={conversation}
                        onPress={() => setOpen(conversation)}
                      />
                    ))}
                  </View>
                </SceneSection>
              )
            ) : null}
            <View style={styles.bottomSpacer} />
          </View>
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
          technicianNameAr={open.technicianNameAr}
          serviceTitle={open.orderRefAr}
        />
      ) : null}
    </>
  );
}

function ConversationRow({
  conversation,
  onPress,
}: {
  conversation: ConversationItem;
  onPress: () => void;
}) {
  const hasSnippet =
    conversation.lastMessageAr !== null && conversation.lastMessageAr.trim().length > 0;
  const label = `افتح محادثة مع ${conversation.technicianNameAr}${
    conversation.orderRefAr.length > 0 ? `، ${conversation.orderRefAr}` : ''
  }${conversation.unreadCount > 0 ? `. ${formatArNumber(conversation.unreadCount)} رسائل غير مقروءة` : ''}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card background={color.surface.base} padded style={styles.card}>
        <View style={styles.row}>
          <Avatar
            initials={conversation.initialsAr}
            imageUrl={conversation.avatarUrl}
            size={52}
            statusDot
            statusColor={conversation.online ? color.success.DEFAULT : color.text.secondary}
            accessibilityLabel={`${conversation.technicianNameAr}${conversation.online ? '، متصل' : ''}`}
          />
          <View style={styles.middle}>
            <View style={styles.topLine}>
              <Text style={styles.name}>{conversation.technicianNameAr}</Text>
              <Text style={styles.time}>{conversation.timeAr}</Text>
            </View>
            {conversation.orderRefAr.length > 0 ? (
              <Text style={styles.specialty} numberOfLines={1}>
                {conversation.orderRefAr}
              </Text>
            ) : null}
            {hasSnippet ? (
              <Text style={styles.snippet} numberOfLines={1}>
                {conversation.lastMessageAr}
              </Text>
            ) : (
              <Text style={styles.snippetEmpty}>لا توجد رسائل بعد</Text>
            )}
          </View>
            <UnreadBadge count={conversation.unreadCount} format={formatArNumber} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.surface.subtle,
  },
  content: {
    paddingBottom: spacing[8],
  },
  editorial: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
  },
  list: {
    gap: spacing[3],
  },
  card: {
    padding: spacing[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  middle: {
    flex: 1,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    ...type.cardTitle,
    color: color.text.primary,
    textAlign: 'right',
  },
  time: {
    ...type.caption,
    color: color.text.secondary,
  },
  specialty: {
    ...type.caption,
    color: color.text.secondary,
    marginTop: spacing[1],
    textAlign: 'right',
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
  bottomSpacer: {
    height: spacing[6],
  },
  pressed: {
    opacity: 0.9,
  },
});
