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
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChatDialog } from '../chat/chat-dialog';
import { CustomerHeader } from '../components/customer-header';
import { ListEmpty, ListError, ListLoading } from '../components/list-state-view';

import { useConversationsViewModel } from './use-conversations-view-model';

import type { ConversationItem } from './conversations-types';

import { useI18n } from '@/i18n/use-i18n';
import { Avatar, Card, fontFamily, type } from '@/ui';
import { SceneSection } from '@/ui/cinematic';

/** Chat conversation key derived from the request id (TASK-012). */
const chatKeyFor = (requestId: string) => `req-chat-${requestId}`;

export default function ConversationsScreen() {
  const { t } = useI18n();
  const { status, data, error, retry } = useConversationsViewModel();
  const [open, setOpen] = useState<ConversationItem | null>(null);

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <CustomerHeader
          eyebrow={t('messages.subtitle')}
          title={t('messages.title')}
          body="محادثاتك مرتبطة بطلباتك الحالية، وكل رسالة تصل للفني المعني."
        />

        <View style={styles.editorial}>
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

      {open !== null ? (
        <ChatDialog
          visible
          onClose={() => setOpen(null)}
          conversationId={chatKeyFor(open.id)}
          technicianNameAr={open.technicianNameAr}
          serviceTitle={open.specialtyAr}
          requestId={open.id}
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
              {conversation.specialtyAr} · {conversation.orderRefAr}
            </Text>
            <Text style={styles.snippet} numberOfLines={1}>
              {conversation.lastMessageAr}
            </Text>
          </View>
          {conversation.unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{conversation.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  badge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: color.error.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  badgeText: {
    ...type.caption,
    color: color.surface.base,
    fontFamily: fontFamily.bold,
  },
  bottomSpacer: {
    height: spacing[6],
  },
  pressed: {
    opacity: 0.9,
  },
});
