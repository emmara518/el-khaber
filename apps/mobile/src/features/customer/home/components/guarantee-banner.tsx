import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface GuaranteeBannerProps {
  title: string;
  description: string;
  cta: string;
  onPressCta?: () => void;
}

/**
 * Gold "ضمان الخدمة الذهبي" banner with a shield icon. Matches the
 * reference design's wide gold card with a CTA button.
 */
export function GuaranteeBanner({
  title,
  description,
  cta,
  onPressCta,
}: GuaranteeBannerProps) {
  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: color.brand.goldSoft,
          borderColor: color.brand.gold,
        },
      ]}
      accessible
      accessibilityRole="summary"
    >
      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        <View style={styles.iconWrap}>
          <Text style={styles.shield}></Text>
        </View>
      </View>
      <Pressable
        onPress={onPressCta}
        accessibilityRole="button"
        accessibilityLabel={cta}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
      >
        <Text style={styles.ctaText}>{cta}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textCol: {
    flex: 1,
  },
  title: {
    color: color.brand.navy,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
  },
  description: {
    color: color.brand.navy,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'center',
    opacity: 0.8,
  },
  iconWrap: {
    marginStart: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  shield: {
    fontSize: 36,
  },
  cta: {
    marginTop: spacing[3],
    backgroundColor: color.brand.gold,
    borderRadius: radius.pill,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[5],
    alignSelf: 'flex-start',
  },
  ctaPressed: {
    opacity: 0.8,
  },
  ctaText: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
});
