/**
 * In-memory Prisma client used by the e2e tests. Only the surface
 * actually touched by the auth flow is implemented. This is test-only
 * code and never loaded in production.
 *
 * Source: Task #002 §16 (Real Test Infrastructure).
 */

import { randomUUID } from 'node:crypto';

type Role = 'customer' | 'technician' | 'merchant';
type Status = 'active' | 'suspended' | 'pending' | 'deleted';

interface UserRow {
  id: string;
  phone: string | null;
  email: string | null;
  passwordHash: string;
  role: Role;
  status: Status;
  phoneVerified: boolean;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface RefreshRow {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
}

interface AdminRow {
  id: string;
  email: string;
  passwordHash: string;
  role: 'super_admin' | 'operations_admin' | 'content_admin' | 'support_admin';
  status: Status;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AdminRefreshRow {
  id: string;
  adminId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
}

interface PasswordResetRow {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Catalog / content models (Task 10E). Only the surface actually used by
// the catalog services is implemented.
// -----------------------------------------------------------------------------

export type PublishStatus = 'draft' | 'review' | 'published' | 'archived';
export type VerificationStatusValue = 'pending' | 'verified' | 'rejected' | 'suspended';
export type AvailabilityStatusValue = 'available' | 'busy' | 'unavailable';
export type ServiceRequestStatusValue =
  | 'pending'
  | 'accepted'
  | 'on_the_way'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

interface ApplianceCategoryRow {
  id: string;
  nameAr: string;
  slug: string;
  iconUrl: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface FaultRow {
  id: string;
  applianceCategoryId: string;
  nameAr: string;
  slug: string;
  severityLevel: string | null;
  summaryAr: string;
  guidanceAr: string;
  safetyNoteAr: string | null;
  whenToCallTechnicianAr: string | null;
  publishStatus: PublishStatus;
  sortOrder: number;
  updatedAt: Date;
}

interface ServiceRow {
  id: string;
  applianceCategoryId: string;
  nameAr: string;
  slug: string;
  descriptionAr: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface LocationRow {
  id: string;
  userId: string | null;
  label: string | null;
  addressText: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}

interface ServiceRequestRow {
  id: string;
  customerId: string;
  technicianId: string | null;
  applianceCategoryId: string;
  serviceId: string | null;
  faultId: string | null;
  status: ServiceRequestStatusValue;
  problemTitle: string | null;
  problemDescription: string;
  locationId: string;
  scheduledAt: Date | null;
  createdAt: Date;
  acceptedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  updatedAt: Date;
}

interface ServiceRequestStatusHistoryRow {
  id: string;
  serviceRequestId: string;
  fromStatus: ServiceRequestStatusValue | null;
  toStatus: ServiceRequestStatusValue;
  changedByUserId: string | null;
  note: string | null;
  createdAt: Date;
}

export type ProductStatusValue = 'active' | 'suspended';

interface MerchantProfileRow {
  id: string;
  userId: string;
  businessName: string | null;
  bio: string | null;
  logoUrl: string | null;
  contactPhone: string | null;
  locationId: string | null;
  verificationStatus: VerificationStatusValue;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductRow {
  id: string;
  merchantId: string;
  nameAr: string;
  slug: string;
  descriptionAr: string | null;
  price: number | null;
  stockQuantity: number | null;
  imageUrl: string | null;
  status: ProductStatusValue;
  createdAt: Date;
  updatedAt: Date;
}

interface ConversationRow {
  id: string;
  serviceRequestId: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
}

interface ConversationParticipantRow {
  id: string;
  conversationId: string;
  userId: string;
  roleSnapshot: string | null;
  joinedAt: Date;
}

interface MessageRow {
  id: string;
  conversationId: string;
  senderUserId: string;
  messageType: 'text';
  body: string | null;
  createdAt: Date;
  readAt: Date | null;
}

interface ReviewRow {
  id: string;
  serviceRequestId: string;
  customerId: string;
  technicianId: string;
  rating: number;
  comment: string | null;
  problemResolved: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

interface NotificationRow {
  id: string;
  userId: string;
  type: string;
  titleAr: string;
  bodyAr: string;
  dataJson: Record<string, unknown> | null;
  readAt: Date | null;
  createdAt: Date;
}

export type PaymentMethodValue = 'instapay' | 'vodafone_cash';
export type PaymentSubmissionStatusValue = 'pending' | 'approved' | 'rejected';

interface PaymentMethodConfigRow {
  id: string;
  method: PaymentMethodValue;
  accountIdentifier: string;
  displayName: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SubscriptionPlanRow {
  id: string;
  role: 'customer' | 'technician' | 'merchant';
  code: string;
  nameAr: string;
  nameEn: string | null;
  billingInterval: string;
  price: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
}

interface SubscriptionRow {
  id: string;
  userId: string;
  planId: string;
  status: 'pending' | 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
  startedAt: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelledAt: Date | null;
  renewalEnabled: boolean;
  providerReference: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PaymentSubmissionRow {
  id: string;
  userId: string;
  planId: string;
  subscriptionId: string | null;
  method: PaymentMethodValue;
  transferReference: string;
  proofStorageKey: string | null;
  status: PaymentSubmissionStatusValue;
  reviewedByAdminId: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface EntitlementGrantRow {
  id: string;
  userId: string;
  entitlementId: string;
  grantedByAdminId: string | null;
  createdAt: Date;
}

interface EntitlementRow {
  id: string;
  code: string;
  nameAr: string;
  descriptionAr: string | null;
  featureGroup: string;
  isActive: boolean;
}

interface AuditLogRow {
  id: string;
  actorUserId: string | null;
  actorAdminId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  beforeJson: unknown;
  afterJson: unknown;
  createdAt: Date;
}

interface AreaRow {
  id: string;
  technicianId: string;
  labelAr: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TechnicianServiceRow {
  technicianId: string;
  serviceId: string;
  priceFrom: number | null;
  isActive: boolean;
}

interface TechnicianProfileRow {
  id: string;
  userId: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  verificationStatus: VerificationStatusValue;
  availabilityStatus: AvailabilityStatusValue;
  experienceYears: number;
  completedServicesCount: number;
  ratingAverage: number | null;
  ratingCount: number;
}

/** Apply a Prisma-style `select` map to a row (top-level keys only). */
function applySelect<T extends Record<string, unknown>>(row: T, select: Record<string, unknown> | undefined): T {
  if (select === undefined) {
    return row;
  }
  const picked: Record<string, unknown> = {};
  for (const key of Object.keys(select)) {
    // Nested select objects (relation includes) are honored as "include
    // the relation" — the fake returns the full nested row.
    if (select[key] && key in row) {
      picked[key] = row[key];
    }
  }
  return picked as T;
}

function textContains(value: string | null, needle: string): boolean {
  return value !== null && value.includes(needle);
}

function includesTextFilter(
  row: Record<string, unknown>,
  or: Array<Record<string, { contains?: string; mode?: string }>> | undefined,
): boolean {
  if (or === undefined) {
    return true;
  }
  return or.some((branch) => {
    for (const [field, filter] of Object.entries(branch)) {
      if (!textContains((row[field] as string | null) ?? null, filter.contains ?? '')) {
        return false;
      }
    }
    return true;
  });
}

class FakePrismaClient {
  users: UserRow[] = [];
  refreshTokens: RefreshRow[] = [];
  passwordResetTokens: PasswordResetRow[] = [];
  adminUsers: AdminRow[] = [];
  adminRefreshTokens: AdminRefreshRow[] = [];
  applianceCategories: ApplianceCategoryRow[] = [];
  faults: FaultRow[] = [];
  services: ServiceRow[] = [];
  faultServiceLinks: FaultServiceLinkRow[] = [];
  technicianServices: TechnicianServiceRow[] = [];
  areaRows: AreaRow[] = [];
  technicianProfiles: TechnicianProfileRow[] = [];
  locations: LocationRow[] = [];
  serviceRequests: ServiceRequestRow[] = [];
  serviceRequestStatusHistoryStore: ServiceRequestStatusHistoryRow[] = [];
  merchantProfiles: MerchantProfileRow[] = [];
  products: ProductRow[] = [];
  subscriptionPlans: SubscriptionPlanRow[] = [];
  subscriptions: SubscriptionRow[] = [];
  entitlements: EntitlementRow[] = [];
  entitlementGrantRows: EntitlementGrantRow[] = [];
  paymentMethodConfigs: PaymentMethodConfigRow[] = [];
  paymentSubmissionRows: PaymentSubmissionRow[] = [];
  auditLogRows: AuditLogRow[] = [];
  conversations: ConversationRow[] = [];
  conversationParticipants: ConversationParticipantRow[] = [];
  messageRows: MessageRow[] = [];
  reviewRows: ReviewRow[] = [];
  reviewTagRows: Array<{ id: string; code: string; labelAr: string; isActive: boolean }> = [];
  reviewTagAssignmentRows: Array<{ reviewId: string; tagId: string }> = [];
  notificationRows: NotificationRow[] = [];

  $connect(): Promise<void> {
    return Promise.resolve();
  }

  $disconnect(): Promise<void> {
    return Promise.resolve();
  }

  $queryRaw(): Promise<unknown> {
    return Promise.resolve([{ '?column?': 1 }]);
  }

  /**
   * Mirrors the real `PrismaService.isConnected()` so the readiness
   * probe does not throw on the fake.
   */
  isConnected(): boolean {
    return true;
  }

  /**
   * Transaction support. The fake executes the callback synchronously
   * against `this`, so all model methods see the same in-memory state.
   * This is sufficient for the auth e2e suite which only tests single
   * transactions. A production transaction client would rollback on
   * exception; the fake propagates the error and the caller can choose
   * to swallow it.
   */
  $transaction<T>(fn: (tx: this) => Promise<T>): Promise<T> {
    return fn(this);
  }

  user = {
    findFirst: async (args: { where: { OR?: Array<{ phone?: string } | { email?: string } | { id: string }>; id?: string } }): Promise<UserRow | null> => {
      if (args.where.id !== undefined) {
        return this.users.find((u) => u.id === args.where.id) ?? null;
      }
      for (const u of this.users) {
        for (const cond of args.where.OR ?? []) {
          if ('phone' in cond && cond.phone !== undefined && u.phone === cond.phone) {
            return u;
          }
          if ('email' in cond && cond.email !== undefined && u.email === cond.email) {
            return u;
          }
        }
      }
      return null;
    },
    findUnique: async (args: { where: { id?: string; phone?: string; email?: string } }): Promise<UserRow | null> => {
      return this.users.find((u) =>
        (args.where.id !== undefined && u.id === args.where.id) ||
        (args.where.phone !== undefined && u.phone === args.where.phone) ||
        (args.where.email !== undefined && u.email === args.where.email),
      ) ?? null;
    },
    findUniqueOrThrow: async (args: { where: { id: string } }): Promise<UserRow> => {
      const u = this.users.find((x) => x.id === args.where.id);
      if (!u) {
        throw new Error('User not found');
      }
      return u;
    },
    create: async (args: { data: Omit<UserRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string } }): Promise<UserRow> => {
      const now = new Date();
      const row: UserRow = {
        id: args.data.id ?? randomUUID(),
        phone: args.data.phone,
        email: args.data.email,
        passwordHash: args.data.passwordHash,
        role: args.data.role,
        status: args.data.status,
        phoneVerified: args.data.phoneVerified ?? false,
        emailVerified: args.data.emailVerified ?? false,
        lastLoginAt: args.data.lastLoginAt ?? null,
        createdAt: now,
        updatedAt: now,
      };
      this.users.push(row);
      return row;
    },
    update: async (args: { where: { id: string }; data: Partial<UserRow> }): Promise<UserRow> => {
      const idx = this.users.findIndex((u) => u.id === args.where.id);
      if (idx < 0) {
        throw new Error('User not found');
      }
      this.users[idx] = { ...this.users[idx], ...args.data, updatedAt: new Date() };
      return this.users[idx];
    },
    count: async (): Promise<number> => this.users.length,
  };

  refreshToken = {
    findUnique: async (args: { where: { tokenHash: string }; include?: { user: boolean } }): Promise<(RefreshRow & { user?: UserRow }) | null> => {
      const r = this.refreshTokens.find((x) => x.tokenHash === args.where.tokenHash);
      if (!r) {
        return null;
      }
      if (args.include?.user) {
        const u = this.users.find((x) => x.id === r.userId);
        if (!u) {
          return null;
        }
        return { ...r, user: u };
      }
      return r;
    },
    create: async (args: { data: Omit<RefreshRow, 'id' | 'createdAt'> }): Promise<RefreshRow> => {
      const row: RefreshRow = {
        id: randomUUID(),
        userId: args.data.userId,
        tokenHash: args.data.tokenHash,
        familyId: args.data.familyId,
        expiresAt: args.data.expiresAt,
        revokedAt: args.data.revokedAt ?? null,
        revokedReason: args.data.revokedReason ?? null,
        userAgent: args.data.userAgent ?? null,
        ipAddress: args.data.ipAddress ?? null,
        createdAt: new Date(),
      };
      this.refreshTokens.push(row);
      return row;
    },
    update: async (args: { where: { id: string }; data: Partial<RefreshRow> }): Promise<RefreshRow> => {
      const idx = this.refreshTokens.findIndex((r) => r.id === args.where.id);
      if (idx < 0) {
        throw new Error('Refresh token not found');
      }
      this.refreshTokens[idx] = { ...this.refreshTokens[idx], ...args.data };
      return this.refreshTokens[idx];
    },
    updateMany: async (args: { where: { familyId?: string; userId?: string; revokedAt: null }; data: Partial<RefreshRow> }): Promise<{ count: number }> => {
      let count = 0;
      this.refreshTokens = this.refreshTokens.map((r) => {
        const familyMatch = args.where.familyId === undefined || r.familyId === args.where.familyId;
        const userMatch = args.where.userId === undefined || r.userId === args.where.userId;
        if (familyMatch && userMatch && r.revokedAt === null) {
          count += 1;
          return { ...r, ...args.data };
        }
        return r;
      });
      return { count };
    },
  };

  passwordResetToken = {
    findUnique: async (
      args: { where: { tokenHash: string }; include?: { user: boolean } },
    ): Promise<(PasswordResetRow & { user?: UserRow }) | null> => {
      const r = this.passwordResetTokens.find((x) => x.tokenHash === args.where.tokenHash);
      if (!r) {
        return null;
      }
      if (args.include?.user) {
        const u = this.users.find((x) => x.id === r.userId);
        if (!u) {
          return null;
        }
        return { ...r, user: u };
      }
      return r;
    },
    create: async (
      args: { data: Omit<PasswordResetRow, 'id' | 'createdAt' | 'usedAt'> & { usedAt?: Date | null } },
    ): Promise<PasswordResetRow> => {
      const row: PasswordResetRow = {
        id: randomUUID(),
        userId: args.data.userId,
        tokenHash: args.data.tokenHash,
        expiresAt: args.data.expiresAt,
        usedAt: args.data.usedAt ?? null,
        createdAt: new Date(),
      };
      this.passwordResetTokens.push(row);
      return row;
    },
    update: async (args: { where: { id: string }; data: Partial<PasswordResetRow> }): Promise<PasswordResetRow> => {
      const idx = this.passwordResetTokens.findIndex((r) => r.id === args.where.id);
      if (idx < 0) {
        throw new Error('Password reset token not found');
      }
      this.passwordResetTokens[idx] = { ...this.passwordResetTokens[idx], ...args.data };
      return this.passwordResetTokens[idx];
    },
    updateMany: async (
      args: { where: { userId?: string; usedAt: null | Date }; data: Partial<PasswordResetRow> },
    ): Promise<{ count: number }> => {
      let count = 0;
      this.passwordResetTokens = this.passwordResetTokens.map((r) => {
        const matchesUserId = args.where.userId === undefined || r.userId === args.where.userId;
        const matchesUsedAt =
          args.where.usedAt === null
            ? r.usedAt === null
            : args.where.usedAt instanceof Date
              ? r.usedAt !== null && r.usedAt.getTime() === args.where.usedAt.getTime()
              : true;
        if (matchesUserId && matchesUsedAt) {
          count += 1;
          return { ...r, ...args.data };
        }
        return r;
      });
      return { count };
    },
  };

  adminUser = {
    findUnique: async (args: { where: { id?: string; email?: string } }): Promise<AdminRow | null> => {
      return this.adminUsers.find((a) =>
        (args.where.id !== undefined && a.id === args.where.id) ||
        (args.where.email !== undefined && a.email === args.where.email),
      ) ?? null;
    },
    findUniqueOrThrow: async (args: { where: { id: string } }): Promise<AdminRow> => {
      const a = this.adminUsers.find((x) => x.id === args.where.id);
      if (!a) {
        throw new Error('Admin not found');
      }
      return a;
    },
    create: async (args: { data: Omit<AdminRow, 'id' | 'createdAt' | 'updatedAt'> }): Promise<AdminRow> => {
      const now = new Date();
      const row: AdminRow = {
        id: randomUUID(),
        email: args.data.email,
        passwordHash: args.data.passwordHash,
        role: args.data.role,
        status: args.data.status,
        lastLoginAt: args.data.lastLoginAt ?? null,
        createdAt: now,
        updatedAt: now,
      };
      this.adminUsers.push(row);
      return row;
    },
    update: async (args: { where: { id: string }; data: Partial<AdminRow> }): Promise<AdminRow> => {
      const idx = this.adminUsers.findIndex((a) => a.id === args.where.id);
      if (idx < 0) {
        throw new Error('Admin not found');
      }
      this.adminUsers[idx] = { ...this.adminUsers[idx], ...args.data, updatedAt: new Date() };
      return this.adminUsers[idx];
    },
  };

  adminRefreshToken = {
    findUnique: async (args: { where: { tokenHash: string }; include?: { admin: boolean } }): Promise<(AdminRefreshRow & { admin?: AdminRow }) | null> => {
      const r = this.adminRefreshTokens.find((x) => x.tokenHash === args.where.tokenHash);
      if (!r) {
        return null;
      }
      if (args.include?.admin) {
        const a = this.adminUsers.find((x) => x.id === r.adminId);
        if (!a) {
          return null;
        }
        return { ...r, admin: a };
      }
      return r;
    },
    create: async (args: { data: Omit<AdminRefreshRow, 'id' | 'createdAt'> }): Promise<AdminRefreshRow> => {
      const row: AdminRefreshRow = {
        id: randomUUID(),
        adminId: args.data.adminId,
        tokenHash: args.data.tokenHash,
        familyId: args.data.familyId,
        expiresAt: args.data.expiresAt,
        revokedAt: args.data.revokedAt ?? null,
        revokedReason: args.data.revokedReason ?? null,
        userAgent: args.data.userAgent ?? null,
        ipAddress: args.data.ipAddress ?? null,
        createdAt: new Date(),
      };
      this.adminRefreshTokens.push(row);
      return row;
    },
    update: async (args: { where: { id: string }; data: Partial<AdminRefreshRow> }): Promise<AdminRefreshRow> => {
      const idx = this.adminRefreshTokens.findIndex((r) => r.id === args.where.id);
      if (idx < 0) {
        throw new Error('Admin refresh token not found');
      }
      this.adminRefreshTokens[idx] = { ...this.adminRefreshTokens[idx], ...args.data };
      return this.adminRefreshTokens[idx];
    },
    updateMany: async (args: { where: { familyId?: string; adminId?: string; revokedAt: null }; data: Partial<AdminRefreshRow> }): Promise<{ count: number }> => {
      let count = 0;
      this.adminRefreshTokens = this.adminRefreshTokens.map((r) => {
        const familyMatch = args.where.familyId === undefined || r.familyId === args.where.familyId;
        const adminMatch = args.where.adminId === undefined || r.adminId === args.where.adminId;
        if (familyMatch && adminMatch && r.revokedAt === null) {
          count += 1;
          return { ...r, ...args.data };
        }
        return r;
      });
      return { count };
    },
  };

  // -------------------------------------------------------------------------
  // Catalog / content models (Task 10E)
  // -------------------------------------------------------------------------

  applianceCategory = {
    findFirst: async (args: { where: { id: string } }): Promise<ApplianceCategoryRow | null> => {
      return this.applianceCategories.find((cat) => cat.id === args.where.id) ?? null;
    },
    findMany: async (args: { where?: { isActive?: boolean }; orderBy?: Array<Record<string, string>>; take?: number }): Promise<ApplianceCategoryRow[]> => {
      let rows = this.applianceCategories.filter(
        (c) => args.where?.isActive === undefined || c.isActive === args.where.isActive,
      );
      rows = [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.nameAr.localeCompare(b.nameAr));
      if (args.take !== undefined) {
        rows = rows.slice(0, args.take);
      }
      return rows;
    },
  };

  fault = {
    count: async (args: { where: FaultWhere }): Promise<number> => {
      return this.matchFaults(args.where).length;
    },
    findMany: async (args: {
      where: FaultWhere;
      orderBy?: Array<Record<string, string>>;
      skip?: number;
      take?: number;
      select?: Record<string, unknown>;
    }): Promise<Array<Record<string, unknown>>> => {
      let rows = this.matchFaults(args.where);
      rows = [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.nameAr.localeCompare(b.nameAr));
      rows = rows.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? rows.length));
      return rows.map((r) => applySelect(r as unknown as Record<string, unknown>, args.select));
    },
    findFirst: async (args: { where: FaultWhere & { id: string }; select?: Record<string, unknown> }): Promise<Record<string, unknown> | null> => {
      const row = this.matchFaults(args.where).find((r) => r.id === args.where.id);
      return row === undefined ? null : applySelect(row as unknown as Record<string, unknown>, args.select);
    },
  };

