/**
 * Service Request lifecycle service (Task 10F).
 * Source: docs/07_API.md §7, §13, §22; docs/06_DATABASE.md §11–§13;
 * Task 10F CTO rules.
 *
 * Concurrency model (§21): every mutation is a SINGLE atomic
 * `updateMany` whose `where` clause carries the expected current status
 * AND the actor scope. The loser of a race receives count=0 → canonical
 * conflict/stale handling with no second mutation. Status write and
 * history record always happen in the same transaction (§22).
 *
 * Ownership (§7): the customer id and technician id come from the
 * verified JWT (request.user) — never from the payload. Cross-account
 * access returns the same 404 as a missing request.
 */


import { buildPageMeta } from '@khabir/shared-types';
import { Injectable } from '@nestjs/common';


import { InvalidStateTransitionException, NotFoundException } from '../common/errors';
import { PrismaService } from '../database/prisma.service';
import { requestStatusNotification } from '../notifications/notification-events';
import { NotificationsService } from '../notifications/notifications.service';

import { rulesFor, type TransitionAction } from './request-state';

import type { ServiceRequestDto, ServiceRequestSummaryDto } from '@khabir/shared-types';
import type {
  CreateServiceRequestInput,
  ServiceRequestListQuery,
} from '@khabir/shared-validation';
import type { Prisma } from '@prisma/client';

const HISTORY_BOUND = 50;

