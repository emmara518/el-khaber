/**
 * Compile-time feature flags.
 *
 * Keep every flag FALSE unless the feature is fully implemented and tested.
 * A false flag must remove the UI entry point, not merely disable styling.
 */
export const FEATURE_FLAGS = {
  /**
   * Google/Facebook sign-in. There is no OAuth provider integration in
   * V2.1, so the buttons must never be shown (they would be dead controls).
   */
  socialAuth: false,
} as const;