  technicianServiceArea = {
    findMany: async (args: { where: { technicianId?: string } }): Promise<Array<{ id: string; labelAr: string; latitude: number | null; longitude: number | null }>> =>
      this.areaRows.filter((a) => args.where.technicianId === undefined || a.technicianId === args.where.technicianId),
    findFirst: async (args: { where: { technicianId?: string; labelAr?: string } }): Promise<{ id: string; labelAr: string; latitude: number | null; longitude: number | null } | null> =>
      this.areaRows.find(
        (a) =>
          (args.where.technicianId === undefined || a.technicianId === args.where.technicianId) &&
          (args.where.labelAr === undefined || a.labelAr === args.where.labelAr),
      ) ?? null,
    create: async (args: { data: { technicianId: string; labelAr: string; latitude: number | null; longitude: number | null } }): Promise<{ id: string; labelAr: string }> => {
      const now = new Date();
      const row = { id: randomUUID(), createdAt: now, updatedAt: now, ...args.data };
      this.areaRows.push(row as AreaRow);
      return { id: row.id, labelAr: row.labelAr, latitude: row.latitude, longitude: row.longitude };
    },
    update: async (args: { where: { id: string }; data: { latitude?: number | null; longitude?: number | null } }): Promise<{ id: string }> => {
      const row = this.areaRows.find((a) => a.id === args.where.id);
      if (row === undefined) throw new Error('Area not found');
      row.latitude = args.data.latitude ?? row.latitude;
      row.longitude = args.data.longitude ?? row.longitude;
      row.updatedAt = new Date();
      return { id: row.id, labelAr: row.labelAr, latitude: row.latitude, longitude: row.longitude };
    },
    deleteMany: async (args: { where: { technicianId?: string; labelAr?: string } }): Promise<{ count: number }> => {
      const before = this.areaRows.length;
      this.areaRows = this.areaRows.filter(
        (a) =>
          !(
            (args.where.technicianId === undefined || a.technicianId === args.where.technicianId) &&
            (args.where.labelAr === undefined || a.labelAr === args.where.labelAr)
          ),
      );
      return { count: before - this.areaRows.length };
    },
  };

