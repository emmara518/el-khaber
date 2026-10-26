/**
 * Shared types for the admin operations console.
 */

export type Tab =
  | 'metrics'
  | 'users'
  | 'technicians'
  | 'merchants'
  | 'requests'
  | 'reviews'
  | 'payments'
  | 'grants'
  | 'notify'
  | 'audit';

export interface Row {
  id: string;
  [key: string]: unknown;
}

export type DetailStatus = 'idle' | 'loading' | 'error';

/** Shared mutation handler: confirmation message is optional. */
export type OnAction = (
  path: string,
  body: unknown,
  successAr: string,
  confirmAr?: string,
) => void;
