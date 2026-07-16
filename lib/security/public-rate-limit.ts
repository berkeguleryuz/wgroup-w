import "server-only";

import { prisma } from "../prisma";
import {
  createPublicRateLimitKey,
  isPublicRateLimitAllowed,
  trustedVercelClientIp,
} from "./public-rate-limit-policy";

const CORPORATE_LEAD_LIMIT = 5;
const CORPORATE_LEAD_WINDOW_MS = 60 * 60 * 1000;

export async function consumeCorporateLeadRateLimit(requestHeaders: Headers) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required");

  const key = createPublicRateLimitKey(
    "corporate-lead",
    trustedVercelClientIp(requestHeaders),
    secret,
  );
  const now = new Date();
  const resetBefore = new Date(now.getTime() - CORPORATE_LEAD_WINDOW_MS);

  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "PublicRateLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE
    SET
      "count" = CASE
        WHEN "PublicRateLimit"."windowStart" <= ${resetBefore} THEN 1
        ELSE "PublicRateLimit"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "PublicRateLimit"."windowStart" <= ${resetBefore} THEN ${now}
        ELSE "PublicRateLimit"."windowStart"
      END
    RETURNING count
  `;

  return isPublicRateLimitAllowed(
    Number(rows[0]?.count ?? CORPORATE_LEAD_LIMIT + 1),
    CORPORATE_LEAD_LIMIT,
  );
}
