# Businessflix Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Work directly in the actual project directory. Do not create a worktree, commit, push, or modify a pull request.

**Goal:** Fix the audited security, data-safety, dependency, upload, AI cost-control, lint, accessibility, image, theme-token, migration, and test gaps without resetting PostgreSQL or deleting R2 objects.

**Architecture:** Put security decisions in small pure modules that can be tested without Next.js or external services. Route handlers validate at both persistence and fetch boundaries. Database changes use a baseline migration plus forward-only idempotent hardening SQL, with record counts checked before and after any live migration action.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner through `tsx --test`, Better Auth, Prisma/PostgreSQL, Supabase Storage, Cloudflare R2, Anthropic SDK.

---

### Task 1: Test foundation

**Files:**
- Modify: `package.json`
- Create: `tests/security/media-url-policy.test.ts`
- Create: `tests/security/upload-policy.test.ts`
- Create: `tests/security/email-redaction.test.ts`
- Create: `tests/security/talent-lab-policy.test.ts`

- [ ] Add scripts:

```json
"test": "tsx --test tests/**/*.test.ts",
"typecheck": "tsc --noEmit"
```

- [ ] Add failing tests importing the future pure modules and asserting:
  - managed keys and configured HTTPS hosts are accepted;
  - localhost, credentials, private/link-local IPs, HTTP, unknown hosts, and protocol-relative values are rejected;
  - video/image MIME and extension pairs plus maximum sizes are enforced;
  - email addresses are masked and URLs/HTML are absent from safe log details;
  - Talent Lab rejects empty and oversized messages and exposes bounded constants.
- [ ] Run each file with `npm test -- tests/security/<file>` and confirm failure is caused by the missing module.

### Task 2: Media URL and safe-fetch policy

**Files:**
- Create: `lib/security/media-url-policy.ts`
- Create: `lib/security/safe-media-fetch.ts`
- Modify: `lib/storage.ts`
- Modify: `app/api/preview/[episodeId]/route.ts`
- Modify: `app/api/subtitles/[id]/route.ts`
- Modify: `app/[locale]/app/organization/content/actions.ts`
- Modify: `app/[locale]/app/editor/titles/[id]/page.tsx`

- [ ] Implement a pure `validateMediaReference(value, allowedOrigins)` returning a discriminated result:

```ts
export type MediaReferenceResult =
  | { ok: true; kind: "managed-key" | "local-path" | "remote-url"; value: string }
  | { ok: false; reason: string };
```

- [ ] Reject URL credentials, non-HTTPS remote URLs, unapproved origins, localhost names, and literal private/link-local IPv4/IPv6 addresses. Accept only normalized managed prefixes such as `uploads/`, `hls/`, `images/`, and configured remote origins derived from R2, Supabase, and `MEDIA_ALLOWED_ORIGINS`.
- [ ] Implement `safeMediaFetch` with `redirect: "manual"`, a 10-second AbortSignal timeout, at most two validated redirects, and an explicit method/Range header API.
- [ ] Replace direct preview and subtitle `fetch` calls with `safeMediaFetch`.
- [ ] Validate episode `videoPath`, subtitle path, trailer URL, and image URL before persistence where the action accepts an arbitrary hidden form value.
- [ ] Run media policy tests and confirm green.

### Task 3: Upload policy and signed URL limits

**Files:**
- Create: `lib/security/upload-policy.ts`
- Modify: `lib/storage.ts`
- Modify: `app/api/account/avatar-upload/route.ts`
- Modify: `app/api/editor/image-upload/route.ts`
- Modify: `app/api/editor/video-upload/route.ts`
- Modify: `app/api/editor/hls-upload/route.ts`
- Modify: `components/editor/ImageUpload.tsx`
- Modify: `components/editor/VideoUpload.tsx`
- Modify: `components/editor/TrailerUpload.tsx`

- [ ] Define explicit constants and schemas:

```ts
export const MAX_AVATAR_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 4 * 1024 * 1024 * 1024;
export const MAX_HLS_FILES = 1000;
export const MAX_HLS_TOTAL_BYTES = 8 * 1024 * 1024 * 1024;
```

- [ ] Require `filename`, `contentType`, and integer `size` in upload payloads. Match MIME to allowed extensions. Reject invalid payloads with a generic 400 response.
- [ ] Add expected content length to the storage signed-upload interface. Include `ContentLength` in R2 `PutObjectCommand`. Keep Supabase validation at the API boundary.
- [ ] Reduce R2 signed URL expiration from 3600 seconds to 900 seconds.
- [ ] Add each HLS file size and enforce count and aggregate limits before signing.
- [ ] Update upload clients to send `File.size` and HLS per-file sizes.
- [ ] Return generic 500 messages while logging a token-free operation label server-side.
- [ ] Run upload policy tests and confirm green.

### Task 4: Auth email safety

**Files:**
- Create: `lib/security/log-redaction.ts`
- Modify: `lib/auth.ts`
- Modify: `lib/email.ts`
- Modify: `lib/auth-client.ts`

- [ ] Implement and test:

```ts
export function maskEmail(email: string): string;
export function safeErrorMessage(error: unknown): string;
```

- [ ] Await `sendVerificationEmail`, `sendPasswordResetEmail`, and `sendCorporateWelcomeEmail` inside Better Auth callbacks.
- [ ] If the send result is false, log only operation, masked recipient, and sanitized provider message. Never log HTML, reset URL, verification URL, invitation URL, or token.
- [ ] Remove `console.info({ to, subject, html })` from missing-key and error paths.
- [ ] Change Better Auth plugin imports to dedicated package paths supported by the installed upgraded version.
- [ ] Run email redaction tests and confirm green.

