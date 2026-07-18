import { createHmac } from "node:crypto";

export function createPublicRateLimitKey(
  scope: string,
  clientId: string,
  secret: string,
) {
  if (secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
  }
  const digest = createHmac("sha256", secret)
    .update(`${scope}\0${clientId}`)
    .digest("hex");
  return `${scope}:${digest}`;
}

export function isPublicRateLimitAllowed(count: number, limit: number) {
  return Number.isSafeInteger(count) && count >= 1 && count <= limit;
}

export function trustedVercelClientIp(requestHeaders: Headers) {
  const value = requestHeaders.get("x-vercel-forwarded-for")?.trim();
  return value && value.length <= 128 ? value : "unknown";
}
