/**
 * Current-user controller. Returns the authenticated user's safe profile.
 * The user ID is taken from the verified JWT in `request.user` — never
 * from the request body or query — per docs/10_ENGINEERING_RULES.md §15.
 *
 * The returned record is the public `AuthUserDto`: no password hash, no
 * refresh tokens, no internal fields.
 */

import { Controller, Get, UseGuards } from '@nestjs/common';

import { type AuthService } from '../auth/auth.service';
import { CurrentUser, type RequestUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

import type { ApiSuccess, MeDto } from '@khabir/shared-types';


@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  async me(@CurrentUser() current: RequestUser): Promise<ApiSuccess<MeDto>> {
    const user = await this.auth.findUserById(current.id);
    return { data: user };
  }
}
