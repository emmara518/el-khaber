import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';

/**
 * Al-Khabir — TesterArmy e2e config (web only).
 *
 * Targets the UAT web app (development review). Override with APP_URL for a
 * local run. No `agents` block on purpose: every test here is deterministic
 * (locators + assertions), so no model/provider credential is required.
 */
const APP_URL = process.env.APP_URL ?? 'https://el-khabir-uat.vercel.app';

export default {
  targets: [{ name: 'web', engine: web(), app: { url: APP_URL } }],
} satisfies E2EConfig;