const SUMMARY_SELECT = {
  id: true,
  status: true,
  problemTitle: true,
  problemDescription: true,
  applianceCategoryId: true,
  serviceId: true,
  faultId: true,
  technicianId: true,
  scheduledAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ServiceRequestSelect;

const DETAIL_SELECT = {
  ...SUMMARY_SELECT,
  acceptedAt: true,
  startedAt: true,
  completedAt: true,
  cancelledAt: true,
  location: {
    select: {
      label: true,
      addressText: true,
      city: true,
      region: true,
      latitude: true,
      longitude: true,
    },
  },
} satisfies Prisma.ServiceRequestSelect;

type SummaryRow = Prisma.ServiceRequestGetPayload<{ select: typeof SUMMARY_SELECT }>;
type DetailRow = Prisma.ServiceRequestGetPayload<{ select: typeof DETAIL_SELECT }>;

function toSummaryDto(row: SummaryRow): ServiceRequestSummaryDto {
  return {
    ...row,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetailDto(row: DetailRow): Omit<ServiceRequestDto, 'history'> {
  return {
    id: row.id,
    status: row.status,
    problemTitle: row.problemTitle,
    problemDescription: row.problemDescription,
    applianceCategoryId: row.applianceCategoryId,
    serviceId: row.serviceId,
    faultId: row.faultId,
    technicianId: row.technicianId,
    location: {
      label: row.location.label,
      addressText: row.location.addressText,
      city: row.location.city,
      region: row.location.region,
      latitude: Number(row.location.latitude),
      longitude: Number(row.location.longitude),
    },
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

interface RequestUserRef {
  id: string;
  role: 'customer' | 'technician' | 'merchant';
}

@Injectable()
export class ServiceRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Customer create (docs/07_API.md §7)
  // ---------------------------------------------------------------------------

  async create(customerId: string, input: CreateServiceRequestInput): Promise<ServiceRequestDto> {
    // Referential validation with explicit, ownership-aware lookups. A
    // non-existent or non-owned reference is a 404 — never a raw FK error.
    const technician = await this.prisma.technicianProfile.findFirst({
      where: { id: input.technician_id, verificationStatus: 'verified' },
      select: { id: true },
    });
    if (technician === null) {
      throw new NotFoundException('Technician not found');
    }
    const location = await this.prisma.location.findFirst({
      where: { id: input.location_id, userId: customerId },
      select: { id: true },
    });
    if (location === null) {
      // Ownership + existence in one check (IDOR-safe).
      throw new NotFoundException('Location not found');
    }
    const category = await this.prisma.applianceCategory.findFirst({
      where: { id: input.appliance_category_id },
      select: { id: true },
    });
    if (category === null) {
      throw new NotFoundException('Appliance category not found');
    }
    if (input.service_id !== undefined) {
      const service = await this.prisma.service.findFirst({
        where: { id: input.service_id },
        select: { id: true },
      });
      if (service === null) {
        throw new NotFoundException('Service not found');
      }
    }
    if (input.fault_id !== undefined) {
      const fault = await this.prisma.fault.findFirst({
        where: { id: input.fault_id },
        select: { id: true },
      });
      if (fault === null) {
        throw new NotFoundException('Fault not found');
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.serviceRequest.create({
        data: {
          customerId,
          technicianId: input.technician_id,
          applianceCategoryId: input.appliance_category_id,
          serviceId: input.service_id,
          faultId: input.fault_id,
          status: 'pending',
          problemTitle: input.problem_title,
          problemDescription: input.problem_description,
          locationId: input.location_id,
          scheduledAt: input.scheduled_at,
        },
        select: { id: true },
      });
      await tx.serviceRequestStatusHistory.create({
        data: {
          serviceRequestId: row.id,
          fromStatus: null,
          toStatus: 'pending',
          changedByUserId: customerId,
        },
      });
      return row;
    });

    return this.detailForCustomer(created.id, customerId);
  }

  // ---------------------------------------------------------------------------
  // Lists (role-scoped)
  // ---------------------------------------------------------------------------

  /**
   * Resolves the technician PROFILE id for a technician account. The JWT
   * subject is the user id; `service_requests.technician_id` references
   * `technician_profiles.id` (docs/06_DATABASE.md §11). Returns null when
   * the account has no technician profile.
   */
  private async resolveTechnicianProfileId(userId: string): Promise<string | null> {
    const profile = await this.prisma.technicianProfile.findFirst({
      where: { userId },
      select: { id: true },
    });
    return profile?.id ?? null;
  }

  async list(
    user: RequestUserRef,
    query: ServiceRequestListQuery,
  ): Promise<{ items: ServiceRequestSummaryDto[]; meta: ReturnType<typeof buildPageMeta> }> {
    const { page, limit, status } = query;

    if (user.role === 'technician') {
      const profileId = await this.resolveTechnicianProfileId(user.id);
      if (profileId === null) {
        return { items: [], meta: buildPageMeta(page, limit, 0) };
      }
      const where: Prisma.ServiceRequestWhereInput =
        status === undefined
          ? {
              OR: [
                { status: 'pending', technicianId: profileId },
                { technicianId: profileId, status: { not: 'pending' } },
              ],
            }
          : { status, technicianId: profileId };
      return this.listWhere(page, limit, where);
    }

    const where: Prisma.ServiceRequestWhereInput = {
      customerId: user.id,
      ...(status !== undefined ? { status } : {}),
    };
    return this.listWhere(page, limit, where);
  }

  private async listWhere(
    page: number,
    limit: number,
    where: Prisma.ServiceRequestWhereInput,
  ): Promise<{ items: ServiceRequestSummaryDto[]; meta: ReturnType<typeof buildPageMeta> }> {
    const [total, rows] = await Promise.all([
      this.prisma.serviceRequest.count({ where }),
      this.prisma.serviceRequest.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: SUMMARY_SELECT,
      }),
    ]);
    return { items: rows.map(toSummaryDto), meta: buildPageMeta(page, limit, total) };
  }

  // ---------------------------------------------------------------------------
  // Detail (role-scoped projections, §14)
  // ---------------------------------------------------------------------------

  async detail(user: RequestUserRef, id: string): Promise<ServiceRequestDto> {
    let scope: Prisma.ServiceRequestWhereInput;
    if (user.role === 'customer') {
      scope = { id, customerId: user.id };
    } else if (user.role === 'technician') {
      const profileId = await this.resolveTechnicianProfileId(user.id);
      if (profileId === null) {
        throw new NotFoundException('Service request not found');
      }
      // Targeted (pending) or assigned (any state) — identical 404 otherwise.
      scope = { id, OR: [{ technicianId: profileId }, { status: 'pending', technicianId: profileId }] };
    } else {
      throw new NotFoundException('Service request not found');
    }
    const row = await this.prisma.serviceRequest.findFirst({
      where: scope,
      select: DETAIL_SELECT,
    });
    if (row === null) {
      // Cross-account access is indistinguishable from a missing request.
      throw new NotFoundException('Service request not found');
    }
    const history = await this.prisma.serviceRequestStatusHistory.findMany({
      where: { serviceRequestId: id },
      orderBy: { createdAt: 'asc' },
      take: HISTORY_BOUND,
      select: {
        id: true,
        fromStatus: true,
        toStatus: true,
        changedByUserId: true,
        createdAt: true,
      },
    });
    return {
      ...toDetailDto(row),
      history: history.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() })),
    };
  }

  private async detailForCustomer(id: string, customerId: string): Promise<ServiceRequestDto> {
    return this.detail({ id: customerId, role: 'customer' }, id);
  }

  // ---------------------------------------------------------------------------
  // Atomic transitions (§4, §9–§11, §21, §22)
  // ---------------------------------------------------------------------------

  /**
   * Server-authoritative recipient for a service-request transition
   * (Task 10M §8). The counterparty is derived from the request's own
   * relationships — never from client input:
   *   - a TECHNICIAN action notifies the request's customer;
   *   - a CUSTOMER action (cancel) notifies the assigned technician's USER
   *     account (`service_requests.technician_id` references the technician
   *     PROFILE).
   * Returns null when no counterparty account exists.
   */
  private async resolveCounterparty(
    tx: Prisma.TransactionClient,
    actor: RequestUserRef,
    id: string,
  ): Promise<string | null> {
    const row = await tx.serviceRequest.findFirst({
      where: { id },
      select: { customerId: true, technicianId: true },
    });
    if (row === null) {
      return null;
    }
    if (actor.role === 'technician') {
      return row.customerId;
    }
    if (row.technicianId === null) {
      return null;
    }
    const profile = await tx.technicianProfile.findFirst({
      where: { id: row.technicianId },
      select: { userId: true },
    });
    return profile?.userId ?? null;
  }

  /**
   * Applies ONE atomic transition: `updateMany` carries the expected
   * current status + actor scope, so the winner of any race is decided by
   * PostgreSQL row locking. count=0 means either the request is not
   * visible to this actor (404) or the status has moved on (409 stale).
   * Status write + history record + counterparty notification share one
   * transaction: a stale/duplicate action mutates nothing and therefore
   * can never emit a phantom notification (Task 10M §11).
   */
  private async transition(
    actor: RequestUserRef,
    action: TransitionAction,
    id: string,
    scope: Prisma.ServiceRequestWhereInput,
  ): Promise<ServiceRequestDto> {
    const rules = rulesFor(actor.role, action);
    if (rules.length === 0) {
      throw new InvalidStateTransitionException();
    }

    for (const rule of rules) {
      const result = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.serviceRequest.updateMany({
          where: { id, ...scope, status: rule.from },
          data: {
            status: rule.to,
            ...(rule.stamp !== undefined ? { [rule.stamp]: new Date() } : {}),
          },
        });
        if (updated.count === 0) {
          return 'no-match' as const;
        }
        await tx.serviceRequestStatusHistory.create({
          data: {
            serviceRequestId: id,
            fromStatus: rule.from,
            toStatus: rule.to,
            changedByUserId: actor.id,
          },
        });
        // Business event → persisted notification, same transaction.
        const recipientId = await this.resolveCounterparty(tx, actor, id);
        if (recipientId !== null) {
          await this.notifications.create(recipientId, requestStatusNotification(rule.to), tx);
        }
        return 'applied' as const;
      });
      if (result === 'applied') {
        return this.detail(actor, id);
      }
    }

    // No rule matched: distinguish not-visible (404) from stale state (409
    // INVALID_STATE_TRANSITION — the canonical stale/competitor response).
    const exists = await this.prisma.serviceRequest.findFirst({
      where: { id, ...scope },
      select: { id: true, status: true },
    });
    if (exists === null) {
      throw new NotFoundException('Service request not found');
    }
    throw new InvalidStateTransitionException();
  }

  async accept(user: RequestUserRef, id: string): Promise<ServiceRequestDto> {
    return this.technicianTransition(user, 'accept', id);
  }

  /**
   * Technician transitions act on the technician PROFILE id (the request's
   * `technician_id` FK). Accounts without a technician profile have no
   * requests — identical 404.
   */
  private async technicianTransition(
    user: RequestUserRef,
    action: TransitionAction,
    id: string,
  ): Promise<ServiceRequestDto> {
    const profileId = await this.resolveTechnicianProfileId(user.id);
    if (profileId === null) {
      throw new NotFoundException('Service request not found');
    }
    return this.transition(user, action, id, { id, technicianId: profileId });
  }

  async reject(user: RequestUserRef, id: string): Promise<ServiceRequestDto> {
    return this.technicianTransition(user, 'reject', id);
  }

  async start(user: RequestUserRef, id: string): Promise<ServiceRequestDto> {
    return this.technicianTransition(user, 'start', id);
  }

  async complete(user: RequestUserRef, id: string): Promise<ServiceRequestDto> {
    return this.technicianTransition(user, 'complete', id);
  }

  async cancel(user: RequestUserRef, id: string): Promise<ServiceRequestDto> {
    return this.transition(user, 'cancel', id, { id, customerId: user.id });
  }
}
