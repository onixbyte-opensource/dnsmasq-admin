# The app now talks to SQLite through Prisma's better-sqlite3 adapter, so building the image
# needs a C++ toolchain — better-sqlite3 ships no musl prebuild for alpine. It is installed in
# the deps stage only, so the runtime image stays lean: it only carries the compiled addon
# inside node_modules, with no python3/make/g++ left behind.

# Node 24 keeps the runtime modern across all three stages; nothing here requires its exact
# minor version. Alpine is used for image size.
FROM node:24-alpine AS deps
RUN corepack enable
RUN apk add --no-cache python3 make g++
WORKDIR /app
# Prisma files are copied before install so `prisma generate` can run from the postinstall.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM node:24-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:24-alpine AS runner
# No corepack/pnpm here on purpose: resolving pnpm at container start reaches the network, so
# a restart with no connectivity would fail before the app ever boots. Everything below runs
# through the local binaries in node_modules/.bin instead, which are already version-pinned by
# pnpm-lock.yaml.
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/lib/generated ./lib/generated
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node_modules/.bin/next", "start"]
