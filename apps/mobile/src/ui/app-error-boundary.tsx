/**
 * Root render-error boundary (M2).
 *
 * A render crash must never leave a white screen. The fallback is an
 * Arabic, RTL, brand-consistent surface with one clear retry action.
 *
 * Diagnostics are intentionally minimal: error NAME and component stack
 * only. Never log message bodies, props, tokens, or API payloads — a
 * thrown error can contain user data.
 */

import { color, spacing } from '@khabir/ui-tokens';
import { Component } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import * as typeScale from './typography';

import type { ErrorInfo, ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    if (typeof console !== 'undefined') {
      console.warn('[app] render error', {
        name: error.name,
        componentStack: info.componentStack?.slice(0, 500) ?? null,
      });
    }
  }

  private readonly retry = (): void => {
    this.setState({ hasError: false });
  };

  public render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.root} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <Text style={styles.title}>حصلت مشكلة غير متوقعة</Text>
        <Text style={styles.body}>
          التطبيق واجه خطأ أثناء العرض. بياناتك محفوظة، وجرّب تكمل من غير ما تقفل التطبيق.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="إعادة محاولة عرض التطبيق"
          onPress={this.retry}
          style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
        >
          <Text style={styles.retryText}>حاول تاني</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.brand.navy,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    writingDirection: 'rtl',
  },
  title: {
    ...typeScale.type.h2,
    color: '#FFFFFF',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: spacing[3],
  },
  body: {
    ...typeScale.type.body,
    color: color.border.default,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: spacing[6],
    maxWidth: 340,
  },
  retry: {
    minHeight: 48,
    minWidth: 160,
    paddingHorizontal: spacing[6],
    borderRadius: 24,
    backgroundColor: color.brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryPressed: {
    opacity: 0.85,
  },
  retryText: {
    ...typeScale.type.button,
    color: color.brand.navy,
    writingDirection: 'rtl',
  },
});
