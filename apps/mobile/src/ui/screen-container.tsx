import { color, spacing } from '@khabir/ui-tokens';
import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n/use-i18n';

interface ScreenContainerProps {
  children: ReactNode;
  /** Background color override; defaults to the app background. */
  background?: string;
  /** Add extra top padding under the safe-area (e.g. for a dark hero). */
  topInset?: boolean;
  style?: ViewStyle;
}

/**
 * App screen wrapper. Owns the safe area and the base background.
 * Every screen wraps its content with this component so the dark
 * header / light body pattern is consistent.
 */
export function ScreenContainer({
  children,
  background,
  topInset = false,
  style,
}: ScreenContainerProps) {
  // We intentionally read i18n here only to keep the helper "wired"
  // for the future English locale. RTL is enforced at the root.
  useI18n();
  return (
    <SafeAreaView
      edges={topInset ? [] : ['bottom', 'left', 'right']}
      style={[
        styles.root,
        { backgroundColor: background ?? color.surface.subtle },
        style,
      ]}
    >
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing[5],
  },
});
