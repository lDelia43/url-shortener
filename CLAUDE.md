# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What it is

URL Shortener (NestJS + TypeScript) — solution to the problem in Ch. 8 of *System Design
Interview* (Alex Xu). The design decisions and their trade-offs are in `DESIGN.md`; project
usage is in `README.md`.

## Commands

```bash
# Build / dev
npm run build
npm run start:dev            # watch

# Tests
npm run test                 # unit (src/**/*.spec.ts) — no DB
npm run test -- short-code-generator   # a single file/pattern
npm run test:integration     # test/*.integration.spec.ts — NEEDS Postgres (docker compose up -d db)
npm run test:e2e             # test/*.e2e-spec.ts — no DB (real store replaced by in-memory)

# Quality (must pass clean)
npm run lint                 # ESLint; `@typescript-eslint/no-explicit-any` is set to 'error'
npm run format:check

# Prisma / DB
docker compose up -d db      # Postgres only
npm run prisma:deploy        # apply migrations (prisma migrate deploy)
npm run prisma:migrate       # create a new migration in dev

# Full stack
docker compose up --build    # db + app (migrates and starts on its own)
```

## Architecture

`src/` is organized **by technical type, one folder per component**, with one **module per layer**
so each layer encapsulates its own providers. `app.module` imports only `ControllersModule`; the
chain pulls in the rest.

Module chain (imports/exports): `AppModule → ControllersModule → ServicesModule → RepositoriesModule`.
- `controllers/controllers.module.ts` — declares every controller, imports `ServicesModule`. Knows
  nothing about Prisma. **Add a controller here and it is wired into the app** (app.module never changes).
- `services/services.module.ts` — provides + exports every service, imports `RepositoriesModule`.
- `repositories/repositories.module.ts` — binds each port to its adapter
  (`URL_STORE → PrismaUrlStore`, `URL_CACHE → InMemoryUrlCache`) and exports **only the tokens**, so
  `PrismaService` stays encapsulated in this layer. The e2e tests override `URL_STORE`/`PrismaService`
  with `.overrideProvider(...)`.

Components (each in its own PascalCase folder with its `.spec`):
- `controllers/UrlShortenerController/` — HTTP (2 routes, Zod pipe, redirect).
- `services/UrlShortenerService/` — orchestrates store + cache + generator.
- `generators/ShortCodeGenerator/` — Base62 (**pure function**, `bigint`).
- `repositories/PrismaUrlStore|InMemoryUrlStore|InMemoryUrlCache/` — the adapters.

Shared / grouped (never loose files):
- `repositories/common/` — the ports `url-store.interface.ts` / `url-cache.interface.ts`, each with
  its DI token (`URL_STORE` / `URL_CACHE` as `Symbol`, since a TS interface has no runtime value).
- `common/dto/` — Zod schemas (`*.schema.ts`) + Swagger mirror classes (`*.dto.ts`).
- `common/zod-validation.pipe.ts`, `config/`, `prisma/`.

Why ports: they earn their keep — the store is swapped for `InMemoryUrlStore` in tests (e2e runs
with no DB) and the cache can become Redis later, both without touching the service.

### Design invariants (do not break without updating DESIGN.md)

- **Code generation:** global counter + Base62, never hash+truncation. The counter is the
  `Counter` table (a single row, `id=1`) and is incremented **atomically** with
  `UPDATE "Counter" SET value = value + 1 WHERE id = 1 RETURNING value` in `PrismaUrlStore.nextSequenceValue()`.
  That is where the no-collision guarantee lives; do not move that counter to process memory.
- **Cache-aside:** reads (`GET /:code`) query cache → store → populate cache. Writes
  (`POST /shorten`) go straight to the store, they do not touch the cache.
- **301 redirect** (not 302): permanent because there is no click analytics.
- **Validation with Zod, not class-validator.** Schemas in `dto/*.schema.ts` (runtime source
  of truth, type via `z.infer`), applied with `common/zod-validation.pipe.ts` per-route. The
  classes in `dto/*.dto.ts` with `@ApiProperty` are **mirrors for Swagger only**.
- **Env validated with Zod** in `config/env.validation.ts` (fail-fast at startup).

## Prisma / migrations

- Models in `prisma/schema.prisma`: `Counter` and `Url` (`code` is unique).
- The `Counter` row is **seeded inside the initial migration SQL** (`INSERT INTO "Counter"...`),
  because `prisma migrate deploy` does not run seeds. If the migration is regenerated, re-add that INSERT.

## Tests: what each one validates

- `short-code-generator.spec.ts` — Base62 as a pure function (alphabet boundaries, carry, bigint).
- `url-shortener.service.spec.ts` — cache-aside (HIT does not touch the store; MISS populates the cache).
- `prisma-url-store.integration.spec.ts` — real concurrency: N creations with `Promise.all`
  generate distinct codes without collision (validates the atomic counter decision).
- `app.e2e-spec.ts` — HTTP flow 301 / 404 / 400.

## Jest config separation

- Unit: config embedded in `package.json` (`rootDir: src`, `*.spec.ts`).
- Integration: `test/jest-integration.json` (`setupFiles: dotenv/config` to load `.env`).
- E2E: `test/jest-e2e.json`.

## Style

`any` forbidden (the lint fails).
