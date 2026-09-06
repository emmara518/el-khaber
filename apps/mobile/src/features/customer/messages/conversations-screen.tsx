/**
 * Customer Messages screen — conversation list (Batch A).
 *
 * Avatar (online dot) + name + specialty + snippet + time + unread
 * badge + order reference. Rows are intentionally non-pressable:
 * the chat dialog opens in Batch E against these same conversation
 * ids, so no dead navigation is shipped in this batch.
 */

import { color, spacing, typography } from '@khabir/ui-tokens';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ListEmpty, ListError, ListLoading } from '../components/list-state-view';

import { useConversationsViewModel } from './use-conversations-view-model';

import type { ConversationItem } from './conversations-types';

import { useI18n } from '@/i18n/use-i18n';
import { Avatar, Card } from '@/ui';

export default function ConversationsScreen() {
  const { t } = useI18n();
  const { status, data, error, retry } = useConversationsViewModel();

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('messages.title')}
      </Text>
      <Text style={styles.subtitle}>{t('messages.subtitle')}</Text>

      {status === 'loading' ? <ListLoading label={t('state.loading')} /> : null}
      {status === 'error' ? (
        <ListError
          title={t('messages.error.title')}
          message={error?.message ?? ''}
          retryLabel={t('state.retry')}
          onRetry={retry}
        />
      ) : null}
      {status === 'loaded' && data ? (
        data.conversations.length === 0 ? (
          <ListEmpty
            icon="💬"
            iconLabel="لا توجد محادثات"
            title={t('messages.empty.title')}
            body={t('messages.empty.body')}
          />
        ) : (
          <View style={styles.list}>
            {data.conversations.map((conversation) => (
              <ConversationRow key={conversation.id} conversation={conversation} />
            ))}
          </View>
        )
      ) : null}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function ConversationRow({ conversation }: { conversation: ConversationItem }) {
  const label = `محادثة مع ${conversation.technicianNameAr}، ${conversation.specialtyAr}. آخر رسالة: ${conversation.lastMessageAr}${
    conversation.unreadCount > 0 ? `. ${conversation.unreadCount} رسائل غير مقروءة` : ''
  }`;
  return (
    <Card background={color.surface.base} padded style={styles.card}>
      <View accessible accessibilityRole="text" accessibilityLabel={label} style={styles.row}>
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
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
  },
  title: {
    color: color.text.primary,
    fontSize: typography.size.h2,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  list: {
    gap: spacing[3],
    marginTop: spacing[4],
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
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
  },
  time: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
  },
  specialty: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  snippet: {
    color: color.text.primary,
    fontSize: typography.size.body,
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
    color: color.surface.base,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