  technicianService = {
    findFirst: async (args: { where: { technicianId?: string; serviceId?: string } }): Promise<TechnicianServiceRow | null> =>
      this.technicianServices.find(
        (ts) =>
          (args.where.technicianId === undefined || ts.technicianId === args.where.technicianId) &&
          (args.where.serviceId === undefined || ts.serviceId === args.where.serviceId),
      ) ?? null,
    findMany: async (args: { where: { technicianId?: string }, select?: Record<string, unknown> }): Promise<Array<TechnicianServiceRow>> =>
      this.technicianServices.filter((ts) => (args as { where: { technicianId?: string | undefined } }).where.technicianId === undefined || ts.technicianId === (args as { where: { technicianId?: string | undefined } }).where.technicianId),
    create: async (args: { data: { technicianId: string; serviceId: string; priceFrom: number | null; isActive: boolean } }): Promise<TechnicianServiceRow> => {
      const row = { ...args.data } as TechnicianServiceRow;
      this.technicianServices.push(row);
      return row;
    },
    deleteMany: async (args: { where: { technicianId?: string; serviceId?: string } }): Promise<{ count: number }> => {
      const before = this.technicianServices.length;
      this.technicianServices = this.technicianServices.filter(
        (ts) =>
          !(
            (args.where.technicianId === undefined || ts.technicianId === args.where.technicianId) &&
            (args.where.serviceId === undefined || ts.serviceId === args.where.serviceId)
          ),
      );
      return { count: before - this.technicianServices.length };
    },
  };

