/**
 * Safe back navigation.
 *
 * `router.back()` warns when the stack has no history (e.g. a cold
 * deep link). This hook falls back to a typed route so back buttons
 * never dead-end.
 */

import { useRouter } from 'expo-router';
import { useCallback } from 'react';

export type SafeBackFallback = '/(customer)/find-technician' | '/(customer)/store' | '/(technician)/store';

export function useSafeBack(fallback: SafeBackFallback): () => void {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback);
    }
  }, [router, fallback]);
}
