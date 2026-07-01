# syntax=docker/dockerfile:1

# ---------- Build stage ----------
# Compiles TypeScript and generates the Prisma Client. We use debian-slim (not
# alpine) to avoid Prisma engine issues with musl/openssl.
FROM node:22-slim AS build
WORKDIR /app

# openssl is required by the Prisma engine.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Install all deps (including devDeps) so we can compile.
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Prisma Client is generated before the build because the TS code imports its types.
RUN npx prisma generate

COPY . .
RUN npm run build

# ---------- Runtime stage ----------
# Lightweight image: only production deps + compiled dist. No devDependencies.
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Production deps only (prisma CLI is in dependencies for `migrate deploy`).
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

COPY --from=build /app/dist ./dist

EXPOSE 3000

# Apply pending migrations and only then start the server.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
