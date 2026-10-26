/**
 * Notification preferences ViewModel (WP-Notifications).
 *
 * Server-authoritative only: no toggle is considered saved before the
 * server confirms it. Failures surface with retry; the last confirmed
 * values stay on screen (no fake-saved state, no localStorage source).
 */

import { useCallback, useEffect, useState } from 'react';

import { toUserMessage } from '../../lib/api-error';

import {
  ApiNotificationsDataSource,
  type NotificationPreferences,
  type NotificationsDataSource,
  type NotificationsRole,
} from './notifications-data-source';

export type PreferencesStatus = 'loading' | 'loaded' | 'error';

export interface NotificationPreferencesState {
  status: PreferencesStatus;
  preferences: NotificationPreferences | null;
  error: string | null;
  retry: () => void;
  /** True while a save is in flight (toggles disabled). */
  saving: boolean;
  saveError: string | null;
  setPreference: (key: keyof NotificationPreferences, value: boolean) => void;
}

export function useNotificationPreferencesViewModel(
  role: NotificationsRole,
  source?: NotificationsDataSource,
): NotificationPreferencesState {
  const [stableSource] = useState<NotificationsDataSource>(
    () => source ?? new ApiNotificationsDataSource(),
  );
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<PreferencesStatus>('loading');
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    setPreferences(null);
    void (async () => {
      try {
        const prefs = await stableSource.getPreferences({ role });
        if (cancelled) return;
        setPreferences(prefs);
        setStatus('loaded');
      } catch (err: unknown) {
        if (cancelled) return;
        setError(toUserMessage(err, 'تعذر تحميل التفضيلات'));
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stableSource, role, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const setPreference = useCallback(
    (key: keyof NotificationPreferences, value: boolean) => {
      if (preferences === null || saving) return;
      const next: NotificationPreferences = { ...preferences, [key]: value };
      setSaving(true);
      setSaveError(null);
      void (async () => {
        try {
          // The server echoes the persisted values — the ONLY saved truth.
          const saved = await stableSource.updatePreferences({ role, preferences: next });
          setPreferences(saved);
        } catch (err: unknown) {
          setSaveError(toUserMessage(err, 'تعذر حفظ التفضيلات'));
        } finally {
          setSaving(false);
        }
      })();
    },
    [preferences, saving, stableSource, role],
  );

  return { status, preferences, error, retry, saving, saveError, setPreference };
}
