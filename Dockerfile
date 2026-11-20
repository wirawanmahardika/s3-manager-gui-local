FROM oven/bun:1 AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DB_FILE_NAME=/app/storage/local.db
ENV NEXT_PHASE=phase-production-build

RUN mkdir -p /app/storage && bun --bun next build

FROM oven/bun:1 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DB_FILE_NAME=/app/storage/local.db
ENV NEXT_PHASE=

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/next.config.ts ./next.config.ts

RUN mkdir -p /app/storage && chown -R bun:bun /app/storage

USER bun

EXPOSE 3000

CMD ["bun", "--bun", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
