/**
 * DEV-ONLY local avatar file server (WP-01).
 *
 * Serves `GET /avatars-file/*` from the local avatar directory so
 * development/test clients can actually download the public URLs the
 * local adapter issues. This controller REFUSES every request unless
 * the avatar provider is `local` AND the runtime is not production:
 * production avatars are served by the S3 bucket/CDN, never by Node.
 *
 * Security: keys pass the same traversal guard as the adapter, and
 * only `avatars/…` keys with an allowlisted extension are servable.
 */

import { promises as fs } from 'node:fs';

import { Controller, Get, HttpCode, NotFoundException, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators';
import { readAvatarStorageConfig } from '../storage/avatar.config';
import { LocalAvatarStorageAdapter } from '../storage/local-avatar.adapter';

import type { Request, Response } from 'express';

const CONTENT_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

@ApiTags('avatars-file')
@Controller()
export class AvatarFileController {
  constructor(private readonly local: LocalAvatarStorageAdapter) {}

  @Get('avatars-file/*')
  @Public()
  @HttpCode(200)
  async serveFile(@Req() req: Request, @Res() res: Response): Promise<void> {
    const config = readAvatarStorageConfig();
    const nodeEnv = (process.env['NODE_ENV'] ?? 'development').toLowerCase();
    if (config.provider !== 'local' || nodeEnv === 'production') {
      throw new NotFoundException('Not found');
    }
    const raw = (req.params as Record<string, string>)['0'] ?? '';
    const key = raw.replace(/^\/+/, '');
    let path: string;
    try {
      path = this.local.resolveAbsolutePath(key);
    } catch {
      throw new NotFoundException('Not found');
    }
    const ext = key.split('.').pop()?.toLowerCase() ?? '';
    const contentType = CONTENT_BY_EXT[ext];
    if (contentType === undefined || !key.startsWith('avatars/')) {
      throw new NotFoundException('Not found');
    }
    let bytes: Buffer;
    try {
      bytes = await fs.readFile(path);
    } catch {
      throw new NotFoundException('Not found');
    }
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(bytes);
  }
}
