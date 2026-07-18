# Businessflix Security Hardening Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Project rules override commit instructions, so all changes remain unstaged.

**Goal:** Close the remaining actionable database, rate-limit, TLS, and CI security gaps without disrupting existing application behavior.

**Architecture:** Better Auth uses its native database limiter model. Public lead traffic uses a separate atomic PostgreSQL limiter keyed by a secret HMAC. RLS coverage is driven from the existing manifest, and TLS configuration is centralized for scripts and the worker.

**Tech Stack:** Next.js 16, Better Auth 1.6, Prisma 7, PostgreSQL, Supabase, node-postgres, GitHub Actions.

---

### Task 1: Secure migration metadata and limiter tables

**Files:**

- Modify: `prisma/schema.prisma`
- Modify: `prisma/rls.sql`
- Create: `prisma/migrations/202607160001_security_hardening/migration.sql`
- Modify: `tests/security/rls-coverage.test.ts`

- [x] Add a failing test requiring `_prisma_migrations`, `rateLimit`, and `PublicRateLimit` in the RLS manifest and migration history.
- [x] Run `npx tsx --test tests/security/rls-coverage.test.ts` and confirm the missing tables fail.
- [x] Add the Better Auth `RateLimit` model with unique `key`, integer `count`, and bigint `lastRequest`.
- [x] Add `PublicRateLimit` with primary key `key`, integer `count`, and timestamp `windowStart`.
- [x] Add an idempotent migration that creates both models, enables RLS on all three tables, and revokes `anon` and `authenticated` privileges from `_prisma_migrations`.
- [x] Run the target test and `npx prisma validate`.

### Task 2: Move Better Auth rate limiting to PostgreSQL

**Files:**

- Modify: `lib/auth.ts`
- Create: `tests/security/auth-rate-limit.test.ts`

- [x] Add a failing source-policy test requiring `storage: "database"` and the trusted Vercel IP header.
- [x] Run the test and confirm it fails on the current memory-backed configuration.
- [x] Configure `rateLimit.enabled`, `storage`, `window`, `max`, and `advanced.ipAddress.ipAddressHeaders`.
- [x] Run the target test and typecheck.

### Task 3: Add atomic corporate lead rate limiting

**Files:**

- Create: `lib/security/public-rate-limit.ts`
- Modify: `app/[locale]/(marketing)/business/page.tsx`
- Create: `tests/security/public-rate-limit.test.ts`

- [x] Add failing tests for deterministic HMAC keys, no raw IP output, five allowed attempts, and the sixth rejection.
- [x] Implement `createRateLimitKey` as HMAC-SHA256 over scope and normalized Vercel IP.
- [x] Implement one atomic `INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING` statement with a one-hour window.
- [x] Call the limiter before inserting the corporate lead and retain the existing generic error redirect.
- [x] Run target tests, lint, and typecheck.

### Task 4: Add strict TLS configuration support

**Files:**

- Create: `lib/security/postgres-tls.mjs`
- Modify: `worker/index.mjs`
- Modify: `scripts/db-rls-audit.mjs`
- Modify: `scripts/db-safety-snapshot.mjs`
- Modify: `.github/workflows/transcode.yml`
- Modify: `.env.example`
- Create: `tests/security/postgres-tls.test.ts`

- [x] Add failing tests for non-Supabase connections, valid base64 CA decoding, and explicit compatibility fallback.
- [x] Implement a pure TLS option resolver that returns strict verification when CA data exists.
- [x] Reuse the resolver in the worker and database scripts.
- [x] Document `DATABASE_CA_CERT_BASE64` and pass the GitHub secret into the worker.
- [ ] Run a read-only strict connection probe when the Supabase CA is available. The current environment does not provide the CA.

### Task 5: Pin GitHub Actions

**Files:**

- Modify: `.github/workflows/transcode.yml`
- Modify: `tests/ops/transcode-workflow.test.ts`

- [x] Add a failing test that rejects mutable `@v4` references.
- [x] Pin checkout to `34e114876b0b11c390a56381ad16ebd13914f8d5` and setup-node to `49933ea5288caeca8642d1e84afbd3f7d6820020` with v4 comments.
- [x] Run the workflow policy test.

### Task 6: Snapshot, deploy, and verify

**Files:**

- Modify: `docs/superpowers/audits/2026-07-15-full-project-audit.md`

- [x] Run `node scripts/db-safety-snapshot.mjs` and retain the redacted counts and media digest in command output.
- [x] Run `node scripts/db-rls-audit.mjs` before deployment.
- [x] Run `npx prisma migrate deploy`. Do not apply SQL manually if Prisma cannot connect.
- [x] Run `node scripts/db-rls-audit.mjs` after deployment and confirm all manifest tables are enabled.
- [x] Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, root and worker `npm audit`, and `git diff --check`.
- [x] Update the audit report with completed and blocked items, then confirm `git status --short` remains unstaged.
