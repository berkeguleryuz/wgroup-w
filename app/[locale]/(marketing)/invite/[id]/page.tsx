import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { localizedPath, type Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { getSession } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { AcceptInviteButton } from "./AcceptInviteButton";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("invite");
  const session = await getSession();

  if (!session) {
    redirect(
      `${localizedPath(locale, "/login")}?next=${encodeURIComponent(
        `/invite/${id}`,
      )}`,
    );
  }

  const invitation = await prisma.invitation.findUnique({
    where: { id },
    include: { organization: { select: { name: true } } },
  });

  const isExpired = !invitation || invitation.expiresAt < new Date();
  const isPending = invitation?.status === "pending";
  const wrongAccount =
    !!invitation &&
    invitation.email.toLowerCase() !== session.user.email.toLowerCase();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 px-6 py-16 md:py-24">
      <div>
        <span className="font-accent text-xl text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-2 text-4xl md:text-5xl">{t("heading")}</h1>
      </div>

      {!invitation || isExpired || !isPending ? (
        <div className="rounded-11 border border-border bg-background p-8 text-sm">
          <h2 className="font-display text-xl">{t("notFoundTitle")}</h2>
          <p className="mt-3 text-muted-foreground">{t("notFoundBody")}</p>
          <Link
            href="/app"
            className="mt-6 inline-block text-sm text-foreground underline-offset-4 hover:underline"
          >
            {t("backToApp")}
          </Link>
        </div>
      ) : wrongAccount ? (
        <div className="rounded-11 border border-border bg-background p-8 text-sm">
          <h2 className="font-display text-xl">{t("wrongAccountTitle")}</h2>
          <p className="mt-3 text-muted-foreground">
            {t("wrongAccountBody", {
              invitedEmail: invitation.email,
              currentEmail: session.user.email,
            })}
          </p>
        </div>
      ) : (
        <div className="space-y-4 rounded-11 border border-border bg-background p-8">
          <h2 className="font-display text-xl">
            {t("joinTitle", { org: invitation.organization.name })}
          </h2>
          <p className="text-sm text-muted-foreground">{t("joinBody")}</p>
          <AcceptInviteButton invitationId={id} />
          <p className="text-center text-xs text-muted-foreground">
            {t("emailLabel", { email: invitation.email })}
          </p>
        </div>
      )}
    </div>
  );
}
