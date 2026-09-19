/**
 * Customer rating form (Batch E).
 *
 * "قيّم تجربتك": 1–5 stars (required, filled vs. outline + text
 * label — never color alone), optional tags, optional comment.
 * Submitting/success lock the form against duplicates; error offers
 * retry with input preserved.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';


import { RATING_LABELS_AR, RATING_TAGS_AR, type RatingDataSource } from './rating-types';
import { useRatingViewModel } from './use-rating-view-model';

import { Icon } from '@/ui/icon';
import { sceneAssets } from '@/ui/scene-assets';

export function RatingForm({
  requestId,
  technicianId,
  technicianNameAr,
  source,
}: {
  requestId: string;
  technicianId: string;
  technicianNameAr: string;
  source?: RatingDataSource;
}) {
  const vm = useRatingViewModel({ requestId, technicianId }, source);

  if (vm.submitStatus === 'success') {
    return (
      <View
        accessibilityRole="text"
        accessibilityLabel="تم إرسال تقييمك بنجاح. شكرًا لك."
        style={styles.done}
      >
        <Image
          source={sceneAssets.tracking_success}
          accessible={false}
          importantForAccessibility="no"
          resizeMode="cover"
          style={styles.doneScene}
        />
        <Text style={styles.doneTitle}>تم إرسال تقييمك بنجاح</Text>
        <Text style={styles.doneBody}>شكرًا لك — تقييمك يساعد عملاء آخرين على الاختيار بثقة.</Text>
      </View>
    );
  }

  const submitting = vm.submitStatus === 'submitting';

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>قيّم تجربتك مع {technicianNameAr}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="اختيار التقييم بالنجوم" style={styles.stars}>
        {[1, 2, 3, 4, 5].map((value) => {
          const selected = vm.stars !== null && value <= vm.stars;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={`${value} من ٥: ${RATING_LABELS_AR[value]}${vm.stars === value ? '، محدد حاليًا' : ''}`}
              accessibilityState={{ selected: vm.stars === value, checked: vm.stars === value }}
              onPress={() => vm.selectStars(value)}
              disabled={submitting}
              style={({ pressed }) => [styles.star, pressed && !submitting && styles.pressed]}
            >
              <Icon
                name="star"
                size={34}
                color={selected ? color.brand.gold : color.border.default}
              />
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.ratingLabel}>
        {vm.stars !== null ? RATING_LABELS_AR[vm.stars] : 'اختر عدد النجوم'}
      </Text>
      {vm.fieldError !== null ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {vm.fieldError}
        </Text>
      ) : null}

      <Text style={styles.groupLabel}>ما الذي أعجبك؟ (اختياري)</Text>
      <View style={styles.tags}>
        {RATING_TAGS_AR.map((tag) => {
          const on = vm.tags.includes(tag);
          return (
            <Pressable
              key={tag}
              accessibilityRole="checkbox"
              accessibilityLabel={`وسم: ${tag}${on ? '، محدد' : ''}`}
              accessibilityState={{ selected: on, checked: on }}
              onPress={() => vm.toggle(tag)}
              disabled={submitting}
              style={({ pressed }) => [styles.tag, on && styles.tagOn, pressed && styles.pressed]}
            >
              {on ? <Icon name="check" size={14} color={color.brand.navy} /> : null}
              <Text style={[styles.tagText, on && styles.tagTextOn]}>{tag}</Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        accessibilityLabel="تعليق إضافي، اختياري"
        placeholder="تعليق إضافي (اختياري)…"
        placeholderTextColor={color.text.secondary}
        value={vm.comment}
        onChangeText={vm.setComment}
        style={[styles.input, styles.multiline]}
        textAlign="right"
        multiline
        numberOfLines={3}
        editable={!submitting}
      />

      {vm.submitStatus === 'error' ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {vm.submitError}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="إرسال التقييم"
        accessibilityState={{ disabled: submitting, busy: submitting }}
        onPress={vm.submit}
        disabled={submitting}
        style={({ pressed }) => [styles.submit, submitting && styles.disabled, pressed && !submitting && styles.pressed]}
      >
        {submitting ? (
          <ActivityIndicator accessibilityLabel="جارٍ إرسال التقييم" color={color.surface.base} />
        ) : (
          <Text style={styles.submitText}>إرسال التقييم</Text>
        )}
      </Pressable>
      {vm.submitStatus === 'error' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="إعادة محاولة إرسال التقييم"
          onPress={() => {
            vm.retry();
            vm.submit();
          }}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
        >
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing[3],
  },
  heading: {
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[1],
  },
  star: {
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  ratingLabel: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    textAlign: 'center',
  },
  error: {
    color: color.error.DEFAULT,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  groupLabel: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    textAlign: 'right',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  tag: {
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    backgroundColor: color.surface.base,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[1] + 2,
  },
  tagOn: {
    borderColor: color.brand.navy,
    borderWidth: 2,
    backgroundColor: color.surface.base,
  },
  tagText: {
    color: color.text.secondary,
    fontSize: typography.size.body,
  },
  tagTextOn: {
    color: color.text.primary,
    fontWeight: typography.weight.bold,
  },
  input: {
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.md,
    backgroundColor: color.surface.base,
    color: color.text.primary,
    fontSize: typography.size.body,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  submit: {
    backgroundColor: color.brand.navy,
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  submitText: {
    color: color.surface.base,
    fontSize: typography.size.button,
    fontWeight: typography.weight.semibold,
  },
  retry: {
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    borderRadius: radius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  done: {
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  doneBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: color.success.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneScene: {
    width: '100%',
    height: 140,
    borderRadius: radius.lg,
    backgroundColor: color.brand.navyDeep,
  },
  doneTitle: {
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
  },
  doneBody: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    textAlign: 'center',
  },
});
