# DESIGN.md — URL Shortener

Implementation of the **URL Shortener** problem from the book *System Design Interview – An
Insider's Guide (Vol 1)* by Alex Xu (Ch. 8). The focus is on the **implementation** and on
being able to defend every decision, not on drawing boxes and arrows.

---

## 1. Problem and scope

A service that receives a long URL and returns a unique short URL. Accessing the short URL
redirects to the original one.

**Non-functional requirements that drive the design:**

- High availability.
- Minimal latency on the redirect (the most frequent operation).
- Very unbalanced read/write ratio: many more reads (clicks) than writes (link creation).

**In scope:**

- `POST /shorten` — shortens a URL.
- `GET /:code` — redirects (301) to the original URL.
- Swagger documentation at `/api`.

**Out of scope (on purpose, to avoid inflating the scope):**

- Link expiration.
- Analytics / click counting.
- Custom aliases chosen by the user.
- Authentication / users.
- Redis (the cache is in-memory; see section 6).

---

## 2. Code generation: counter + Base62 (vs. hash + truncation)

The short code is generated from a **global incremental counter** encoded in **Base62**
(`a-z`, `A-Z`, `0-9`), instead of hashing the URL and truncating the result.

| | Counter + Base62 (chosen) | Hash + truncation |
|---|---|---|
| Collisions | **Never**: the counter never repeats a value | Possible: must be detected and resolved |
| Dependency | Needs a central ID generator | No central generator needed |
| Length | Grows with the ID | Fixed |

**Why counter + Base62:** the central argument of the chapter is that a counter that never
repeats a value **never produces collisions**. That removes all the complexity of detecting
and retrying duplicate codes that the hash approach requires.

**Trade-off accepted:** we need a **centralized point** that hands out "the next value". That
point is the `Counter` table in Postgres (see section 3). It is the price to pay for never
having collisions.

The encoding lives in a pure function (`short-code-generator.ts`) that uses `bigint` so as
not to lose precision once the counter exceeds `2^53` (capacity ~ `62^n`).

---

## 3. Concurrency: atomic counter in the database

**Possible race condition:** if two creation requests ask for "the next value" at the same
time and that value were computed in the process memory (`counter++`), both could receive the
same number → two different URLs with the same code → collision / data loss.

**Solution:** the counter lives in Postgres (`Counter` table, a single row) and is incremented
with an **atomic operation**:

`UPDATE ... RETURNING` takes a **row-lock** on the counter row. Two concurrent transactions
**serialize**: one waits for the other to finish, so each one gets a distinct `value`. The
uniqueness guarantee lives in the database, **not in the Node process memory**.

**Why it is the right choice at scale:** if tomorrow **N instances** of the back-end run
behind a load balancer, an in-memory counter would give an independent counter per instance →
guaranteed collisions. Living in Postgres, the serialization point is single and shared by all
instances. It works the same with 1 or with N replicas.

**Note on transactions and gaps:** creation does two steps (ask for the next value and then
insert the row). If the process crashes between the two, a counter value is "wasted" (a gap).
Gaps are **acceptable**: they break nothing, because the absence of collisions depends only on
each increment returning a distinct value, not on the sequence being dense.

