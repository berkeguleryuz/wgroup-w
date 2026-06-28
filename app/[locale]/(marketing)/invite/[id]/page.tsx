import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { localizedPath, type Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { getSession } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { AcceptInviteButton } from "./AcceptInviteButton";
import { SwitchAccountButton } from "./SwitchAccountButton";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("invite");
  const session = await getSession();

  const invitation = await prisma.invitation.findUnique({
    where: { id },
    include: { organization: { select: { name: true } } },
  });

  const isExpired = !invitation || invitation.expiresAt < new Date();
  const isPending = invitation?.status === "pending";

  if (!session) {
    const next = `/invite/${id}`;
    // For a live invite, route the visitor straight to the right auth screen
    // with the invited email pre-filled and locked — register if they have no
    // account yet, login if they already do — so they can never authenticate
    // with the wrong address and hit the "wrong account" wall below.
    if (invitation && !isExpired && isPending) {
      const existing = await prisma.user.findFirst({
        where: { email: { equals: invitation.email, mode: "insensitive" } },
        select: { id: true },
      });
      const target = existing ? "/login" : "/register";
      redirect(
        `${localizedPath(locale, target)}?next=${encodeURIComponent(
          next,
        )}&email=${encodeURIComponent(invitation.email)}`,
      );
    }
    // Invalid/expired invite — fall back to login; the proper state renders
    // once they are authenticated.
    redirect(
      `${localizedPath(locale, "/login")}?next=${encodeURIComponent(next)}`,
    );
  }

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
          <SwitchAccountButton invitePath={`/invite/${id}`} />
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
