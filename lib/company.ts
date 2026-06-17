/**
 * Pure helpers for corporate subscription validity. Kept dependency-free (no
 * imports from access.ts / corporate.ts) so both the access layer and the
 * expiry cron can use them without a circular import.
 */

export const GRACE_PERIOD_DAYS = 7;

type CompanySub = {
  subscriptionStatus: string;
  subscriptionEndsAt: Date | null;
};

/**
 * Whether a company subscription currently grants content access. Tolerant of
 * cron lag: access is derived from status AND the end date + grace window, so
 * an expired company loses access even if the status label hasn't flipped yet.
 */
export function isCompanyAccessValid(
  company: CompanySub | null | undefined,
): boolean {
  if (!company) return false;
  if (
    company.subscriptionStatus === "expired" ||
    company.subscriptionStatus === "pending"
  ) {
    return false;
  }
  // "active" | "grace"
  if (!company.subscriptionEndsAt) return true;
  const graceEnd = new Date(
    company.subscriptionEndsAt.getTime() +
      GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
  );
  return new Date() <= graceEnd;
}
