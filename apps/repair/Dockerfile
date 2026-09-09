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

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Schema push tools for Fly release_command (drizzle-kit push)
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/src/db ./src/db
COPY --from=builder /app/scripts/fly-release.sh ./scripts/fly-release.sh
RUN chmod +x ./scripts/fly-release.sh \
  && npm install --omit=dev --no-save drizzle-kit@0.31.10 dotenv@17.4.2 typescript@5 \
  && mkdir -p /app/public/uploads \
  && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3001
CMD ["node", "server.js"]
