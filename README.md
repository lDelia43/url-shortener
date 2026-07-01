<p align="center">
  <img width="1500" height="591" alt="1500x591_revolucion-iol-invertironline-marca-se-transforma-903389-085044" src="https://github.com/user-attachments/assets/cc79c4ef-c8b3-4833-bbde-b14628f21bd7" />
</p>
# URL Shortener

URL shortener built with **NestJS + TypeScript**, using **Prisma/PostgreSQL**, **Zod** and
**Swagger**. It is the solution to the *URL Shortener* problem from the book *System Design
Interview* (Alex Xu, Ch. 8). The design decisions are in [DESIGN.md](./DESIGN.md).

- Code generation: **global counter + Base62** (no collisions).
- Concurrency: atomic counter in Postgres (`UPDATE ... RETURNING`).
- Reads: **cache-aside**. Redirect **301**.

## Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/shorten` | Body `{ "longUrl": "https://..." }` → `{ "shortUrl": "http://localhost:3000/<code>" }`. `400` if the URL is invalid. |
| `GET` | `/:code` | `301` redirect to the original URL. `404` if the code does not exist. |
| `GET` | `/api` | Swagger UI. |

---

## Option 1 (recommended): run everything with Docker

Requires only Docker. No Node or Postgres installed locally.

```bash
docker compose up --build
```

This brings up Postgres, waits until it is healthy, runs the Prisma migrations automatically
and starts the back-end. Once it is up:

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api`

To tear everything down (and delete the data): `docker compose down -v`.

---

## Option 2: local development

Requires Node 22+ and Docker (only for the database).

```bash
# 1. Install dependencies
npm install

# 2. Copy the environment variables
cp .env.example .env

# 3. Start Postgres only
docker compose up -d db

# 4. Run the migrations (creates the tables + seeds the counter)
npm run prisma:deploy

# 5. Start in development mode (watch)
npm run start:dev
```

---

## Tests

```bash
# Unit (base62 + cache-aside). No DB needed.
npm run test

# Prisma integration (real concurrency). Needs Postgres:
docker compose up -d db      # if it is not already running
npm run test:integration

# End-to-end of the HTTP flow (301 / 404 / 400). No DB needed
# (the real store is replaced by an in-memory one via the ports).
npm run test:e2e
```

Lint and formatting:

```bash
npm run lint          # ESLint (fails if an `any` appears)
npm run format        # Prettier --write
npm run format:check  # Prettier --check
```

---

## Environment variables

See [.env.example](./.env.example). They are validated with Zod at startup (fail-fast).

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection (includes `connection_limit` for the pool). |
| `PORT` | Back-end port (default `3000`). |
| `BASE_URL` | Prefix used to build the `shortUrl` in the response. |

---

## `curl` examples

```bash
# Shorten a URL
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl":"https://www.anthropic.com/some/very/long/path"}'
# => {"shortUrl":"http://localhost:3000/b"}

# Follow the redirect (-i shows the 301 and the Location header)
curl -i http://localhost:3000/b
# => HTTP/1.1 301 Moved Permanently
# => Location: https://www.anthropic.com/some/very/long/path

# Invalid URL => 400
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl":"not-a-url"}'
```
