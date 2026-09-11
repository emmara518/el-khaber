/**
 * Chat + Reviews + Notifications modules (Task 10H).
 */

import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  // AuthModule provides JwtModule for the controller's JwtAuthGuard.
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
