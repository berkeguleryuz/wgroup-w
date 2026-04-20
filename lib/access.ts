import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth, type UserRole } from "./auth";
import { prisma } from "./prisma";
import { routing, localizedPath, type Locale } from "./i18n/routing";

const STAFF_ROLES: UserRole[] = ["admin", "platform_editor"];

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

  const [individual, activeMembership] = await Promise.all([
    prisma.individualSubscription.findUnique({ where: { userId } }),
    prisma.member.findFirst({
      where: { userId },
      include: {
        organization: {
          include: { companyProfile: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (individual && individual.status === "active") {
    return {
      hasAccess: true as const,
      reason: "individual" as const,
      subscription: individual,
    };
  }

  const company = activeMembership?.organization.companyProfile;
  if (company && company.subscriptionStatus === "active") {
    return {
      hasAccess: true as const,
      reason: "corporate" as const,
      membership: activeMembership,
      company,
    };
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
