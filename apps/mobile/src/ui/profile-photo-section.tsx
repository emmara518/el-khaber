/**
 * Profile photo section (WP-01).
 *
 * Shared presentational block for the customer/technician/merchant
 * profile screens: current photo (or initials fallback), gallery +
 * camera pick buttons, local preview with confirm/cancel before upload,
 * upload/delete states with retry, and delete confirmation.
 *
 * No data fetching here — the owning view-model owns picking state,
 * upload/delete calls, and persistence. All copy is Arabic.
 */

import { color, spacing } from '@khabir/ui-tokens';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from './action-button';
import { Avatar } from './avatar';
import { type } from './typography';

export type ProfilePhotoStatus =
  | 'idle'
  | 'picking'
  | 'uploading'
  | 'uploaded'
  | 'deleting'
  | 'deleted'
  | 'error';

export interface ProfilePhotoSectionProps {
  /** Server-issued public URL (null when absent). Never a storage key. */
  imageUrl: string | null;
  /** Local preview URI picked but not uploaded yet (null when none). */
  pendingUri: string | null;
  initialsAr: string;
  nameAr: string;
  status: ProfilePhotoStatus;
  error: string | null;
  onPickLibrary: () => void;
  onTakeCamera: () => void;
  onConfirmUpload: () => void;
  onCancelPending: () => void;
  onDelete: () => void;
  onRetry: () => void;
  onDismissStatus: () => void;
}

export function ProfilePhotoSection(props: ProfilePhotoSectionProps) {
  const {
    imageUrl,
    pendingUri,
    initialsAr,
    nameAr,
    status,
    error,
    onPickLibrary,
    onTakeCamera,
    onConfirmUpload,
    onCancelPending,
    onDelete,
    onRetry,
    onDismissStatus,
  } = props;
  const [confirmArmed, setConfirmArmed] = useState(false);
  const busy = status === 'picking' || status === 'uploading' || status === 'deleting';
  const shownUri = pendingUri ?? imageUrl;

  return (
    <View style={styles.root}>
      <Avatar
        initials={initialsAr}
        imageUrl={shownUri}
        size={72}
        background={color.brand.gold}
        foreground={color.brand.navy}
        accessibilityLabel={`الصورة الشخصية لـ ${nameAr}`}
      />
      {pendingUri !== null ? (
        <Text style={styles.hint}>معاينة الصورة المختارة — أكّد الرفع أو ألغِ.</Text>
      ) : null}

      {pendingUri !== null ? (
        <View style={styles.row}>
          <ActionButton
            label="تأكيد الرفع"
            icon="upload"
            loading={status === 'uploading'}
            loadingLabel="جارٍ الرفع…"
            disabled={busy && status !== 'uploading'}
            onPress={onConfirmUpload}
          />
          <ActionButton
            variant="secondary"
            label="إلغاء"
            disabled={busy}
            onPress={() => {
              setConfirmArmed(false);
              onCancelPending();
            }}
          />
        </View>
      ) : (
        <View style={styles.row}>
          <ActionButton
            variant="secondary"
            label="المعرض"
            icon="image"
            loading={status === 'picking'}
            loadingLabel="جارٍ الاختيار…"
            disabled={busy}
            onPress={onPickLibrary}
          />
          <ActionButton
            variant="secondary"
            label="الكاميرا"
            icon="camera"
            disabled={busy}
            onPress={onTakeCamera}
          />
        </View>
      )}

      {pendingUri === null && imageUrl !== null ? (
        confirmArmed ? (
          <View style={styles.row}>
            <ActionButton
              variant="destructive"
              label="تأكيد الحذف"
              icon="trash-2"
              loading={status === 'deleting'}
              loadingLabel="جارٍ الحذف…"
              onPress={() => {
                setConfirmArmed(false);
                onDelete();
              }}
            />
            <ActionButton
              variant="secondary"
              label="تراجع"
              disabled={status === 'deleting'}
              onPress={() => setConfirmArmed(false)}
            />
          </View>
        ) : (
          <ActionButton
            variant="secondary"
            label="حذف الصورة"
            icon="trash-2"
            disabled={busy}
            onPress={() => setConfirmArmed(true)}
          />
        )
      ) : null}

      {status === 'error' ? (
        <View
          accessibilityRole="alert"
          accessibilityLabel={`خطأ: ${error ?? ''}`}
          style={styles.errorBox}
        >
          <Text style={styles.errorText}>{error ?? 'فشل العملية. حاول مجددًا.'}</Text>
          <ActionButton variant="secondary" label="إعادة المحاولة" onPress={onRetry} />
        </View>
      ) : null}

      {status === 'uploaded' ? (
        <View accessibilityRole="alert" style={styles.successBox}>
          <Text style={styles.successText}>تم حفظ الصورة بنجاح.</Text>
          <ActionButton variant="secondary" label="حسنًا" onPress={onDismissStatus} />
        </View>
      ) : null}

      {status === 'deleted' ? (
        <View accessibilityRole="alert" style={styles.successBox}>
          <Text style={styles.successText}>تم حذف الصورة.</Text>
          <ActionButton variant="secondary" label="حسنًا" onPress={onDismissStatus} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: spacing[3],
  },
  hint: {
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  row: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  errorBox: {
    backgroundColor: color.error.soft,
    borderWidth: 1,
    borderColor: color.error.DEFAULT,
    borderRadius: 12,
    padding: spacing[3],
    gap: spacing[2],
    width: '100%',
  },
  errorText: {
    ...type.body,
    color: color.error.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  successBox: {
    backgroundColor: color.success.soft,
    borderWidth: 1,
    borderColor: color.success.DEFAULT,
    borderRadius: 12,
    padding: spacing[3],
    gap: spacing[2],
    width: '100%',
  },
  successText: {
    ...type.bodyMedium,
    color: color.success.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