  service = {
    findFirst: async (args: { where: { id: string } }): Promise<ServiceRow | null> => {
      return this.services.find((s) => s.id === args.where.id) ?? null;
    },
    count: async (args: { where: ServiceWhere }): Promise<number> => this.matchServices(args.where).length,
    findMany: async (args: {
      where: ServiceWhere;
      orderBy?: Array<Record<string, string>>;
      skip?: number;
      take?: number;
      select?: Record<string, unknown>;
    }): Promise<Array<Record<string, unknown>>> => {
      let rows = this.matchServices(args.where);
      rows = [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.nameAr.localeCompare(b.nameAr));
      rows = rows.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? rows.length));
      return rows.map((r) => applySelect(r as unknown as Record<string, unknown>, args.select));
    },
  };

  technicianProfile = {
    create: async (_args: { data: { userId: string } }): Promise<TechnicianProfileRow> => {
      const now = new Date();
      const row: TechnicianProfileRow = { id: randomUUID(), createdAt: now, updatedAt: now };
      this.technicianProfiles.push(row);
      // Lazy-create surface — the caller uses the returned id + defaults
      // (pending verification, unavailable, zeroed counters).
      return { ...row } as unknown as TechnicianProfileRow;
    },
    count: async (args: { where: TechnicianWhere }): Promise<number> => this.matchTechnicians(args.where).length,
    findMany: async (args: {
      where: TechnicianWhere;
      orderBy?: Array<Record<string, unknown>>;
      skip?: number;
      take?: number;
      include?: { services?: { where?: { isActive?: boolean } } };
    }): Promise<TechnicianWithServices[]> => {
      let rows = this.matchTechnicians(args.where);
      rows = [...rows].sort((a, b) => {
        const ra = a.ratingAverage ?? -1;
        const rb = b.ratingAverage ?? -1;
        if (rb !== ra) return rb - ra;
        if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
      rows = rows.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? rows.length));
      return rows.map((r) => this.attachTechnicianServices(r, args.include?.services?.where?.isActive));
    },
    findFirst: async (args: {
      where: TechnicianWhere & { id?: string };
      include?: { services?: { where?: { isActive?: boolean } } };
    }): Promise<TechnicianWithServices | null> => {
      const row = this.matchTechnicians(args.where).find(
        (r) => args.where.id === undefined || r.id === args.where.id,
      );
      return row === undefined ? null : this.attachTechnicianServices(row, args.include?.services?.where?.isActive);
    },
    update: async (args: { where: { id: string }; data: Partial<TechnicianProfileRow> }): Promise<TechnicianProfileRow> => {
      const idx = this.technicianProfiles.findIndex((t) => t.id === args.where.id);
      if (idx < 0) {
        throw new Error('Technician profile not found');
      }
      this.technicianProfiles[idx] = { ...this.technicianProfiles[idx], ...args.data };
      return this.technicianProfiles[idx];
    },
  };

  location = {
    findFirst: async (args: { where: { id: string; userId?: string } }): Promise<LocationRow | null> => {
      return (
        this.locations.find(
          (l) => l.id === args.where.id && (args.where.userId === undefined || l.userId === args.where.userId),
        ) ?? null
      );
    },
    findUnique: async (args: { where: { id: string } }): Promise<LocationRow | null> => {
      return this.locations.find((l) => l.id === args.where.id) ?? null;
    },
  };





  serviceRequest = {
    create: async (args: { data: Omit<ServiceRequestRow, 'createdAt' | 'updatedAt' | 'acceptedAt' | 'startedAt' | 'completedAt' | 'cancelledAt'> & Partial<Pick<ServiceRequestRow, 'acceptedAt' | 'startedAt' | 'completedAt' | 'cancelledAt'>>; select?: Record<string, unknown> }): Promise<ServiceRequestRow> => {
      const now = new Date();
      const row: ServiceRequestRow = {
        id: randomUUID(),
        acceptedAt: null,
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        ...args.data,
        // Real Prisma round-trips nullable columns as null (never undefined).
        problemTitle: args.data.problemTitle ?? null,
        serviceId: args.data.serviceId ?? null,
        faultId: args.data.faultId ?? null,
        scheduledAt: args.data.scheduledAt ?? null,
        createdAt: now,
        updatedAt: now,
      } as ServiceRequestRow;
      this.serviceRequests.push(row);
      return applySelect(row as unknown as Record<string, unknown>, args.select) as unknown as ServiceRequestRow;
    },
    count: async (args: { where: ServiceRequestWhere }): Promise<number> => this.matchServiceRequests(args.where).length,
    findMany: async (args: {
      where: ServiceRequestWhere;
      orderBy?: Array<Record<string, string>>;
      skip?: number;
      take?: number;
      select?: Record<string, unknown>;
    }): Promise<Array<Record<string, unknown>>> => {
      let rows = this.matchServiceRequests(args.where);
      rows = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1));
      rows = rows.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? rows.length));
      return rows.map((r) => applySelect(r as unknown as Record<string, unknown>, args.select));
    },
    findFirst: async (args: { where: ServiceRequestWhere; select?: Record<string, unknown> }): Promise<Record<string, unknown> | null> => {
      const row = this.matchServiceRequests(args.where)[0];
      if (row === undefined) {
        return null;
      }
      const withLocation = { ...row, location: this.locations.find((l) => l.id === row.locationId) };
      return applySelect(withLocation as unknown as Record<string, unknown>, args.select);
    },
    findUnique: async (args: { where: { id: string }; select?: Record<string, unknown> }): Promise<Record<string, unknown> | null> => {
      const row = this.serviceRequests.find((r) => r.id === args.where.id);
      if (row === undefined) {
        return null;
      }
      const withLocation = { ...row, location: this.locations.find((l) => l.id === row.locationId) };
      return applySelect(withLocation as unknown as Record<string, unknown>, args.select);
    },
    updateMany: async (args: {
      where: { id: string; status?: ServiceRequestStatusValue; technicianId?: string; customerId?: string };
      data: Record<string, unknown>;
    }): Promise<{ count: number }> => {
      let count = 0;
      this.serviceRequests = this.serviceRequests.map((r) => {
        if (
          r.id === args.where.id &&
          (args.where.status === undefined || r.status === args.where.status) &&
          (args.where.technicianId === undefined || r.technicianId === args.where.technicianId) &&
          (args.where.customerId === undefined || r.customerId === args.where.customerId)
        ) {
          count += 1;
          return { ...r, ...args.data, updatedAt: new Date() } as ServiceRequestRow;
        }
        return r;
      });
      return { count };
    },
  };