**Alternative considered — `BIGSERIAL`:** using the `Url` table's own autoincrement `id` as
the counter (Postgres' native sequence) also solves the concurrency. We chose the explicit
`Counter` table to make the atomic `UPDATE ... RETURNING` operation visible in the code, which
is exactly the point the problem asks us to demonstrate.

**Validation:** the integration test `prisma-url-store.integration.spec.ts` fires 50–100
concurrent creations with `Promise.all` and verifies that all codes are distinct and that no
insert fails on the unique index.

---

## 4. Cache-aside on reads

The redirect (`GET /:code`) is the hot, read-heavy operation. We apply **cache-aside**:

1. Check the cache. If present (**HIT**), respond without touching the DB.
2. If absent (**MISS**), go to the store, **populate the cache** and respond.

**Writes** (`POST /shorten`) go **straight to the store** and do not touch the cache.

**Why cache-aside and not another pattern:**

- The read/write ratio is very unbalanced: caching reads is where the win is.
  Write-through/write-behind optimize the write, which here is the rare operation.
- The `code → longUrl` mapping is **immutable** (no updates or expiration in this scope), so
  there is no invalidation problem: a cached entry never goes stale.

The cache is a port (`UrlCache`) with an in-memory implementation. Its methods are `async` on
purpose, so we can switch to Redis without touching the service (see section 6).

**Validation:** `url-shortener.service.spec.ts` verifies that on a HIT the store is not called,
and that on a MISS the store is called and the cache is then populated.

---

## 5. Redirect 301 (permanent) vs. 302 (temporary)

We use **301 Moved Permanently**.

- **301**: the browser can **cache** the redirect and, on subsequent visits, go straight to the
  original URL **without hitting the server**. Less load, lower latency.
- **302**: forces **every** request to go through the server. That is what you would choose if
  you wanted to **count clicks** (analytics).

Since we do **not** implement analytics, there is no reason to force every click through the
server. Therefore, 301 is the right choice for this scope.

---

## 6. How it would scale in a real system

- **Shared cache (Redis):** the in-memory cache lives per process. With multiple back-end
  instances, each one would have its own cache (low HIT rate and possible inconsistencies if
  there were invalidation). The natural evolution is to move the cache to **Redis** to share it
  across instances. Since `UrlCache` is a port, the change is a new implementation without
  touching the service.
- **Distributed ID generator:** the `Counter` table is a central serialization point. At high
  write scale it could become a bottleneck. It would be replaced by a distributed generator
  (**Snowflake** style, or ID ranges pre-assigned per instance) to avoid the global lock.
- **CDN / edge in front of the redirect:** being a 301, a CDN can cache the redirect response
  near the user and respond without reaching the origin, lowering global latency.
- **Rate limiting:** in front of `POST /shorten` (and optionally the redirect) to mitigate
  abuse, typically in an API gateway or with a per-IP/API-key limit.
- **Defensive design:** timeouts and a right-sized Prisma connection pool (`?connection_limit=`
  in `DATABASE_URL`). Metrics (Prometheus) and health checks would be added for observability;
  they are omitted here to avoid over-engineering the scope.

---

## 7. Testing and CI

The tests are split by what they need and what they prove, not by count:

- **Unit (no DB):** `short-code-generator.spec.ts` checks the Base62 pure function (alphabet
  boundaries, carry, `bigint`); `url-shortener.service.spec.ts` checks cache-aside (a HIT does not
  hit the store, a MISS populates it); `url-shortener.controller.spec.ts` checks the controller
  delegates to the service and shapes the 301 response.
- **Integration (real Postgres):** `prisma-url-store.integration.spec.ts` fires many concurrent
  creations and asserts the codes are all distinct. This is the test that actually proves the
  atomic-counter decision (section 3) — a guarantee that cannot be validated in process memory.
- **E2E (no DB):** `app.e2e-spec.ts` drives the full HTTP flow (301 / 404 / 400). Thanks to the
  ports, it overrides the store with the in-memory one, so it needs no external infrastructure.

**CI (GitHub Actions):** every push and pull request to `main` runs the whole gate — lint (with
`@typescript-eslint/no-explicit-any` as an error), format check, build, and the three test layers —
with a Postgres service container for the integration step. This enforces the challenge's "must
build and pass tests" requirement automatically on every change.

---

## 8. Use of AI

I built this project with Claude Code (Claude Opus) as a pair-programming assistant. I made
every design decision and drove the process; the assistant generated code, tests and
boilerplate under my direction, and I reviewed and iterated on all of it.

### How I orchestrated it

- **Plan first.** Before any code, I had the assistant produce a full implementation plan from
  the challenge brief, the Alex Xu chapter (Ch. 8), and my own constraints. I reviewed and
  approved that plan so nothing in scope slipped.
- **Checkpoints.** I worked block by block: the assistant implemented a piece, I reviewed, and I
  steered the next step. I asked it to justify each decision so I could defend it.
- **Hard quality gate.** Every change had to pass `build`, `lint` (with
  `@typescript-eslint/no-explicit-any` set to `error`), `format`, and the full
  unit / integration / e2e suites before moving on. I also ran the whole stack end-to-end
  (`docker compose up`) and checked the endpoints by hand (`curl`, browser, Swagger).

### Decisions I directed

- **Short-code generation:** global counter + Base62, and specifically a dedicated `Counter`
  table incremented with `UPDATE ... RETURNING` (rather than a `BIGSERIAL` sequence) to make the
  atomic operation explicit and easy to reason about.
- **Ports/adapters only where they pay off:** `UrlStore` and `UrlCache` as interfaces injected by
  token — enough to run tests without a DB and to swap the cache for Redis later, without extra
  ceremony elsewhere.
- **Swagger via hand-written mirror DTOs** instead of a Zod-to-OpenAPI library, to avoid "magic"
  I could not explain, while keeping Zod as the single runtime source of truth.
- **Scope discipline:** I rejected nice-to-haves that did not fit (health endpoint, metrics) and
  kept only lightweight logging.
- **Style:** `any` forbidden; `unknown` kept only where it is genuinely
  correct (the validation pipe), with no type casts elsewhere.

### What I verified and adjusted by hand

- Reviewed every file: I keep the code minimal and commented where it adds value, and I can
  explain each function.
