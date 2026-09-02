import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { AdminAuthController, AdminMeController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminAuthController, AdminMeController],
  providers: [AdminAuthService],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}
