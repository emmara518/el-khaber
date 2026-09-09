/**
 * Technician Active Service screen (T-D).
 *
 * "ماذا أفعل الآن؟": current status + hint, request context
 * (customer/appliance/problem/location/appointment), and exactly ONE
 * documented next action per state (accepted → أنا في الطريق →
 * on_the_way; on_the_way → بدء العمل → in_progress; in_progress →
 * إنهاء الخدمة with confirmation → completed). Terminal states show
 * no actions. Stale/error keep the current state visible with safe
 * Arabic copy and retry. Shares the shared request session source so
 * list/detail/active remain consistent.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ChatDialog } from '../../customer/chat/chat-dialog';
import { MockChatDataSource } from '../../customer/chat/mock-chat-data-source';
import { ListEmpty, ListError, ListLoading } from '../../customer/components/list-state-view';

import { useTechnicianActiveServiceViewModel } from './use-technician-active-service-view-model';

import type { TechnicianRequestsDataSource } from './mock-technician-requests-data-source';

import { useI18n } from '@/i18n/use-i18n';
import { Card, StatusBadge } from '@/ui';


const STATUS_HINTS: Record<string, string> = {
  accepted: 'تم قبول الطلب. عند توجّهك إلى العميل، أكّد الانطلاق.',
  on_the_way: 'أنت في الطريق إلى العميل. عند بدء العمل على الجهاز، حدّث الحالة.',
  in_progress: 'العمل جارٍ على الطلب. عند إتمامه بالكامل، أكّد إنهاء الخدمة.',
  completed: 'اكتملت الخدمة على هذا الطلب.',
  cancelled: 'تم إلغاء هذا الطلب.',
};

export default function TechnicianActiveServiceScreen({
  requestId,
  source,
}: {
  requestId: string;
  source?: TechnicianRequestsDataSource;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const vm = useTechnicianActiveServiceViewModel(requestId, source);
  const [confirmingComplete, setConfirmingComplete] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  if (vm.loadStatus === 'loading') {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('tech.active.title')}
        </Text>
        <ListLoading label={t('state.loading')} />
      </ScrollView>
    );
  }

  if (vm.loadStatus === 'error') {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('tech.active.title')}
        </Text>
        <ListError
          title={t('tech.active.loadError')}
          message={vm.loadError?.message ?? ''}
          retryLabel={t('state.retry')}
          onRetry={vm.reload}
        />
      </ScrollView>
    );
  }

  const request = vm.request;
  if (!request) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <ListEmpty
          icon="🛠️"
          iconLabel="طلب غير موجود"
          title={t('tech.request.missing')}
          body={t('tech.request.missingBody')}
          actionLabel={t('tech.active.backToList')}
          onAction={() => router.replace('/(technician)/orders')}
        />
      </ScrollView>
    );
  }

  const hint = STATUS_HINTS[request.status] ?? '';
  const isTerminal = request.status === 'completed' || request.status === 'cancelled';
  const showCompleteConfirm = request.status === 'in_progress' && confirmingComplete;
  const submitting = vm.actionStatus === 'submitting';

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.heading}>
        <View>
          <Text accessibilityRole="header" style={styles.title}>
            {t('tech.active.title')}
          </Text>
          <Text style={styles.ref}>
            {t('tech.request.ref')}: {request.id}
          </Text>
        </View>
        <StatusBadge status={request.status} label={request.statusLabelAr} />
      </View>

      <Card
        background={isTerminal ? color.surface.base : color.brand.navy}
        borderColor={isTerminal ? color.border.default : color.brand.navy}
        padded
        style={styles.now}
      >
        <Text style={[styles.nowLabel, isTerminal && styles.nowLabelMuted]}>
          {t('tech.active.now')}
        </Text>
        <Text style={[styles.nowHint, isTerminal && styles.nowHintMuted]}>{hint}</Text>
      </Card>

      <Card background={color.surface.base} padded style={styles.card}>
        <Text style={styles.sectionLabel}>{t('tech.request.customer')}</Text>
        <Text style={styles.value}>{request.customerNameAr}</Text>
      </Card>

      <Card background={color.surface.base} padded style={styles.card}>
        <Text style={styles.sectionLabel}>{t('tech.request.problem')}</Text>
        <Text style={styles.value}>
          {request.applianceAr} · {request.problemAr}
        </Text>
        <Text style={styles.body}>{request.descriptionAr}</Text>
      </Card>

      <Card background={color.surface.base} padded style={styles.card}>
        <Text style={styles.sectionLabel}>{t('tech.request.logistics')}</Text>
        <Text style={styles.value}>📍 {request.locationAr}</Text>
        {request.appointmentAr !== null ? (
          <Text style={styles.value}>🕐 {request.appointmentAr}</Text>
        ) : null}
      </Card>

      {vm.actionStatus === 'success' && vm.actionResult !== null ? (
        vm.actionResult.status === 'completed' ? (
          <Card
            background={color.success.soft}
            borderColor={color.success.DEFAULT}
            padded
            style={styles.card}
          >
            <Text accessibilityRole="alert" style={styles.successTitle}>
              {t('tech.active.completedTitle')}
            </Text>
            <Text style={styles.body}>{t('tech.active.completedBody')}</Text>
          </Card>
        ) : (
          <Card
            background={color.success.soft}
            borderColor={color.success.DEFAULT}
            padded
            style={styles.card}
          >
            <Text accessibilityRole="alert" style={styles.successTitle}>
              {t('tech.active.advanced')}
            </Text>
            <Text style={styles.body}>
              {t('tech.active.nowState')} {request.statusLabelAr}
            </Text>
          </Card>
        )
      ) : null}

      {vm.actionStatus === 'error' ? (
        <View accessibilityRole="alert" accessibilityLabel={`خطأ: ${vm.actionError ?? ''}`} style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>{vm.actionError}</Text>
        </View>
      ) : null}

      {vm.nextActionAr !== null ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={vm.nextActionAr}
          accessibilityState={{ disabled: submitting, busy: submitting }}
          onPress={() => {
            if (request.status === 'in_progress') {
              setConfirmingComplete(true);
            } else {
              vm.advance();
            }
          }}
          disabled={submitting}
          style={({ pressed }) => [
            styles.primary,
            submitting && styles.disabled,
            pressed && !submitting && styles.pressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator
              accessibilityLabel="جارٍ تحديث حالة الطلب"
              color={color.surface.base}
            />
          ) : (
            <Text style={styles.primaryText}>{vm.nextActionAr}</Text>
          )}
        </Pressable>
      ) : null}

      {vm.actionStatus === 'error' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('state.retry')}
          onPress={vm.resetAction}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>{t('state.retry')}</Text>
        </Pressable>
      ) : null}

      {request.status === 'on_the_way' || request.status === 'in_progress' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`مراسلة العميل ${request.customerNameAr}`}
          onPress={() => setChatOpen(true)}
          style={({ pressed }) => [styles.chat, pressed && styles.pressed]}
        >
          <Text style={styles.chatText}>💬 {t('tech.active.chat')}</Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('tech.active.backToList')}
        onPress={() => router.replace('/(technician)/orders')}
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryText}>{t('tech.active.backToList')}</Text>
      </Pressable>

      <ChatDialog
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        conversationId={`req-chat-${request.id}`}
        technicianNameAr={request.customerNameAr}
        source={new MockChatDataSource({ sender: 'technician' })}
      />

      <Modal
        visible={showCompleteConfirm}
        transparent
        animationType="fade"
        accessibilityLabel="تأكيد إنهاء الخدمة"
        onRequestClose={() => setConfirmingComplete(false)}
      >
        <View style={styles.scrim}>
          <Card background={color.surface.base} padded style={styles.dialog}>
            <Text accessibilityRole="header" style={styles.dialogTitle}>
              {t('tech.active.confirmComplete')}
            </Text>
            <Text style={styles.body}>{t('tech.active.confirmCompleteBody')}</Text>
            <View style={styles.dialogActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('tech.active.confirmYes')}
                accessibilityState={{ disabled: submitting, busy: submitting }}
                onPress={() => {
                  setConfirmingComplete(false);
                  vm.advance();
                }}
                disabled={submitting}
                style={({ pressed }) => [styles.primaryInline, pressed && styles.pressed]}
              >
                <Text style={styles.primaryText}>{t('tech.active.confirmYes')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('tech.active.confirmNo')}
                onPress={() => setConfirmingComplete(false)}
                style={({ pressed }) => [styles.secondaryInline, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryText}>{t('tech.active.confirmNo')}</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </Modal>
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  title: {
    color: color.text.primary,
    fontSize: typography.size.h2,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  ref: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  now: {
    marginTop: spacing[3],
    gap: spacing[1],
    paddingVertical: spacing[4],
  },
  nowLabel: {
    color: color.brand.gold,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
  },
  nowLabelMuted: {
    color: color.text.secondary,
  },
  nowHint: {
    color: color.surface.base,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 26,
  },
  nowHintMuted: {
    color: color.text.secondary,
  },
  card: {
    marginTop: spacing[3],
    gap: spacing[1],
  },
  sectionLabel: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
  },
  value: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  body: {
    color: color.text.primary,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 26,
  },
  successTitle: {
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
  },
  inlineError: {
    backgroundColor: color.error.soft,
    borderWidth: 1,
    borderColor: color.error.DEFAULT,
    borderRadius: radius.md,
    padding: spacing[3],
    marginTop: spacing[3],
  },
  inlineErrorText: {
    color: color.error.DEFAULT,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  primary: {
    backgroundColor: color.brand.navy,
    borderRadius: radius.md,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
  },
  primaryText: {
    color: color.surface.base,
    fontSize: typography.size.button,
    fontWeight: typography.weight.semibold,
  },
  primaryInline: {
    flex: 1,
    backgroundColor: color.brand.navy,
    borderRadius: radius.md,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.brand.navy,
    borderRadius: radius.md,
    minHeight: 52,
    marginTop: spacing[4],
  },
  chatText: {
    color: color.surface.base,
    fontSize: typography.size.button,
    fontWeight: typography.weight.semibold,
  },
  secondary: {
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    borderRadius: radius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[3],
  },
  secondaryInline: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    borderRadius: radius.md,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.8,
  },
  scrim: {
    flex: 1,
    backgroundColor: color.overlay.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    gap: spacing[2],
  },
  dialogTitle: {
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
