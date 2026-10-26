import { AppState } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';


import { reactNativeAppState } from './chat-app-state';

const appState = AppState as unknown as {
  setState: (state: 'active' | 'background' | 'inactive') => void;
  emit: (state: 'active' | 'background' | 'inactive') => void;
};

afterEach(() => {
  appState.setState('active');
});

describe('reactNativeAppState (M4)', () => {
  it('reports foreground/background accurately', () => {
    appState.setState('active');
    expect(reactNativeAppState.isActive()).toBe(true);
    appState.setState('background');
    expect(reactNativeAppState.isActive()).toBe(false);
    appState.setState('inactive');
    expect(reactNativeAppState.isActive()).toBe(false);
  });

  it('notifies only on returning to the foreground and unsubscribes cleanly', () => {
    const onReturn = vi.fn();
    const unsubscribe = reactNativeAppState.subscribe(onReturn);

    appState.emit('background');
    expect(onReturn).not.toHaveBeenCalled();
    appState.emit('active');
    expect(onReturn).toHaveBeenCalledTimes(1);

    unsubscribe();
    appState.emit('active');
    expect(onReturn).toHaveBeenCalledTimes(1);
  });
});
