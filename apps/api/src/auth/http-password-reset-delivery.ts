/**
 * HTTP password-reset delivery adapter.
 *
 * Activated only when `PASSWORD_RESET_DELIVERY_URL` is configured (see
 * `auth.module.ts`). It POSTs the account contact channel(s) plus the raw
 * one-time token to an operator-provided email/SMS gateway webhook — the
 * only component that ever sees the raw token. This keeps the provider
 * boundary real (no fake delivery) while remaining vendor-agnostic and
 * dependency-free.
 *
 * When the variable is unset, the deferred no-op is used instead and this
 * adapter never runs.
 */

import { Injectable } from '@nestjs/common';

import type {
  PasswordResetDeliveryMessage,
  PasswordResetDeliveryPort,
} from './password-reset-delivery.port';

const TIMEOUT_MS = 5000;

@Injectable()
export class HttpPasswordResetDelivery implements PasswordResetDeliveryPort {
  constructor(
    private readonly url: string,
    private readonly bearerToken: string | null,
  ) {}

  async sendPasswordReset(message: PasswordResetDeliveryMessage): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.bearerToken !== null ? { authorization: `Bearer ${this.bearerToken}` } : {}),
        },
        body: JSON.stringify({
          purpose: 'password_reset',
          contact: message.contact,
          token: message.rawToken,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        // Status only — never the token, never the response body.
        throw new Error(`password reset delivery failed with status ${String(response.status)}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }
}
