import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { startMessagePolling } from './message-polling';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('startMessagePolling (Track B3)', () => {
  it('fetches on the interval and stops cleanly', async () => {
    const fetch = vi.fn().mockResolvedValue(['a']);
    const onData = vi.fn();
    const polling = startMessagePolling({ intervalMs: 1000, fetch, onData });

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith(['a']);

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetch).toHaveBeenCalledTimes(2);

    polling.stop();
    onData.mockClear();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(onData).not.toHaveBeenCalled();
  });

  it('never stacks requests: a slow in-flight fetch skips later ticks', async () => {
    let resolveFirst!: (value: string[]) => void;
    const fetch = vi.fn(
      () =>
        new Promise<string[]>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const onData = vi.fn();
    const polling = startMessagePolling({ intervalMs: 1000, fetch, onData });

    await vi.advanceTimersByTimeAsync(3000);
    expect(fetch).toHaveBeenCalledTimes(1);

    resolveFirst(['x']);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetch).toHaveBeenCalledTimes(2);

    polling.stop();
  });

  it('skips ticks while inactive and lets refresh force an immediate fetch', async () => {
    let active = false;
    const fetch = vi.fn().mockResolvedValue([]);
    const polling = startMessagePolling({
      intervalMs: 1000,
      fetch,
      onData: () => undefined,
      isActive: () => active,
    });

    await vi.advanceTimersByTimeAsync(3000);
    expect(fetch).not.toHaveBeenCalled();

    active = true;
    polling.refresh();
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledTimes(1);

    polling.stop();
  });

  it('swallows poll errors without emitting data', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('offline'));
    const onData = vi.fn();
    const onError = vi.fn();
    const polling = startMessagePolling({ intervalMs: 1000, fetch, onData, onError });

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(onData).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);

    polling.stop();
  });
});
