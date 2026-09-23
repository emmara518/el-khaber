import { color, spacing } from '@khabir/ui-tokens';
import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/i18n/use-i18n';
import { Card } from '@/ui/card';
import { type } from '@/ui/typography';

/**
 * Reusable placeholder screen for the Customer tabs that are not
 * yet implemented (طلبات, صيانة, المحادثات, الملف الشخصي). The
 * content is explicitly marked as not part of the current product
 * surface so it cannot be confused with a real screen.
 */
interface PlaceholderScreenProps {
  titleAr: string;
  bodyAr?: string;
  children?: ReactNode;
}

export function PlaceholderScreen({ titleAr, bodyAr, children }: PlaceholderScreenProps) {
  const { t } = useI18n();
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerSpacer} />
      <Card background={color.surface.base} padded style={styles.card}>
        <Text style={styles.title}>{titleAr}</Text>
        <Text style={styles.body}>{bodyAr ?? t('placeholder.body')}</Text>
        {children}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
  },
  headerSpacer: {
    height: spacing[4],
  },
  card: {
    alignItems: 'center',
  },
  title: {
    ...type.h2,
    color: color.text.primary,
  },
  body: {
    ...type.body,
    color: color.text.secondary,
    marginTop: spacing[3],
    textAlign: 'center',
  },
});