  serviceRequestStatusHistory = {
    create: async (args: { data: Omit<ServiceRequestStatusHistoryRow, 'id' | 'createdAt'> }): Promise<ServiceRequestStatusHistoryRow> => {
      const row: ServiceRequestStatusHistoryRow = { id: randomUUID(), createdAt: new Date(), ...args.data };
      this.serviceRequestStatusHistoryStore.push(row);
      return row;
    },
    findMany: async (args: {
      where: { serviceRequestId: string };
      orderBy?: Record<string, string>;
      take?: number;
      select?: Record<string, unknown>;
    }): Promise<Array<Record<string, unknown>>> => {
      let rows = this.serviceRequestStatusHistoryStore.filter((h) => h.serviceRequestId === args.where.serviceRequestId);
      rows = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      if (args.take !== undefined) {
        rows = rows.slice(0, args.take);
      }
      return rows.map((r) => applySelect(r as unknown as Record<string, unknown>, args.select));
    },
  };

  private matchServiceRequests(where: ServiceRequestWhere): ServiceRequestRow[] {
    return this.serviceRequests.filter((r) => this.serviceRequestMatches(r, where));
  }

  merchantProfile = {
    findFirst: async (args: { where: { id?: string; userId?: string } }): Promise<MerchantProfileRow | null> => {
      return (
        this.merchantProfiles.find(
          (m) =>
            (args.where.id === undefined || m.id === args.where.id) &&
            (args.where.userId === undefined || m.userId === args.where.userId),
        ) ?? null
      );
    },
    create: async (args: { data: Omit<MerchantProfileRow, 'id' | 'createdAt' | 'updatedAt'> }): Promise<MerchantProfileRow> => {
      const now = new Date();
      const row: MerchantProfileRow = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        // Real Prisma applies the schema default (docs/06: pending until admin verifies).
        verificationStatus: args.data.verificationStatus ?? 'pending',
        ...args.data,
      };
      this.merchantProfiles.push(row);
      return row;
    },
    updateMany: async (args: { where: { id?: string; userId?: string }; data: Partial<MerchantProfileRow> }): Promise<{ count: number }> => {
      let count = 0;
      this.merchantProfiles = this.merchantProfiles.map((m) => {
        if (
          (args.where.id === undefined || m.id === args.where.id) &&
          (args.where.userId === undefined || m.userId === args.where.userId)
        ) {
          count += 1;
          return { ...m, ...args.data, updatedAt: new Date() };
        }
        return m;
      });
      return { count };
    },
  };

