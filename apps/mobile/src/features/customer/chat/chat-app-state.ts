/**
 * React Native AppState adapter for chat polling (Track B3).
 *
 * Kept out of `use-chat-view-model` so the pure view-model stays
 * importable from Node-based tests (React Native ships Flow sources
 * that Vite's SSR transform cannot parse).
 */

import { AppState } from 'react-native';

import type { ChatAppState } from './message-polling';

export const reactNativeAppState: ChatAppState = {
  isActive: () => AppState.currentState === 'active',
  subscribe: (onReturnToForeground) => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') onReturnToForeground();
    });
    return () => subscription.remove();
  },
};
