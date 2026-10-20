/**
 * Refresh a screen's data when it regains focus.
 *
 * The first focus is the initial mount (the view model already loaded),
 * so it is skipped to avoid a duplicate request. Every later focus
 * triggers a fresh server read.
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

export function useRefreshOnFocus(refresh: () => void): void {
  const firstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refresh();
    }, [refresh]),
  );
}
