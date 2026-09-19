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
import { SceneHero, SceneSection } from '@/ui/cinematic';

export default function ConversationsScreen() {
  const { t } = useI18n();
  const { status, data, error, retry } = useConversationsViewModel();

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <SceneHero
        compact
        asset="technician_profile_reviews"
        eyebrow={t('messages.subtitle')}
        title={t('messages.title')}
        body="محادثاتك مرتبطة بطلباتك الحالية، وكل رسالة تصل للفني المعني."
      />

      <View style={styles.editorial}>
        {status === 'loading' ? <ListLoading label={t('state.loading')} asset="technician_availability" /> : null}
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
            <SceneSection eyebrow="المحادثات" title={`${data.conversations.length} محادثة`} body="افتح الطلب للدخول إلى المحادثة مع الفني.">
              <View style={styles.list}>
                {data.conversations.map((conversation) => (
                  <ConversationRow key={conversation.id} conversation={conversation} />
                ))}
              </View>
            </SceneSection>
          )
        ) : null}
        <View style={styles.bottomSpacer} />
      </View>
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
