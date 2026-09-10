/**
 * Shared API contract package.
 *
 * Runtime constants live in `./envelope`; all contract TYPES are
 * generated from `docs/api/openapi.yaml` (ADR-0003) via
 * `scripts/gen-types.ts` and re-exported from `./generated/api-contract`.
 * Never hand-edit the generated file.
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
  // Catalog / content domain (Task 10E)
  ApplianceCategoryDto,
  FaultSummaryDto,
  FaultDto,
  ServiceDto,
  TechnicianServiceDto,
  TechnicianPublicDto,
  // Service request lifecycle (Task 10F)
  ServiceRequestStatus,
  CreateServiceRequestDto,
  ServiceRequestSummaryDto,
  ServiceRequestStatusHistoryDto,
  ServiceRequestDto,
} from './generated/api-contract';
