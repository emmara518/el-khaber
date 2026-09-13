/**
 * Shared API contract package.
 *
 * Runtime constants live in `./envelope`; all contract TYPES are
 * generated from `docs/api/openapi.yaml` (ADR-0003) via
 * `scripts/gen-types.ts` and re-exported from `./generated/api-contract`.
 * Never hand-edit the generated file.
 *
 * NOTE: keep line comments on their own lines — a collapsed single-line
 * format would comment out the entire export list after the first `//`.
 */

export { ROLE, USER_STATUS, ERROR_CODE, buildPageMeta } from './envelope';

export type {
  Role,
  UserStatus,
  ErrorCode,
  ApiMeta,
  ApiSuccess,
  ApiError,
  ApiResponse,
  AuthUserDto,
  AuthSessionDto,
  MeDto,
  ApplianceCategoryDto,
  FaultSummaryDto,
  FaultDto,
  ServiceDto,
  TechnicianServiceDto,
  TechnicianPublicDto,
  ServiceRequestStatus,
  CreateServiceRequestDto,
  ServiceRequestSummaryDto,
  ServiceRequestStatusHistoryDto,
  ServiceRequestDto,
  MerchantProfileDto,
  UpdateMerchantProfileDto,
  MerchantProductDto,
  CreateMerchantProductDto,
  UpdateMerchantProductDto,
  ConversationDto,
  MessageDto,
  ReviewSummaryDto,
  NotificationDto,
  SubscriptionPlanDto,
  PaymentSubmissionDto,
  PaymentMethodConfigDto,
  CurrentSubscriptionDto,
  MeSubscriptionDto,
  MeEntitlementsDto,
  PaymentReviewResultDto,
  AdminGrantResultDto,
  AdminNotificationResultDto,
  TechnicianSelfProfileDto,
  TechnicianSelfServiceDto,
  TechnicianSelfAreaDto,
  TechnicianStatsDto,
  UpdateTechnicianProfileDto,
  CreateTechnicianServiceDto,
  TechnicianSelfService,
} from './generated/api-contract';
