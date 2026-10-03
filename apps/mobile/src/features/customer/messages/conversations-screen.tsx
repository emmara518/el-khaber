/**
 * Customer Messages screen — conversation list (Batch A).
 *
 * Avatar (online dot) + name + specialty + snippet + time + unread
 * badge + order reference. A row opens the same contextual chat dialog
 * used by Request Tracking: each conversation id IS the service-request
 * id (see `ApiConversationsDataSource`), so the chat key is derived
 * without any backend change.
 */

import { color, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChatDialog } from '../chat/chat-dialog';


import { useConversationsViewModel } from './use-conversations-view-model';

import type { ConversationItem } from './conversations-types';

import { useI18n } from '@/i18n/use-i18n';
import { joinNonEmpty } from '@/lib/api-format';
import { ListEmpty, ListError, ListLoading } from '@/ui';
import { AppHeader, Avatar, Card, PageTitle, type, UnreadBadge } from '@/ui';
import { SceneSection } from '@/ui/cinematic';

/** Chat conversation key derived from the request id (TASK-012). */
const chatKeyFor = (requestId: string) => `req-chat-${requestId}`;

export default function ConversationsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { status, data, error, retry } = useConversationsViewModel();
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
          <PageTitle eyebrow={t('messages.subtitle')} title={t('messages.title')} body="محادثاتك مرتبطة بطلباتك الحالية، وكل رسالة تصل للفني المعني." />
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
                asset="technician_profile_reviews"
                icon="message-circle"
                iconLabel="لا توجد محادثات"
                title={t('messages.empty.title')}
                body={t('messages.empty.body')}
              />
            ) : (
              <SceneSection eyebrow="المحادثات" title={`${data.conversations.length} محادثة`} body="افتح المحادثة للتواصل مع الفني.">
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
          onClose={() => setOpen(null)}
          conversationId={chatKeyFor(open.id)}
          technicianNameAr={open.technicianNameAr}
          serviceTitle={open.specialtyAr}
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
  const label = `افتح محادثة مع ${conversation.technicianNameAr}، ${conversation.specialtyAr}${
    conversation.unreadCount > 0 ? `. ${conversation.unreadCount} رسائل غير مقروءة` : ''
  }`;
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
            <Text style={styles.specialty}>
              {joinNonEmpty([conversation.specialtyAr, conversation.orderRefAr])}
            </Text>
            <Text style={styles.snippet} numberOfLines={1}>
              {conversation.lastMessageAr}
            </Text>
          </View>
          <UnreadBadge count={conversation.unreadCount} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.surface.subtle,
    direction: 'rtl',
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
  bottomSpacer: {
    height: spacing[6],
  },
  pressed: {
    opacity: 0.9,
  },
});
