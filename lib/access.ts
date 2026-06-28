import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth, type UserRole } from "./auth";
import { prisma } from "./prisma";
import { isCompanyAccessValid } from "./company";
import { routing, localizedPath, type Locale } from "./i18n/routing";

const STAFF_ROLES: UserRole[] = ["admin", "platform_editor"];

/** True for platform staff (admin / platform_editor). Single source of truth. */
export function isStaff(role: string | null | undefined): boolean {
  return !!role && (STAFF_ROLES as string[]).includes(role);
}

/** Typed role accessor — avoids the repeated `as { role }` cast at call sites. */
export function userRole(
  session: { user?: { role?: string | null } } | null | undefined,
): UserRole | null {
  const r = session?.user?.role ?? null;
  return (r as UserRole | null) ?? null;
}

export type AccessSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

async function currentLocale(): Promise<Locale> {
  const h = await headers();
  const fromHeader = h.get("x-next-intl-locale");
  if (fromHeader && (routing.locales as readonly string[]).includes(fromHeader)) {
    return fromHeader as Locale;
  }
  const url = h.get("x-url") ?? h.get("referer") ?? "";
  for (const l of routing.locales) {
    if (url.includes(`/${l}/`) || url.endsWith(`/${l}`)) return l;
  }
  return routing.defaultLocale;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    const locale = await currentLocale();
    redirect(localizedPath(locale, "/login"));
  }
  return session;
}

export async function requireRole(roles: UserRole[]) {
  const session = await requireSession();
  const role = (session.user as { role?: string | null }).role as UserRole | null;
  if (!role || !roles.includes(role)) {
    const locale = await currentLocale();
    redirect(localizedPath(locale, "/"));
  }
  return session;
}

export const getEffectiveAccess = cache(async function getEffectiveAccess(
  userId: string,
  userRole?: string | null,
) {
  if (userRole && STAFF_ROLES.includes(userRole as UserRole)) {
    return { hasAccess: true as const, reason: "staff" as const };
  }

  const [individual, memberships] = await Promise.all([
    prisma.individualSubscription.findUnique({ where: { userId } }),
    // All memberships — a user can belong to several orgs; access is granted if
    // ANY of them has a valid corporate subscription.
    prisma.member.findMany({
      where: { userId },
      include: {
        organization: {
          include: { companyProfile: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (individual && (individual.status === "active" || individual.status === "trialing")) {
    return {
      hasAccess: true as const,
      reason: "individual" as const,
      subscription: individual,
    };
  }

  for (const membership of memberships) {
    const company = membership.organization.companyProfile;
    if (company && isCompanyAccessValid(company)) {
      return {
        hasAccess: true as const,
        reason: "corporate" as const,
        membership,
        company,
      };
    }
  }

  return { hasAccess: false as const, reason: "none" as const };
});

export async function requireSubscriber() {
  const session = await requireSession();
  const userRole = (session.user as { role?: string | null }).role ?? null;
  const access = await getEffectiveAccess(session.user.id, userRole);
  if (!access.hasAccess) {
    const locale = await currentLocale();
    redirect(localizedPath(locale, "/app/account/subscription"));
  }
  return { session, access };
}
