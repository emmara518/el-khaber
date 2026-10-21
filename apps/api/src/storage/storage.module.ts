/**
 * Proof storage module (PHASE 20).
 *
 * Registers the StoragePort provider selected by PROOF_STORAGE_PROVIDER
 * (s3 | local, default local). The selection is lazy and fail-closed:
 * missing S3 credentials surface on first proof-storage USE, never at
 * boot, so the API starts and all unrelated routes work without them.
 */

import { Global, Module, type Type } from '@nestjs/common';

import { LocalProofStorageAdapter } from './local-proof-storage.adapter';
import { readProofStorageConfig } from './proof.config';
import { S3ProofStorageAdapter } from './s3-proof-storage.adapter';
import { STORAGE_PORT } from './storage.port';

function buildStorageProvider(): { provide: string; useClass: Type<unknown> } {
  const { provider } = readProofStorageConfig();
  return {
    provide: STORAGE_PORT,
    useClass: provider === 's3' ? S3ProofStorageAdapter : LocalProofStorageAdapter,
  };
}

@Global()
@Module({
  providers: [buildStorageProvider(), S3ProofStorageAdapter, LocalProofStorageAdapter],
  exports: [STORAGE_PORT],
})
export class StorageModule {}
