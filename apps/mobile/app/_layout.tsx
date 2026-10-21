import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { type PropsWithChildren, useEffect } from 'react';
import { I18nManager, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { groupForSegments, resolveRouteForSession } from '../src/features/auth/role-routing';
import { useI18n } from '../src/i18n/use-i18n';
import { useAuthStore } from '../src/lib/auth-store';
import { AppErrorBoundary } from '../src/ui/app-error-boundary';
import { APP_DOCUMENT_TITLE } from '../src/ui/app-title';
import { useAppFonts } from '../src/ui/fonts';

/**
 * Root layout — single multi-role app (docs/01_PROJECT.md §2).
 *
 * Responsibilities:
 * - Force Arabic RTL on every platform.
 * - Bootstrap the existing session (`useAuthStore.bootstrap()` reads
 *   SecureStore + refreshes the access token).
 * - Own the auth route guard: anonymous users can only stay on
 *   public routes, authenticated users are resolved to their
 *   session-role home, unknown roles recover via `/login`.
 *
 * The guard trusts ONLY `user.role` from the authenticated session.
 */
export default function RootLayout() {
  const { loaded: fontsLoaded, error: fontError } = useAppFonts();
  if (I18nManager.isRTL === false) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  }
  useI18n();
  // Hold first paint only while the fonts are still loading. If the load
  // fails, `fontError` is set and we render anyway (platform fallback)
  // rather than getting stuck on a blank screen.
  if (!fontsLoaded && !fontError) {
    return null;
  }
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {Platform.OS === 'web' ? (
          <Head>
            <title>{APP_DOCUMENT_TITLE}</title>
          </Head>
        ) : null}
        <MainLandmark>
          <AppErrorBoundary>
            <AuthGate />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#FFFFFF' },
              }}
            />
          </AppErrorBoundary>
        </MainLandmark>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function MainLandmark({ children }: PropsWithChildren) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View role="main" style={styles.main}>
      {children}
    </View>
  );
}

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  // Navigation must be mounted before any imperative redirect —
  // otherwise a cold start on a guarded deep link crashes with
  // "Attempted to navigate before mounting the Root Layout".
  const navState = useRootNavigationState();
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.user?.role ?? null);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (navState?.key === undefined) return;
    const group = groupForSegments(segments as Array<string | undefined>);
    const target = resolveRouteForSession({ status, role }, group);
    if (target === null) return;
    if (status === 'authenticated' && target === '/login') {
      // Invalid/unknown role: clear the session first so the user
      // lands on a safe recovery state instead of a broken shell.
      void logout().finally(() => router.replace('/login'));
      return;
    }
    router.replace(target as '/');
  }, [status, role, segments, navState?.key, router, logout]);

  return null;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  main: {
    flex: 1,
  },
});
