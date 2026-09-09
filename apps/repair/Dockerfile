# SD Solutions Repair Ops — production image
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Placeholder so Next build never crashes if a page still touches getDb() during analysis.
# Real DATABASE_URL comes from Fly secrets at runtime / release_command.
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV BETTER_AUTH_SECRET=build-time-placeholder-secret-not-used
ENV BETTER_AUTH_URL=http://localhost:3001
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
ENV CI=true
# Used by release migrate script (standalone Next image does not ship these packages).
ENV NODE_PATH=/app/migrate-node/node_modules

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# SQL migrations + release migrate script
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
RUN mkdir -p /app/scripts
COPY --from=builder --chown=nextjs:nodejs /app/scripts/fly-db-migrate.cjs ./scripts/fly-db-migrate.cjs

# Minimal deps for release_command migrate (not part of Next standalone)
WORKDIR /app/migrate-node
RUN npm init -y >/dev/null 2>&1 \
  && npm install --omit=dev --no-fund --no-audit drizzle-orm@0.45.2 postgres@3.4.9 \
  && chown -R nextjs:nodejs /app/migrate-node

WORKDIR /app
RUN mkdir -p /app/public/uploads \
  && chown -R nextjs:nodejs /app/public/uploads /app/drizzle /app/scripts \
  && test -f /app/scripts/fly-db-migrate.cjs

USER nextjs
EXPOSE 3001
CMD ["node", "server.js"]
