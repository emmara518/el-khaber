/**
 * Password-reset delivery boundary (Task 10D §4).
 *
 * `PasswordResetService` produces a one-time reset token but must never
 * deliver it itself, never log it, and never return it in an HTTP
 * response. Delivery goes through this provider-agnostic port; an
 * approved email/SMS/push adapter can be plugged in later WITHOUT any
 * change to the identity flow.
 *
 * No provider is approved yet (ADR-0001 defers payments/notifications;
 * no email/SMS vendor decision exists), so the default implementation is
 * a DEFERRED no-op: it delivers nothing, records nothing, and never
 * logs the token. It must never claim that a message was delivered.
 *
 * Selecting and approving a real delivery provider is a CTO decision
 * (see Task 10D report, CTO Decisions Required).
 */

import { Injectable } from '@nestjs/common';

export const PASSWORD_RESET_DELIVERY = Symbol('PASSWORD_RESET_DELIVERY');

export interface PasswordResetDeliveryMessage {
  /** The account's registered contact channel(s) that matched. */
  contact: { phone?: string; email?: string };
  /** The raw one-time token. Only the delivery adapter ever sees it. */
  rawToken: string;
}

export interface PasswordResetDeliveryPort {
  sendPasswordReset(message: PasswordResetDeliveryMessage): Promise<void>;
}

@Injectable()
export class DeferredPasswordResetDelivery implements PasswordResetDeliveryPort {
  /**
   * Deferred boundary: no delivery provider is approved (CTO decision
   * pending). Intentionally performs nothing. MUST NOT log or persist
   * the raw token, and MUST NOT report success/delivery.
   */
  async sendPasswordReset(_message: PasswordResetDeliveryMessage): Promise<void> {
    return undefined;
  }
}
