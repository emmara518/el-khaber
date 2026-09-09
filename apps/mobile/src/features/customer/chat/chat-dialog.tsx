/**
 * Contextual chat dialog (Batch E) — docs/04_UI_UX.md §21 pattern:
 * dismissible modal over the current service context with scrim,
 * technician header, close control, conversation area, composer,
 * and send button. Closing never leaves the tracking screen.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRef } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useChatViewModel } from './use-chat-view-model';

import type { ChatDataSource } from './chat-types';
import type { ChatMessage } from './chat-types';

export function ChatDialog({
  visible,
  onClose,
  conversationId,
  technicianNameAr,
  source,
}: {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  technicianNameAr: string;
  source?: ChatDataSource;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      accessibilityLabel={`محادثة مع ${technicianNameAr}`}
      onRequestClose={onClose}
    >
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <ChatBody
            conversationId={conversationId}
            technicianNameAr={technicianNameAr}
            onClose={onClose}
            source={source}
          />
        </View>
      </View>
    </Modal>
  );
}

export function ChatBody({
  conversationId,
  technicianNameAr,
  onClose,
  source,
}: {
  conversationId: string;
  technicianNameAr: string;
  onClose: () => void;
  source?: ChatDataSource;
}) {
  const vm = useChatViewModel(conversationId, 'customer', source);
  const scrollRef = useRef<ScrollView>(null);

  return (
    <View style={styles.body}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{technicianNameAr}</Text>
          <Text style={styles.headerSub}>محادثة الطلب الحالي</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="إغلاق المحادثة"
          onPress={onClose}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.history}>
        {vm.loadStatus === 'loading' ? (
          <ActivityIndicator accessibilityLabel="جارٍ تحميل المحادثة" color={color.brand.navy} />
        ) : null}
        {vm.loadStatus === 'error' ? (
          <View style={styles.center}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              تعذر تحميل المحادثة
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="إعادة تحميل المحادثة"
              onPress={vm.reload}
              style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
            >
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </Pressable>
          </View>
        ) : null}
        {vm.loadStatus === 'loaded' ? (
          vm.messages.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.muted}>لا توجد رسائل بعد. ابدأ المحادثة أدناه.</Text>
            </View>
          ) : (
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.messages}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {vm.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onRetry={() => vm.retryFailed(message.id)}
                />
              ))}
            </ScrollView>
          )
        ) : null}
      </View>

      {vm.sendError !== null ? (
        <Text accessibilityRole="alert" style={styles.sendError}>
          {vm.sendError}
        </Text>
      ) : null}
      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="اكتب رسالتك"
          placeholder="اكتب رسالتك…"
          placeholderTextColor={color.text.secondary}
          value={vm.draft}
          onChangeText={vm.setDraft}
          style={styles.input}
          textAlign="right"
          multiline
          editable={!vm.sending}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="إرسال الرسالة"
          accessibilityState={{ disabled: vm.draft.trim().length === 0 || vm.sending }}
          onPress={vm.send}
          disabled={vm.draft.trim().length === 0 || vm.sending}
          style={({ pressed }) => [
            styles.send,
            (vm.draft.trim().length === 0 || vm.sending) && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {vm.sending ? (
            <ActivityIndicator accessibilityLabel="جارٍ الإرسال" color={color.surface.base} size="small" />
          ) : (
            <Text style={styles.sendText}>➤</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function MessageBubble({ message, onRetry }: { message: ChatMessage; onRetry: () => void }) {
  const outgoing = message.sender === 'customer';
  return (
    <View style={[styles.bubbleRow, outgoing ? styles.outgoingRow : styles.incomingRow]}>
      <View
        accessibilityLabel={`${outgoing ? 'رسالتك' : 'رسالة الفني'}: ${message.textAr}، ${message.timeAr}${
          message.status === 'error' ? '، فشل الإرسال' : message.status === 'sending' ? '، جارٍ الإرسال' : ''
        }`}
        style={[styles.bubble, outgoing ? styles.outgoing : styles.incoming]}
      >
        <Text style={[styles.bubbleText, outgoing ? styles.outgoingText : styles.incomingText]}>
          {message.textAr}
        </Text>
        <Text style={[styles.bubbleTime, outgoing ? styles.outgoingText : styles.incomingText]}>
          {message.timeAr}
          {message.status === 'sending' ? ' · جارٍ الإرسال…' : ''}
        </Text>
        {message.status === 'error' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إعادة إرسال الرسالة"
            onPress={onRetry}
            style={styles.bubbleRetry}
          >
            <Text style={styles.bubbleRetryText}>إعادة الإرسال ⟳</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: color.overlay.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: color.surface.subtle,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
    minHeight: '60%',
  },
  body: {
    flex: 1,
    padding: spacing[4],
    gap: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.brand.navy,
    borderRadius: radius.lg,
    padding: spacing[4],
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: color.surface.base,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
  },
  headerSub: {
    color: color.brand.goldSoft,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  close: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: color.surface.base,
    fontSize: 20,
    fontWeight: typography.weight.bold,
  },
  history: {
    flex: 1,
    minHeight: 200,
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    gap: spacing[2],
  },
  messages: {
    gap: spacing[2],
    paddingVertical: spacing[2],
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  incomingRow: {
    justifyContent: 'flex-start',
  },
  outgoingRow: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: radius.lg,
    padding: spacing[3],
  },
  incoming: {
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
  },
  outgoing: {
    backgroundColor: color.brand.navy,
  },
  bubbleText: {
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 24,
  },
  incomingText: {
    color: color.text.primary,
  },
  outgoingText: {
    color: color.surface.base,
  },
  bubbleTime: {
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'right',
    opacity: 0.8,
  },
  bubbleRetry: {
    marginTop: spacing[1],
    minHeight: 44,
    justifyContent: 'center',
  },
  bubbleRetryText: {
    color: color.brand.gold,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
  },
  sendError: {
    color: color.error.DEFAULT,
    fontSize: typography.size.caption,
    textAlign: 'right',
  },
  errorText: {
    color: color.error.DEFAULT,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  muted: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    textAlign: 'center',
  },
  retry: {
    backgroundColor: color.brand.navy,
    borderRadius: radius.md,
    minHeight: 44,
    paddingHorizontal: spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: color.surface.base,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.lg,
    backgroundColor: color.surface.base,
    color: color.text.primary,
    fontSize: typography.size.body,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 52,
    maxHeight: 120,
  },
  send: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: color.brand.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  sendText: {
    color: color.surface.base,
    fontSize: 20,
    transform: [{ scaleX: -1 }],
  },
});
