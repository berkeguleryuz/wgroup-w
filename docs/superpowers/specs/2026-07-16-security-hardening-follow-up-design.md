# Businessflix Security Hardening Follow-up Design

## Scope

This follow-up closes the actionable risks left by the 2026-07-15 audit and the Supabase Security Advisor warning reported on 2026-07-16. It covers database metadata RLS, distributed rate limiting, PostgreSQL TLS configuration readiness, immutable CI action references, migration deployment safety, and verification.

## Design decisions

### Supabase migration metadata

`public._prisma_migrations` remains in the public schema because Prisma owns its location. RLS will be enabled without user policies, and privileges for `anon` and `authenticated` will be revoked. The migration role remains able to update the table because PostgreSQL table owners bypass RLS unless `FORCE ROW LEVEL SECURITY` is enabled.

### Distributed rate limiting

Better Auth will use its supported `database` rate-limit storage and the documented `rateLimit` Prisma model. Production requests will use Vercel's trusted `x-vercel-forwarded-for` header.

The public corporate lead Server Action will use a separate `PublicRateLimit` table. The client IP will be HMAC hashed with `BETTER_AUTH_SECRET`, never stored directly. A single PostgreSQL upsert will enforce five submissions per rolling one-hour fixed window. A rejected request redirects to the existing generic error state so it does not expose limiter internals.

### PostgreSQL TLS

Strict certificate verification cannot be enabled safely until the Supabase CA certificate is supplied. Code will support a base64 encoded `DATABASE_CA_CERT_BASE64` value and use `rejectUnauthorized: true` when present. Existing behavior remains available only as an explicit compatibility fallback, with a clear warning. The GitHub worker will document the new secret.

### CI supply chain

`actions/checkout` and `actions/setup-node` will be pinned to the verified commit IDs currently referenced by their official v4 tags. Comments will preserve the human-readable release family.

### Migration deployment

Before any live write, the existing read-only database safety snapshot and RLS audit must pass. Prisma migration deploy is the only approved migration application path so `_prisma_migrations` remains consistent. If Prisma cannot reach the direct endpoint, no manual untracked SQL deployment will be used.

## Acceptance criteria

- Supabase Advisor no longer reports RLS disabled on `_prisma_migrations` after deployment.
- The RLS audit covers `_prisma_migrations`, `rateLimit`, and `PublicRateLimit`.
- Better Auth production rate limiting uses database storage.
- Corporate lead submissions are atomically limited without storing raw IP addresses.
- TLS strict mode succeeds when the Supabase CA secret is present and fails clearly when the certificate is invalid.
- GitHub Actions use immutable SHA references.
- Tests, lint, typecheck, build, dependency audit, Prisma validation, safety snapshot, and live RLS audit pass.
- All changes remain unstaged.
