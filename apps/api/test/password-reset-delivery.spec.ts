import { describe, expect, it, vi } from 'vitest';

import {
  DeferredPasswordResetDelivery,
  PASSWORD_RESET_DELIVERY,
  type PasswordResetDeliveryMessage,
} from '../src/auth/password-reset-delivery.port';
import { PasswordResetService } from '../src/auth/password-reset.service';

import type { PrismaService } from '../src/database/prisma.service';

/**
 * Unit tests for the password-reset delivery boundary (Task 10D §4):
 * the service must hand the raw token ONLY to the delivery port, never
 * return it beyond the service contract, and never invoke delivery for
 * unknown accounts (enumeration safety).
 */

function makePrisma(user: { id: string; phone: string | null; email: string | null } | null): {
  prisma: PrismaService;
  created: Array<Record<string, unknown>>;
} {
  const created: Array<Record<string, unknown>> = [];
  const prisma = {
    user: {
      findFirst: vi.fn(async () => user),
    },
    passwordResetToken: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        created.push(args.data);
        return { id: 'token-1', ...args.data };
      }),
    },
    refreshToken: {
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  } as unknown as PrismaService;
  return { prisma, created };
}

describe('password reset delivery boundary', () => {
  it('hands the raw token to the delivery port with the account contact channels', async () => {
    const { prisma } = makePrisma({ id: 'u1', phone: '+201234567890', email: 'u@example.com' });
    const sent: PasswordResetDeliveryMessage[] = [];
    const delivery = { sendPasswordReset: vi.fn(async (m: PasswordResetDeliveryMessage) => { sent.push(m); }) };

    const service = new PasswordResetService(prisma, delivery);
    const result = await service.requestReset({ email: 'u@example.com' });

    expect(result.accepted).toBe(true);
    expect(result.issued).toBe(true);
    expect(delivery.sendPasswordReset).toHaveBeenCalledTimes(1);
    expect(sent[0]?.contact).toEqual({ phone: '+201234567890', email: 'u@example.com' });
    expect(sent[0]?.rawToken).toBeTypeOf('string');
    expect((sent[0]?.rawToken ?? '').length).toBeGreaterThanOrEqual(20);
  });

  it('never invokes delivery for unknown accounts (enumeration safety)', async () => {
    const { prisma } = makePrisma(null);
    const delivery = { sendPasswordReset: vi.fn() };

    const service = new PasswordResetService(prisma, delivery);
    const result = await service.requestReset({ email: 'nobody@example.com' });

    expect(result).toEqual({ accepted: true, issued: false });
    expect(delivery.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('persists only the SHA-256 hash of the token, never the raw value', async () => {
    const { prisma, created } = makePrisma({ id: 'u2', phone: null, email: 'u2@example.com' });
    const delivery = { sendPasswordReset: vi.fn(async () => undefined) };

    const service = new PasswordResetService(prisma, delivery);
    const result = await service.requestReset({ email: 'u2@example.com' });

    expect(created).toHaveLength(1);
    const stored = created[0] as { tokenHash: string };
    expect(stored.tokenHash).toHaveLength(64);
    expect(stored.tokenHash).not.toContain(result.rawToken ?? '');
    expect(result.rawToken).toBeDefined();
    expect(result.rawToken).not.toBe(stored.tokenHash);
  });

  it('persists the hash BEFORE handing the token to delivery', async () => {
    const order: string[] = [];
    const { prisma } = makePrisma({ id: 'u3', phone: null, email: 'u3@example.com' });
    (prisma.passwordResetToken.create as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      order.push('persist');
      return {};
    });
    const delivery = {
      sendPasswordReset: vi.fn(async () => {
        order.push('deliver');
      }),
    };

    const service = new PasswordResetService(prisma, delivery);
    await service.requestReset({ email: 'u3@example.com' });
    expect(order).toEqual(['persist', 'deliver']);
  });

  describe('DeferredPasswordResetDelivery', () => {
    it('resolves without side effects and never exposes the token', async () => {
      const adapter = new DeferredPasswordResetDelivery();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      await expect(
        adapter.sendPasswordReset({ contact: { email: 'x@example.com' }, rawToken: 'RAW-TOKEN-VALUE' }),
      ).resolves.toBeUndefined();
      // Nothing was logged anywhere.
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('is exported as the default DI-bound implementation', () => {
      expect(PASSWORD_RESET_DELIVERY).toBeDefined();
      expect(new DeferredPasswordResetDelivery()).toHaveProperty('sendPasswordReset');
    });
  });
});
