/**
 * Lightweight, injectable message polling (Track B3).
 *
 * The chat stays HTTP-only — no realtime transport. While the dialog
 * is open, this helper refreshes the history on a fixed interval so
 * the peer's replies appear without a manual reload.
 *
 * Invariants:
 * - at most ONE request in flight (a slow response never stacks),
 * - `isActive` gates every tick (app background / hidden dialog),
 * - errors are swallowed by default — a transient poll failure must
 *   never disturb the composer or wipe visible messages,
 * - `stop()` cancels the interval and drops any in-flight result.
 */

export const CHAT_POLL_INTERVAL_MS = 6000;

/**
 * Minimal foreground/background contract. Implemented by the React
 * Native adapter in `chat-app-state.ts`; pure modules (and tests) stay
 * free of a `react-native` import.
 */
export interface ChatAppState {
  isActive: () => boolean;
  subscribe: (onReturnToForeground: () => void) => () => void;
}

export const ALWAYS_ACTIVE_APP_STATE: ChatAppState = {
  isActive: () => true,
  subscribe: () => () => undefined,
};

export interface MessagePollingOptions<T> {
  readonly intervalMs: number;
  readonly fetch: () => Promise<T>;
  readonly onData: (data: T) => void;
  readonly onError?: (error: unknown) => void;
  readonly isActive?: () => boolean;
}

export interface MessagePolling {
  /** Fetch immediately (e.g. when the app returns to the foreground). */
  refresh: () => void;
  stop: () => void;
}

export function startMessagePolling<T>(options: MessagePollingOptions<T>): MessagePolling {
  let stopped = false;
  let inFlight = false;

  const tick = (): void => {
    if (stopped || inFlight) return;
    if (options.isActive !== undefined && !options.isActive()) return;
    inFlight = true;
    void options
      .fetch()
      .then((data) => {
        if (!stopped) options.onData(data);
      })
      .catch((error: unknown) => {
        if (!stopped) options.onError?.(error);
      })
      .finally(() => {
        inFlight = false;
      });
  };

  const timer = setInterval(tick, options.intervalMs);

  return {
    refresh: tick,
    stop: () => {
      stopped = true;
      clearInterval(timer);
    },
  };
}