  product = {
    findFirst: async (args: { where: { id?: string; merchantId?: string; slug?: string }; select?: Record<string, unknown> }): Promise<Record<string, unknown> | null> => {
      const row = this.products.find(
        (p) =>
          (args.where.id === undefined || p.id === args.where.id) &&
          (args.where.merchantId === undefined || p.merchantId === args.where.merchantId) &&
          (args.where.slug === undefined || p.slug === args.where.slug),
      );
      return row === undefined ? null : applySelect(row as unknown as Record<string, unknown>, args.select);
    },
    count: async (args: { where: { merchantId?: string } }): Promise<number> =>
      this.products.filter((p) => args.where.merchantId === undefined || p.merchantId === args.where.merchantId).length,
    findMany: async (args: {
      where: { merchantId?: string };
      orderBy?: Array<Record<string, string>>;
      skip?: number;
      take?: number;
      select?: Record<string, unknown>;
    }): Promise<Array<Record<string, unknown>>> => {
      let rows = this.products.filter(
        (p) => args.where.merchantId === undefined || p.merchantId === args.where.merchantId,
      );
      rows = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1));
      rows = rows.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? rows.length));
      return rows.map((r) => applySelect(r as unknown as Record<string, unknown>, args.select));
    },
    create: async (args: { data: Omit<ProductRow, 'id' | 'createdAt' | 'updatedAt'>; select?: Record<string, unknown> }): Promise<Record<string, unknown>> => {
      const now = new Date();
      const row: ProductRow = { id: randomUUID(), createdAt: now, updatedAt: now, ...args.data };
      this.products.push(row);
      return applySelect(row as unknown as Record<string, unknown>, args.select);
    },
    updateMany: async (args: { where: { id?: string; merchantId?: string }; data: Partial<ProductRow> }): Promise<{ count: number }> => {
      let count = 0;
      this.products = this.products.map((p) => {
        if (
          (args.where.id === undefined || p.id === args.where.id) &&
          (args.where.merchantId === undefined || p.merchantId === args.where.merchantId)
        ) {
          count += 1;
          return { ...p, ...args.data, updatedAt: new Date() };
        }
        return p;
      });
      return { count };
    },
    deleteMany: async (args: { where: { id?: string; merchantId?: string } }): Promise<{ count: number }> => {
      const before = this.products.length;
      this.products = this.products.filter(
        (p) =>
          !(
            (args.where.id === undefined || p.id === args.where.id) &&
            (args.where.merchantId === undefined || p.merchantId === args.where.merchantId)
          ),
      );
      return { count: before - this.products.length };
    },
  };

  conversation = {
    findFirst: async (args: { where: { id?: string; serviceRequestId?: string } }): Promise<ConversationRow | null> => {
      return (
        this.conversations.find(
          (c) =>
            (args.where.id === undefined || c.id === args.where.id) &&
            (args.where.serviceRequestId === undefined || c.serviceRequestId === args.where.serviceRequestId),
        ) ?? null
      );
    },
    findUniqueOrThrow: async (args: { where: { id: string }; select?: Record<string, unknown> }): Promise<Record<string, unknown>> => {
      const row = this.conversations.find((c) => c.id === args.where.id);
      if (row === undefined) {
        throw new Error('Conversation not found');
      }
      return applySelect(row as unknown as Record<string, unknown>, args.select);
    },
    create: async (args: { data: { serviceRequestId: string } }): Promise<ConversationRow> => {
      const now = new Date();
      const row: ConversationRow = { id: randomUUID(), closedAt: null, ...args.data, createdAt: now, updatedAt: now };
      this.conversations.push(row);
      return row;
    },
  };

  conversationParticipant = {
    create: async (args: { data: Omit<ConversationParticipantRow, 'id' | 'joinedAt'> }): Promise<ConversationParticipantRow> => {
      const row: ConversationParticipantRow = { id: randomUUID(), joinedAt: new Date(), ...args.data };
      this.conversationParticipants.push(row);
      return row;
    },
  };

  message = {
    count: async (args: { where: { conversationId: string } }): Promise<number> =>
      this.messageRows.filter((m) => m.conversationId === args.where.conversationId).length,
    findMany: async (args: {
      where: { conversationId: string };
      orderBy?: Array<Record<string, string>>;
      skip?: number;
      take?: number;
      select?: Record<string, unknown>;
    }): Promise<Array<Record<string, unknown>>> => {
      let rows = this.messageRows.filter((m) => m.conversationId === args.where.conversationId);
      rows = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1));
      rows = rows.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? rows.length));
      return rows.map((r) => applySelect(r as unknown as Record<string, unknown>, args.select));
    },
    create: async (args: { data: Omit<MessageRow, 'id' | 'createdAt' | 'readAt'> & { readAt?: Date | null }; select?: Record<string, unknown> }): Promise<Record<string, unknown>> => {
      const row: MessageRow = { id: randomUUID(), readAt: null, createdAt: new Date(), ...args.data };
      this.messageRows.push(row);
      return applySelect(row as unknown as Record<string, unknown>, args.select);
    },
  };

  review = {
    findFirst: async (args: { where: { serviceRequestId?: string; id?: string }; select?: Record<string, unknown> }): Promise<Record<string, unknown> | null> => {
      const row = this.reviewRows.find(
        (r) =>
          (args.where.serviceRequestId === undefined || r.serviceRequestId === args.where.serviceRequestId) &&
          (args.where.id === undefined || r.id === args.where.id),
      );
      return row === undefined ? null : applySelect(this.attachReviewTags(row), args.select);
    },
    findFirstOrThrow: async (args: { where: { id: string }; select?: Record<string, unknown> }): Promise<Record<string, unknown>> => {
      const row = this.reviewRows.find((r) => r.id === args.where.id);
      if (row === undefined) {
        throw new Error('Review not found');
      }
      return applySelect(this.attachReviewTags(row), args.select);
    },
    findMany: async (args: {
      where: { technicianId?: string };
      orderBy?: Array<Record<string, string>>;
      skip?: number;
      take?: number;
      select?: Record<string, unknown>;
    }): Promise<Array<Record<string, unknown>>> => {
      let rows = this.reviewRows.filter(
        (r) => args.where.technicianId === undefined || r.technicianId === args.where.technicianId,
      );
      rows = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1));
      rows = rows.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? rows.length));
      return rows.map((r) => applySelect(this.attachReviewTags(r), args.select));
    },
    count: async (args: { where: { technicianId?: string } }): Promise<number> =>
      this.reviewRows.filter(
        (r) => args.where.technicianId === undefined || r.technicianId === args.where.technicianId,
      ).length,
    create: async (args: { data: Omit<ReviewRow, 'id' | 'createdAt' | 'updatedAt' | 'problemResolved'> }): Promise<{ id: string }> => {
      const now = new Date();
      const row: ReviewRow = { id: randomUUID(), problemResolved: null, createdAt: now, updatedAt: now, ...args.data };
      this.reviewRows.push(row);
      return { id: row.id };
    },
    aggregate: async (args: {
      where: { technicianId?: string };
      _avg?: { rating?: boolean };
      _count?: boolean | { _all?: boolean };
    }): Promise<{ _avg: { rating: number | null }; _count: number }> => {
      const rows = this.reviewRows.filter(
        (r) => args.where.technicianId === undefined || r.technicianId === args.where.technicianId,
      );
      const avg = rows.length === 0 ? null : rows.reduce((s, r) => s + r.rating, 0) / rows.length;
      return { _avg: { rating: args._avg?.rating === true ? avg : null }, _count: rows.length };
    },
  };

  private attachReviewTags(row: ReviewRow): Record<string, unknown> {
    const tagIds = this.reviewTagAssignmentRows.filter((a) => a.reviewId === row.id).map((a) => a.tagId);
    return {
      ...row,
      tagAssignments: tagIds.flatMap((tagId) => {
        const tag = this.reviewTagRows.find((t) => t.id === tagId);
        return tag === undefined ? [] : [{ tag: { labelAr: tag.labelAr } }];
      }),
    };
  }

  reviewTag = {
    findMany: async (args: { where: { id: { in: string[] } }; select?: Record<string, unknown> }): Promise<Array<Record<string, unknown>>> => {
      const ids = args.where.id.in;
      return this.reviewTagRows.filter((t) => ids.includes(t.id)).map((t) => applySelect(t as unknown as Record<string, unknown>, args.select));
    },
  };

  reviewTagAssignment = {
    create: async (args: { data: { reviewId: string; tagId: string } }): Promise<{ reviewId: string; tagId: string }> => {
      this.reviewTagAssignmentRows.push(args.data);
      return args.data;
    },
  };

  notification = {
    count: async (args: { where: { userId?: string } }): Promise<number> =>
      this.notificationRows.filter((n) => args.where.userId === undefined || n.userId === args.where.userId).length,
    findMany: async (args: {
      where: { userId?: string };
      orderBy?: Array<Record<string, string>>;
      skip?: number;
      take?: number;
      select?: Record<string, unknown>;
    }): Promise<Array<Record<string, unknown>>> => {
      let rows = this.notificationRows.filter(
        (n) => args.where.userId === undefined || n.userId === args.where.userId,
      );
      rows = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1));
      rows = rows.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? rows.length));
      return rows.map((r) => applySelect(r as unknown as Record<string, unknown>, args.select));
    },
    findFirst: async (args: { where: { id?: string; userId?: string }; select?: Record<string, unknown> }): Promise<Record<string, unknown> | null> => {
      const row = this.notificationRows.find(
        (n) =>
          (args.where.id === undefined || n.id === args.where.id) &&
          (args.where.userId === undefined || n.userId === args.where.userId),
      );
      return row === undefined ? null : applySelect(row as unknown as Record<string, unknown>, args.select);
    },
    updateMany: async (args: { where: { id?: string; userId?: string; readAt?: null }; data: { readAt?: Date | null } }): Promise<{ count: number }> => {
      let count = 0;
      this.notificationRows = this.notificationRows.map((n) => {
        if (
          (args.where.id === undefined || n.id === args.where.id) &&
          (args.where.userId === undefined || n.userId === args.where.userId) &&
          (args.where.readAt === undefined || n.readAt === null)
        ) {
          count += 1;
          return { ...n, ...args.data };
        }
        return n;
      });
      return { count };
    },
    create: async (args: { data: { userId: string; type: string; titleAr: string; bodyAr: string; dataJson?: unknown } }): Promise<{ id: string }> => {
      const row: NotificationRow = {
        id: randomUUID(),
        userId: args.data.userId,
        type: args.data.type,
        titleAr: args.data.titleAr,
        bodyAr: args.data.bodyAr,
        dataJson: (args.data.dataJson as Record<string, unknown> | undefined) ?? null,
        readAt: null,
        createdAt: new Date(),
      };
      this.notificationRows.push(row);
      return { id: row.id };
    },
  };

  subscriptionPlan = {
    count: async (args: { where: { role?: string; isActive?: boolean } }): Promise<number> =>
      this.subscriptionPlans.filter(
        (p) =>
          (args.where.role === undefined || p.role === args.where.role) &&
          (args.where.isActive === undefined || p.isActive === args.where.isActive),
      ).length,
    findMany: async (args: {
      where: { role?: string; isActive?: boolean };
      orderBy?: Array<Record<string, string>>;
      skip?: number;
      take?: number;
      select?: Record<string, unknown>;
    }): Promise<Array<Record<string, unknown>>> => {
      let rows = this.subscriptionPlans.filter(
        (p) =>
          (args.where.role === undefined || p.role === args.where.role) &&
          (args.where.isActive === undefined || p.isActive === args.where.isActive),
      );
      rows = [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
      rows = rows.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? rows.length));
      return rows.map((r) => applySelect(r as unknown as Record<string, unknown>, args.select));
    },
    findFirst: async (args: { where: { id?: string } }): Promise<Record<string, unknown> | null> => {
      return this.subscriptionPlans.find((p) => p.id === args.where.id) ?? null;
    },
  };

  subscription = {
    findFirst: async (args: {
      where: {
        id?: string;
        userId?: string;
        status?: string | { in: string[]; not?: string };
        currentPeriodEnd?: { gt?: Date };
        plan?: { isActive?: boolean; role?: string };
      };
      orderBy?: Array<Record<string, string>>;
      select?: Record<string, unknown>;
    }): Promise<Record<string, unknown> | null> => {
      const planFilter = args.where.plan;
      const sorted = [...this.matchSubscriptions(args.where)].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      const row = sorted[0];
      if (row === undefined) {
        return null;
      }
      // Attach the plan relation (getCurrent selects plan fields).
      const planRow = this.subscriptionPlans.find((p) => p.id === row.planId);
      if (planRow === undefined) {
        return null;
      }
      const planSelect = (planFilter as { select?: Record<string, unknown> } | undefined)?.select;
      const withPlan = {
        ...row,
        plan: applySelect(planRow as unknown as Record<string, unknown>, planSelect),
      };
      return applySelect(withPlan as unknown as Record<string, unknown>, args.select);
    },
    create: async (args: {
      data: Omit<
        SubscriptionRow,
        'id' | 'createdAt' | 'updatedAt' | 'cancelledAt' | 'providerReference'
      > & { providerReference?: string | null };
      select?: Record<string, unknown>;
    }): Promise<{ id: string }> => {
      const now = new Date();
      const row: SubscriptionRow = {
        id: randomUUID(),
        cancelledAt: null,
        providerReference: null,
        ...args.data,
        createdAt: now,
        updatedAt: now,
      } as SubscriptionRow;
      this.subscriptions.push(row);
      return { id: row.id };
    },
    updateMany: async (args: {
      where: { id?: string; userId?: string; status?: string };
      data: Record<string, unknown>;
    }): Promise<{ count: number }> => {
      let count = 0;
      this.subscriptions = this.subscriptions.map((s) => {
        if (
          (args.where.id === undefined || s.id === args.where.id) &&
          (args.where.userId === undefined || s.userId === args.where.userId) &&
          (args.where.status === undefined || s.status === args.where.status)
        ) {
          count += 1;
          return { ...s, ...args.data, updatedAt: new Date() } as SubscriptionRow;
        }
        return s;
      });
      return { count };
    },
  };

  private matchSubscriptions(
    where: {
      id?: string;
      userId?: string;
      status?: string | { in: string[]; not?: string };
      currentPeriodEnd?: { gt?: Date };
      plan?: { isActive?: boolean; role?: string };
    },
  ): SubscriptionRow[] {
    return this.subscriptions.filter((s) => {
      if (where.id !== undefined && s.id !== where.id) return false;
      if (where.userId !== undefined && s.userId !== where.userId) return false;
      if (where.status !== undefined) {
        if (typeof where.status === 'string') {
          if (s.status !== where.status) return false;
        } else {
          if (where.status.in !== undefined && !where.status.in.includes(s.status)) return false;
          if (where.status.not !== undefined && s.status === where.status.not) return false;
        }
      }
      if (where.currentPeriodEnd?.gt !== undefined && s.currentPeriodEnd <= where.currentPeriodEnd.gt) {
        return false;
      }
      if (where.plan !== undefined) {
        const plan = this.subscriptionPlans.find((p) => p.id === s.planId);
        if (plan === undefined) return false;
        if (where.plan.isActive !== undefined && plan.isActive !== where.plan.isActive) return false;
        if (where.plan.role !== undefined && plan.role !== where.plan.role) return false;
      }
      return true;
    });
  }

  paymentMethodConfig = {
    findFirst: async (args: { where: { method?: PaymentMethodValue; isEnabled?: boolean } }): Promise<PaymentMethodConfigRow | null> => {
      return (
        this.paymentMethodConfigs.find(
          (c) =>
            (args.where.method === undefined || c.method === args.where.method) &&
            (args.where.isEnabled === undefined || c.isEnabled === args.where.isEnabled),
        ) ?? null
      );
    },
    findMany: async (args: { where?: { isEnabled?: boolean }; orderBy?: Array<Record<string, string>> }): Promise<Array<Record<string, unknown>>> => {
      let rows = this.paymentMethodConfigs.filter(
        (c) => args.where?.isEnabled === undefined || c.isEnabled === args.where.isEnabled,
      );
      rows = [...rows].sort((a, b) => a.method.localeCompare(b.method));
      return rows.map((r) => r as unknown as Record<string, unknown>);
    },
    create: async (args: { data: Omit<PaymentMethodConfigRow, 'id' | 'createdAt' | 'updatedAt'> }): Promise<PaymentMethodConfigRow> => {
      const now = new Date();
      const row: PaymentMethodConfigRow = { id: randomUUID(), createdAt: now, updatedAt: now, ...args.data };
      this.paymentMethodConfigs.push(row);
      return row;
    },
    update: async (args: { where: { id: string }; data: Partial<PaymentMethodConfigRow> }): Promise<PaymentMethodConfigRow> => {
      const idx = this.paymentMethodConfigs.findIndex((c) => c.id === args.where.id);
      this.paymentMethodConfigs[idx] = { ...this.paymentMethodConfigs[idx], ...args.data, updatedAt: new Date() };
      return this.paymentMethodConfigs[idx];
    },
  };

  paymentSubmission = {
    count: async (args: { where: { userId?: string; status?: PaymentSubmissionStatusValue } }): Promise<number> =>
      this.paymentSubmissionRows.filter(
        (s) =>
          (args.where.userId === undefined || s.userId === args.where.userId) &&
          (args.where.status === undefined || s.status === args.where.status),
      ).length,
    findMany: async (args: {
      where: { userId?: string; status?: PaymentSubmissionStatusValue };
      orderBy?: Array<Record<string, string>>;
      skip?: number;
      take?: number;
      select?: Record<string, unknown>;
    }): Promise<Array<Record<string, unknown>>> => {
      let rows = this.paymentSubmissionRows.filter(
        (s) =>
          (args.where.userId === undefined || s.userId === args.where.userId) &&
          (args.where.status === undefined || s.status === args.where.status),
      );
      rows = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : 1));
      rows = rows.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? rows.length));
      return rows.map((r) => applySelect(r as unknown as Record<string, unknown>, args.select));
    },
    findFirst: async (args: {
      where: { id?: string; userId?: string; status?: PaymentSubmissionStatusValue; planId?: string };
      select?: Record<string, unknown>;
    }): Promise<Record<string, unknown> | null> => {
      const row = this.paymentSubmissionRows.find(
        (s) =>
          (args.where.id === undefined || s.id === args.where.id) &&
          (args.where.userId === undefined || s.userId === args.where.userId) &&
          (args.where.planId === undefined || s.planId === args.where.planId) &&
          (args.where.status === undefined || s.status === args.where.status),
      );
      if (row === undefined) {
        return null;
      }
      // Attach plan/user relations (services read submission.plan.isActive).
      const plan = this.subscriptionPlans.find((p) => p.id === row.planId);
      const user = this.users.find((u) => u.id === row.userId);
      const withRelations = {
        ...row,
        ...(plan !== undefined ? { plan: applySelect(plan as unknown as Record<string, unknown>, (args.select as { plan?: { select?: Record<string, unknown> } } | undefined)?.plan?.select) } : {}),
        ...(user !== undefined ? { user: { role: user.role } } : {}),
      };
      return applySelect(withRelations as unknown as Record<string, unknown>, args.select);
    },
    create: async (args: {
      data: Omit<
        PaymentSubmissionRow,
        'id' | 'createdAt' | 'updatedAt' | 'subscriptionId' | 'reviewedByAdminId' | 'reviewedAt'
      >;
      select?: Record<string, unknown>;
    }): Promise<Record<string, unknown>> => {
      const now = new Date();
      const row: PaymentSubmissionRow = {
        id: randomUUID(),
        subscriptionId: null,
        reviewedByAdminId: null,
        reviewedAt: null,
        ...args.data,
        // Real Prisma round-trips nullable columns as null (never undefined).
        proofStorageKey: args.data.proofStorageKey ?? null,
        createdAt: now,
        updatedAt: now,
      } as PaymentSubmissionRow;
      this.paymentSubmissionRows.push(row);
      return applySelect(row as unknown as Record<string, unknown>, args.select);
    },
    updateMany: async (args: {
      where: { id?: string; status?: PaymentSubmissionStatusValue };
      data: Record<string, unknown>;
    }): Promise<{ count: number }> => {
      let count = 0;
      this.paymentSubmissionRows = this.paymentSubmissionRows.map((s) => {
        if (
          (args.where.id === undefined || s.id === args.where.id) &&
          (args.where.status === undefined || s.status === args.where.status)
        ) {
          count += 1;
          return { ...s, ...args.data, updatedAt: new Date() } as PaymentSubmissionRow;
        }
        return s;
      });
      return { count };
    },
    update: async (args: { where: { id: string }; data: Record<string, unknown> }): Promise<PaymentSubmissionRow> => {
      const idx = this.paymentSubmissionRows.findIndex((s) => s.id === args.where.id);
      this.paymentSubmissionRows[idx] = {
        ...this.paymentSubmissionRows[idx],
        ...args.data,
        updatedAt: new Date(),
      } as PaymentSubmissionRow;
      return this.paymentSubmissionRows[idx];
    },
  };

  entitlement = {
    findFirst: async (args: { where: { id?: string } }): Promise<{ id: string; code: string; isActive: boolean } | null> => {
      return this.entitlements.find((e) => e.id === args.where.id) ?? null;
    },
  };

  entitlementGrant = {
    findMany: async (args: {
      where: { userId?: string; entitlement?: { isActive?: boolean } };
      select?: Record<string, unknown>;
    }): Promise<Array<{ entitlement: { code: string } }>> => {
      return this.entitlementGrantRows
        .filter((g) => {
          if (args.where.userId !== undefined && g.userId !== args.where.userId) return false;
          if (args.where.entitlement?.isActive === true) {
            const ent = this.entitlements.find((e) => e.id === g.entitlementId);
            if (ent === undefined || !ent.isActive) return false;
          }
          return true;
        })
        .map((g) => {
          const ent = this.entitlements.find((e) => e.id === g.entitlementId);
          return { entitlement: { code: ent?.code ?? '' } };
        });
    },
    findFirst: async (args: { where: { userId?: string; entitlementId?: string } }): Promise<{ id: string } | null> => {
      return (
        this.entitlementGrantRows.find(
          (g) =>
            (args.where.userId === undefined || g.userId === args.where.userId) &&
            (args.where.entitlementId === undefined || g.entitlementId === args.where.entitlementId),
        ) ?? null
      );
    },
    create: async (args: { data: Omit<EntitlementGrantRow, 'id' | 'createdAt'> }): Promise<{ id: string }> => {
      const row: EntitlementGrantRow = { id: randomUUID(), createdAt: new Date(), ...args.data };
      this.entitlementGrantRows.push(row);
      return { id: row.id };
    },
  };

  auditLog = {
    create: async (args: { data: Omit<AuditLogRow, 'id' | 'createdAt'> }): Promise<{ id: string }> => {
      const row: AuditLogRow = { id: randomUUID(), createdAt: new Date(), ...args.data };
      this.auditLogRows.push(row);
      return { id: row.id };
    },
  };


  private serviceRequestMatches(
    row: ServiceRequestRow,
    where: ServiceRequestWhere,
  ): boolean {
    if (where.id !== undefined && row.id !== where.id) return false;
    if (where.customerId !== undefined && row.customerId !== where.customerId) return false;
    if (where.technicianId !== undefined && row.technicianId !== where.technicianId) return false;
    if (where.status !== undefined) {
      if (typeof where.status === 'string') {
        if (row.status !== where.status) return false;
      } else if (where.status.not !== undefined && row.status === where.status.not) {
        return false;
      }
    }
    if (where.OR !== undefined && !where.OR.some((branch) => this.serviceRequestMatches(row, branch))) {
      return false;
    }
    return true;
  }

  private matchFaults(where: FaultWhere): FaultRow[] {
    return this.faults.filter((f) => {
      if (where.publishStatus !== undefined && f.publishStatus !== where.publishStatus) return false;
      if (where.applianceCategoryId !== undefined && f.applianceCategoryId !== where.applianceCategoryId) return false;
      return includesTextFilter(f as unknown as Record<string, unknown>, where.OR);
    });
  }

  private matchServices(where: ServiceWhere): ServiceRow[] {
    return this.services.filter((s) => {
      if (where.isActive !== undefined && s.isActive !== where.isActive) return false;
      if (where.applianceCategoryId !== undefined && s.applianceCategoryId !== where.applianceCategoryId) return false;
      return includesTextFilter(s as unknown as Record<string, unknown>, where.OR);
    });
  }

  private technicianServiceMatches(
    ts: TechnicianServiceRow,
    filters: Array<Record<string, unknown>>,
  ): boolean {
    return filters.every((filter) => {
      if ('isActive' in filter && ts.isActive !== filter['isActive']) return false;
      if ('serviceId' in filter && ts.serviceId !== filter['serviceId']) return false;
      const service = filter['service'] as
        | { applianceCategoryId?: string; faultLinks?: { some: { faultId: string } } }
        | undefined;
      if (service !== undefined) {
        const row = this.services.find((s) => s.id === ts.serviceId);
        if (row === undefined) return false;
        if (service.applianceCategoryId !== undefined && row.applianceCategoryId !== service.applianceCategoryId) {
          return false;
        }
        if (service.faultLinks !== undefined) {
          // fault -> fault_service_links -> service: a link exists between
          // the fault and the service this technician offers.
          const linked = this.faultServiceLinks.some(
            (l) => l.serviceId === ts.serviceId && l.faultId === service.faultLinks.some.faultId,
          );
          if (!linked) return false;
        }
      }
      return true;
    });
  }

  private matchTechnicians(where: TechnicianWhere): TechnicianProfileRow[] {
    return this.technicianProfiles.filter((t) => {
      if (where.id !== undefined && t.id !== where.id) return false;
      if (where.userId !== undefined && t.userId !== where.userId) return false;
      if (where.verificationStatus !== undefined && t.verificationStatus !== where.verificationStatus) {
        return false;
      }
      if (where.availabilityStatus !== undefined && t.availabilityStatus !== where.availabilityStatus) {
        return false;
      }
      if (where.ratingAverage?.gte !== undefined) {
        const gte = where.ratingAverage.gte;
        if (t.ratingAverage === null || t.ratingAverage < gte) return false;
      }
      if (!includesTextFilter(t as unknown as Record<string, unknown>, where.OR)) return false;
      if (where.services !== undefined) {
        const own = this.technicianServices.filter((ts) => ts.technicianId === t.id);
        if (!own.some((ts) => this.technicianServiceMatches(ts, where.services.some.AND))) return false;
      }
      return true;
    });
  }

  private attachTechnicianServices(
    row: TechnicianProfileRow,
    activeOnly: boolean | undefined,
  ): TechnicianWithServices {
    const links = this.technicianServices.filter(
      (ts) => ts.technicianId === row.id && (activeOnly === undefined || ts.isActive === activeOnly),
    );
    return {
      ...row,
      services: links.flatMap((ts) => {
        const service = this.services.find((s) => s.id === ts.serviceId);
        return service === undefined
          ? []
          : [
              {
                service: {
                  id: service.id,
                  applianceCategoryId: service.applianceCategoryId,
                  nameAr: service.nameAr,
                  slug: service.slug,
                  descriptionAr: service.descriptionAr,
                },
              },
            ];
      }),
    };
  }
}

interface FaultServiceLinkRow {
  faultId: string;
  serviceId: string;
}

interface FaultWhere {
  publishStatus?: PublishStatus;
  applianceCategoryId?: string;
  id?: string;
  OR?: Array<Record<string, { contains?: string; mode?: string }>>;
}

interface ServiceWhere {
  isActive?: boolean;
  applianceCategoryId?: string;
  OR?: Array<Record<string, { contains?: string; mode?: string }>>;
}

interface TechnicianWhere {
  id?: string;
  userId?: string;
  verificationStatus?: VerificationStatusValue;
  availabilityStatus?: AvailabilityStatusValue;
  ratingAverage?: { gte?: number };
  OR?: Array<Record<string, { contains?: string; mode?: string }>>;
  services?: { some: { AND: Array<Record<string, unknown>> } };
}

interface ServiceShape {
  id: string;
  applianceCategoryId: string;
  nameAr: string;
  slug: string;
  descriptionAr: string | null;
}

export interface TechnicianWithServices extends TechnicianProfileRow {
  services: Array<{ service: ServiceShape }>;
}

export function createFakePrisma(): FakePrismaClient {
  return new FakePrismaClient();
}

export type { FakePrismaClient };
