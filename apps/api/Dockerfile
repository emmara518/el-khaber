# Al-Khabir API — production container (Task 11E).
#
# Build context is the MONOREPO ROOT:
#   docker build -f apps/api/Dockerfile -t khabir-api .
#
# The image embeds the compiled NestJS app and the generated Prisma client.
# Runtime secrets (DATABASE_URL, JWT secrets, ...) are provided by the
# platform at deploy time and are NEVER baked into the image.

FROM node:20-bookworm AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# Install with the full workspace manifest so the lockfile is respected.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/landing/package.json apps/landing/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-validation/package.json packages/shared-validation/package.json
COPY packages/ui-tokens/package.json packages/ui-tokens/package.json
RUN pnpm install --frozen-lockfile

# Build the workspace libraries the API depends on, generate Prisma, build API.
COPY . .
RUN pnpm --filter @khabir/shared-types build \
 && pnpm --filter @khabir/shared-validation build \
 && pnpm --filter @khabir/api exec prisma generate \
 && pnpm --filter @khabir/api build

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# Copy the fully-installed workspace (includes the generated Prisma client).
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json

EXPOSE 3000
# Liveness/readiness are HTTP probes: GET /api/v1/health, GET /api/v1/ready.
# /health is process-only (no DB dependency), so the container healthcheck
# stays green while the database is briefly unreachable; /ready reports
# dependency state to the orchestrator.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "const p=process.env.PORT||3000;const g=process.env.API_GLOBAL_PREFIX||'api/v1';fetch(`http://127.0.0.1:${p}/${g}/health`).then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/main.js"]
