import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { USER_ROLES } from "@/lib/auth";
import { updateUserRole } from "./actions";
import { Button } from "@/components/ui/Button";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole(["admin"]);
  const [t, users] = await Promise.all([
    getTranslations("admin"),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        individualSubscription: { select: { status: true, plan: true } },
      },
    }),
  ]);
  const dateLocale =
    (await getLocale()) === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-US";

  return (
    <div className="space-y-8">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-3xl md:text-5xl">{t("userListHeading")}</h1>
      </header>

      <div className="rounded-11 border border-border/60 bg-background">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{t("colNameEmail")}</th>
              <th className="px-4 py-3">{t("colRole")}</th>
              <th className="px-4 py-3">{t("colSubscription")}</th>
              <th className="px-4 py-3">{t("colSignup")}</th>
              <th className="px-4 py-3">{t("colAction")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <form
                    action={updateUserRole}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="userId" value={u.id} />
                    <select
                      name="role"
                      defaultValue={u.role ?? "individual"}
                      className="h-9 rounded-11 border border-border bg-background px-2 text-sm"
                    >
                      {USER_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" variant="secondary" size="sm">
                      {t("update")}
                    </Button>
                  </form>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {u.individualSubscription
                    ? `${u.individualSubscription.plan} · ${u.individualSubscription.status}`
                    : "-"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {u.createdAt.toLocaleDateString(dateLocale)}
                </td>
                <td className="px-4 py-3">
                  {u.banned ? (
                    <span className="rounded-11 bg-muted px-2 py-1 text-xs">
                      {t("statusBanned")}
                    </span>
                  ) : (
                    <span className="rounded-11 bg-primary/40 px-2 py-1 text-xs">
                      {t("statusActive")}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