### Task 5: Talent Lab limits and atomic quota

**Files:**
- Create: `lib/security/talent-lab-policy.ts`
- Modify: `prisma/schema.prisma`
- Modify: `app/api/talent-lab/chat/route.ts`
- Create: `prisma/migrations/202607130002_security_hardening/migration.sql`

- [ ] Define policy constants:

```ts
export const TALENT_MESSAGE_MAX_CHARS = 6000;
export const TALENT_MAX_OUTPUT_TOKENS = 4096;
export const TALENT_RATE_WINDOW_SEC = 60;
export const TALENT_RATE_MAX = 12;
export const TALENT_MAX_ACTIVE = 2;
export const TALENT_TIMEOUT_MS = 90_000;
```

- [ ] Add an `AgentQuota` model keyed by `userId` with window start, request count, active count, and updated timestamp.
- [ ] Add SQL function `claim_agent_quota(user_id, now, window, max_requests, max_active)` that upserts and locks one quota row atomically, returning whether the request is allowed.
- [ ] Add `release_agent_quota` and call it in the stream `finally` path.
- [ ] Validate JSON with Zod and reject oversized content before any database or Anthropic work.
- [ ] Replace 64000 max tokens with 4096 and pass an abort signal controlled by a 90-second timer.
- [ ] Delete a newly created empty conversation if the request fails before any assistant content is persisted.
- [ ] Run Talent Lab tests and confirm green.

### Task 6: Dependency security upgrades

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] Install patched direct versions, keeping Next and eslint config aligned:

```bash
npm install better-auth@latest next@16.2.10 eslint-config-next@16.2.10 next-intl@latest resend@latest
```

- [ ] Run `npm audit --omit=dev` and inspect remaining findings for actual runtime reachability.
- [ ] Run `npx prisma generate`, typecheck, tests, lint, and build. Adjust only documented breaking API changes, consulting `node_modules/next/dist/docs/` and installed Better Auth types.

### Task 7: UI lint, images, accessibility, and theme tokens

**Files:**
- Modify: `components/marketing/MobileMenu.tsx`
- Modify: `app/[locale]/(auth)/login/SignInForm.tsx`
- Modify: `app/[locale]/(auth)/register/SignUpForm.tsx`
- Modify: `app/[locale]/(auth)/reset-password/ResetPasswordForm.tsx`
- Modify: `app/[locale]/app/account/subscription/SubscribeButton.tsx`
- Modify: `app/[locale]/app/watch/[slug]/page.tsx`
- Modify: `components/app/AppHero.tsx`
- Modify: `components/app/HeroVideo.tsx`
- Modify: `components/app/TitleCard.tsx`
- Modify: `components/marketing/FeaturedLibrary.tsx`
- Modify: `components/video/VideoPlayer.tsx`
- Modify: `app/globals.css`
- Modify additional component files reported by the hardcoded-color scan.

- [ ] Remove MobileMenu's effect-driven mount state by using a client-safe portal host rendered by the marketing layout or a callback-ref based mount that does not synchronously set state in an effect.
- [ ] Add dialog semantics, initial focus, Tab wrap, Escape close, background inert behavior, and focus restoration.
- [ ] Remove `tabIndex={-1}` from password visibility controls.
- [ ] Replace content `<img>` uses with `next/image`, supplying `fill` or dimensions and accurate `sizes`.
- [ ] Remove unused props and stale eslint-disable directives.
- [ ] Move reusable visual colors and gradients into semantic variables in `globals.css`; use Tailwind token utilities or CSS variables from components. Preserve literal flag and third-party brand SVG colors.
- [ ] Run `npm run lint` until it exits zero with no warnings.

### Task 8: Migration baseline without reset

**Files:**
- Create: `prisma/migrations/202607130001_baseline/migration.sql`
- Create: `scripts/db-safety-snapshot.mjs`
- Modify: `.env.local.example` only if a new required variable is introduced.

- [ ] Run read-only `prisma migrate status` and query counts for `User`, `Organization`, `Title`, `Episode`, and non-empty media references.
- [ ] Generate baseline SQL from empty to the pre-hardening Prisma schema. Do not apply this SQL to the populated database.
- [ ] Mark the baseline migration applied with `prisma migrate resolve --applied 202607130001_baseline` only after confirming schema compatibility. This changes migration metadata only and does not recreate tables.
- [ ] Apply the forward-only `202607130002_security_hardening` migration with `prisma migrate deploy`.
- [ ] Re-run the safety snapshot. Stop if any protected count decreases or media references change.
- [ ] Confirm R2 is never listed, moved, or deleted by migration scripts.

### Task 9: Final verification

**Files:**
- No production file changes expected.

- [ ] Run `npm test` and require zero failures.
- [ ] Run `npm run lint` and require zero errors or warnings.
- [ ] Run `npm run typecheck` and require exit zero.
- [ ] Run `npm run build` and require exit zero.
- [ ] Run `npx prisma validate` and `npx prisma migrate status`.
- [ ] Run `npm audit --omit=dev` and report any remaining advisories with reachability context.
- [ ] Run `git diff --check` and `git status --short`.
- [ ] Leave all project changes unstaged. Report every changed and created file. Do not commit, push, or modify a pull request.
