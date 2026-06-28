import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";
import { requireOrgOwner } from "@/lib/corporate";
import { ConfirmButton } from "@/components/editor/ConfirmButton";
import { CopyInviteLink } from "@/components/app/CopyInviteLink";
import {
  setMemberDepartment,
  updateMemberRole,
  removeMember,
  cancelInvitation,
  resendInvitation,
} from "./actions";

export default async function CorporateMembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ err?: string; resent?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, { session, membership }] = await Promise.all([
    getTranslations("organization"),
    requireOrgOwner(),
  ]);
  const orgId = membership.organizationId;
  const sp = searchParams ? await searchParams : undefined;

  const [members, invites, departments] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId: orgId },
      include: {
        user: { select: { name: true, email: true, createdAt: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invitation.findMany({
      where: { organizationId: orgId, status: "pending" },
      orderBy: { expiresAt: "desc" },
    }),
    prisma.department.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
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

      {sp?.resent ? (
        <p className="rounded-11 border border-primary bg-primary/40 px-4 py-3 text-sm">
          {t("inviteResent")}
        </p>
      ) : null}
      {sp?.err === "lastowner" ? (
        <p className="rounded-11 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t("errLastOwner")}
        </p>
      ) : null}
      {sp?.err === "self" ? (
        <p className="rounded-11 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t("errSelf")}
        </p>
      ) : null}
      {sp?.err === "email" ? (
        <p className="rounded-11 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t("errEmail")}
        </p>
      ) : null}

      <section>
        <h2 className="font-display text-2xl">{t("activeMembers")}</h2>
        <div className="mt-3 overflow-x-auto rounded-11 border border-border/60 bg-background">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("colUser")}</th>
                <th className="px-4 py-3">{t("colRole")}</th>
                <th className="px-4 py-3">{t("colDepartment")}</th>
                <th className="px-4 py-3">{t("colSignup")}</th>
                <th className="px-4 py-3 text-right">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {members.map((m) => {
                const isSelf = m.userId === session.user.id;
                return (
                  <tr key={m.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{m.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.user.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <form
                        action={updateMemberRole}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="memberId" value={m.id} />
                        <select
                          name="role"
                          defaultValue={m.role}
                          disabled={isSelf}
                          className="rounded-11 border border-border bg-background px-2 py-1.5 text-xs disabled:opacity-60"
                        >
                          <option value="member">{t("roleMember")}</option>
                          <option value="owner">{t("roleOwner")}</option>
                        </select>
                        {!isSelf ? (
                          <button
                            type="submit"
                            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                          >
                            {t("save")}
                          </button>
                        ) : null}
                      </form>
                    </td>
                    <td className="px-4 py-3">
                      {departments.length === 0 ? (
                        <span className="text-xs text-muted-foreground/70">—</span>
                      ) : (
                        <form
                          action={setMemberDepartment}
                          className="flex items-center gap-2"
                        >
                          <input type="hidden" name="memberId" value={m.id} />
                          <select
                            name="departmentId"
                            defaultValue={m.department?.id ?? ""}
                            className="rounded-11 border border-border bg-background px-2 py-1.5 text-xs"
                          >
                            <option value="">{t("noDepartment")}</option>
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                          >
                            {t("save")}
                          </button>
                        </form>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {m.user.createdAt.toLocaleDateString(dateLocale)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isSelf ? (
                        <span className="text-xs text-muted-foreground/70">
                          {t("you")}
                        </span>
                      ) : (
                        <form action={removeMember} className="inline-flex">
                          <input type="hidden" name="memberId" value={m.id} />
                          <ConfirmButton
                            confirmText={t("removeMemberConfirm", {
                              name: m.user.name,
                            })}
                            className="text-xs text-red-600 underline-offset-4 hover:underline"
                          >
                            {t("removeMember")}
                          </ConfirmButton>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl">{t("pendingInvitations")}</h2>
        <div className="mt-3 overflow-x-auto rounded-11 border border-border/60 bg-background">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("colEmail")}</th>
                <th className="px-4 py-3">{t("colRole")}</th>
                <th className="px-4 py-3">{t("colExpires")}</th>
                <th className="px-4 py-3 text-right">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {invites.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-muted-foreground"
                    colSpan={4}
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
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <CopyInviteLink path={`/invite/${i.id}`} />
                        <form action={resendInvitation}>
                          <input type="hidden" name="invitationId" value={i.id} />
                          <button
                            type="submit"
                            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                          >
                            {t("resendInvite")}
                          </button>
                        </form>
                        <form action={cancelInvitation}>
                          <input type="hidden" name="invitationId" value={i.id} />
                          <ConfirmButton
                            confirmText={t("cancelInviteConfirm", {
                              email: i.email,
                            })}
                            className="text-xs text-red-600 underline-offset-4 hover:underline"
                          >
                            {t("cancelInvite")}
                          </ConfirmButton>
                        </form>
                      </div>
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
