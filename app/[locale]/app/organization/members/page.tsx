import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";
import { requireOrgOwner } from "@/lib/corporate";

export const dynamic = "force-dynamic";

export default async function CorporateMembersPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, { membership }] = await Promise.all([
    getTranslations("organization"),
    requireOrgOwner(),
  ]);
  const orgId = membership.organizationId;

  const [members, invites] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { name: true, email: true, createdAt: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invitation.findMany({
      where: { organizationId: orgId, status: "pending" },
      orderBy: { expiresAt: "desc" },
    }),
  ]);

  const dateLocale =
    (await getLocale()) === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-US";

  return (
    <div className="space-y-10">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-3xl md:text-5xl">{t("members")}</h1>
      </header>

      <section>
        <h2 className="font-display text-2xl">{t("activeMembers")}</h2>
        <div className="mt-3 rounded-11 border border-border/60 bg-background">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("colUser")}</th>
                <th className="px-4 py-3">{t("colRole")}</th>
                <th className="px-4 py-3">{t("colSignup")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground">{m.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">
                    {m.role}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {m.user.createdAt.toLocaleDateString(dateLocale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl">{t("pendingInvitations")}</h2>
        <div className="mt-3 rounded-11 border border-border/60 bg-background">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("colEmail")}</th>
                <th className="px-4 py-3">{t("colRole")}</th>
                <th className="px-4 py-3">{t("colExpires")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {invites.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-muted-foreground"
                    colSpan={3}
                  >
                    {t("noInvitations")}
                  </td>
                </tr>
              ) : (
                invites.map((i) => (
                  <tr key={i.id}>
                    <td className="px-4 py-3">{i.email}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">
                      {i.role ?? "member"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {i.expiresAt.toLocaleDateString(dateLocale)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
