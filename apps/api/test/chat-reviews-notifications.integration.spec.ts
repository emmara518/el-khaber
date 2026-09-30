/**
 * REAL-DATABASE integration tests for Task 10H: chat, review, and
 * notification persistence against verified khabir-dev. Same contract as
 * the other integration suites: skips without a real Supabase URL, reads
 * .env WITHOUT mutating process.env, deterministic probe rows, full cleanup.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';
import { parse } from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { withTestPoolLimit } from './real-db-url';

import { ReviewsService } from '../dist/reviews/reviews.service';

const envPath = join(__dirname, '..', '.env');
let realDbUrl = '';
try {
  const parsed = parse(readFileSync(envPath, 'utf8')) as Record<string, string>;
  realDbUrl = withTestPoolLimit(parsed['DATABASE_URL'] ?? '');
} catch {
  realDbUrl = '';
}
const hasRealDb = /supabase\.com|supabase\.co/i.test(realDbUrl);

const PROBE = 't10h-probe';

describe.skipIf(!hasRealDb)('chat / reviews / notifications persistence (real khabir-dev)', () => {
  let prisma: PrismaClient;
  let customerUserId = '';
  let techUserId = '';
  let techProfileId = '';
  let categoryId = '';

  beforeAll(async () => {
    if (!hasRealDb) {
      return;
    }
    prisma = new PrismaClient({ datasources: { db: { url: realDbUrl } } });
    await cleanProbeRows();
  });

  afterAll(async () => {
    if (!hasRealDb) {
      return;
    }
    await cleanProbeRows();
    await prisma.$disconnect();
  });

  async function cleanProbeRows(): Promise<void> {
    // Requests are RESTRICT-deleted first (10B design), the rest cascades
    // from the probe users.
    await prisma.serviceRequest.deleteMany({
      where: {
        OR: [
          { customer: { email: { startsWith: `${PROBE}-` } } },
          { technician: { user: { email: { startsWith: `${PROBE}-` } } } },
        ],
      },
    });
    await prisma.notification.deleteMany({ where: { user: { email: { startsWith: `${PROBE}-` } } } });
    // Probe tag: assignments cascade away with the request reviews.
    await prisma.reviewTag.deleteMany({ where: { code: { startsWith: PROBE } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: `${PROBE}-` } } });
  }

  async function seedProbe(): Promise<void> {
    const customer = await prisma.user.create({
      data: { email: `${PROBE}-c@example.com`, passwordHash: 'probe', role: 'customer', status: 'active' },
    });
    const technician = await prisma.user.create({
      data: { email: `${PROBE}-t@example.com`, passwordHash: 'probe', role: 'technician', status: 'active' },
    });
    customerUserId = customer.id;
    techUserId = technician.id;
    const profile = await prisma.technicianProfile.create({
      data: { userId: technician.id, displayName: PROBE, verificationStatus: 'verified' },
    });
    techProfileId = profile.id;
    categoryId = (
      await prisma.applianceCategory.findFirstOrThrow({ select: { id: true } })
    ).id;
    const location = await prisma.location.create({
      data: { userId: customer.id, label: PROBE, latitude: 24.7, longitude: 46.7 },
    });
    const request = await prisma.serviceRequest.create({
      data: {
        customerId: customer.id,
        technicianId: profile.id,
        applianceCategoryId: categoryId,
        status: 'completed',
        problemTitle: PROBE,
        problemDescription: PROBE,
        locationId: location.id,
        completedAt: new Date(),
      },
    });
    await prisma.serviceRequestStatusHistory.create({
      data: { serviceRequestId: request.id, fromStatus: null, toStatus: 'pending', changedByUserId: customer.id },
    });
  }

  it('persists chat: conversation, participants, and messages', async () => {
    if (!hasRealDb) {
      return;
    }
    await seedProbe();
    const request = await prisma.serviceRequest.findFirstOrThrow({
      where: { problemTitle: PROBE },
      select: { id: true },
    });
    const conversation = await prisma.conversation.create({
      data: { serviceRequestId: request.id },
    });
    await prisma.conversationParticipant.createMany({
      data: [
        { conversationId: conversation.id, userId: customerUserId, roleSnapshot: 'customer' },
        { conversationId: conversation.id, userId: techUserId, roleSnapshot: 'technician' },
      ],
    });
    const message = await prisma.message.create({
      data: { conversationId: conversation.id, senderUserId: customerUserId, messageType: 'text', body: 'مرحباً' },
    });
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId: conversation.id },
    });
    expect(participants).toHaveLength(2);
    const loaded = await prisma.message.findUniqueOrThrow({ where: { id: message.id } });
    expect(loaded.body).toBe('مرحباً');
  });

  it('persists reviews with tags and recomputes derived rating metrics', async () => {
    if (!hasRealDb) {
      return;
    }
    const request = await prisma.serviceRequest.findFirstOrThrow({
      where: { problemTitle: PROBE },
      select: { id: true },
    });
    const tag = await prisma.reviewTag.upsert({
      where: { code: `${PROBE}-tag` },
      update: {},
      create: { code: `${PROBE}-tag`, labelAr: 'جودة الإصلاح' },
    });
    const review = await prisma.review.create({
      data: {
        serviceRequestId: request.id,
        customerId: customerUserId,
        technicianId: techProfileId,
        rating: 5,
        comment: 'عمل ممتاز',
      },
    });
    await prisma.reviewTagAssignment.create({
      data: { reviewId: review.id, tagId: tag.id },
    });

    // Duplicate prevention at the database level (unique constraint).
    await expect(
      prisma.review.create({
        data: {
          serviceRequestId: request.id,
          customerId: customerUserId,
          technicianId: techProfileId,
          rating: 4,
        },
      }),
    ).rejects.toThrow();

    const ratings = await prisma.review.findMany({
      where: { technicianId: techProfileId },
      select: { rating: true },
    });
    const avg = ratings.reduce((s, r) => s + r.rating, 0) / ratings.length;
    await prisma.technicianProfile.update({
      where: { id: techProfileId },
      data: { ratingAverage: Math.round(avg * 100) / 100, ratingCount: ratings.length },
    });
    const profile = await prisma.technicianProfile.findUniqueOrThrow({ where: { id: techProfileId } });
    expect(profile.ratingCount).toBe(1);
    expect(Number(profile.ratingAverage)).toBe(5);
  });

  it('listTags returns canonical ACTIVE tags only, ordered deterministically (WP-2C)', async () => {
    if (!hasRealDb) {
      return;
    }
    const active = await prisma.reviewTag.upsert({
      where: { code: `${PROBE}-active` },
      update: { isActive: true },
      create: { code: `${PROBE}-active`, labelAr: 'وسم نشط', isActive: true },
    });
    const inactive = await prisma.reviewTag.upsert({
      where: { code: `${PROBE}-inactive` },
      update: { isActive: false },
      create: { code: `${PROBE}-inactive`, labelAr: 'وسم غير نشط', isActive: false },
    });

    const reviews = new ReviewsService(prisma as never);
    const tags = await reviews.listTags();

    expect(tags.length).toBeGreaterThan(0);
    expect(tags.some((t) => t.id === active.id && t.labelAr === 'وسم نشط')).toBe(true);
    expect(tags.some((t) => t.id === inactive.id)).toBe(false);

    // UUID is the canonical identifier and ordering follows `code` asc.
    const rows = await prisma.reviewTag.findMany({
      where: { id: { in: tags.map((t) => t.id) } },
      select: { id: true, code: true },
    });
    const codeById = new Map(rows.map((r) => [r.id, r.code]));
    const codesInOrder = tags.map((t) => codeById.get(t.id) ?? '');
    expect(codesInOrder).toEqual([...codesInOrder].sort());
  });

  it('persists notifications with read-state ownership', async () => {
    if (!hasRealDb) {
      return;
    }
    const n1 = await prisma.notification.create({
      data: { userId: customerUserId, type: 'request_status', titleAr: 'تم التحديث', bodyAr: 'حالة الطلب تغيرت' },
    });
    const marked = await prisma.notification.updateMany({
      where: { id: n1.id, userId: customerUserId },
      data: { readAt: new Date() },
    });
    expect(marked.count).toBe(1);
    // Another recipient cannot mark it (owner scope — zero rows match).
    const outsider = await prisma.user.create({
      data: { email: `${PROBE}-x@example.com`, passwordHash: 'probe', role: 'customer', status: 'active' },
    });
    const foreign = await prisma.notification.updateMany({
      where: { id: n1.id, userId: outsider.id },
      data: { readAt: new Date() },
    });
    expect(foreign.count).toBe(0);
  });
});
