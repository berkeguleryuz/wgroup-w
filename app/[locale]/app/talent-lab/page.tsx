import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { localizedPath, type Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireSubscriber } from "@/lib/access";
import { TalentLabChat } from "@/components/app/TalentLabChat";
import { ConfirmButton } from "@/components/editor/ConfirmButton";

async function deleteConversation(formData: FormData) {
  "use server";
  const { session } = await requireSubscriber();
  const id = String(formData.get("id"));
  await prisma.agentConversation.deleteMany({
    where: { id, userId: session.user.id },
  });
  const locale = await getLocale();
  redirect(localizedPath(locale, "/app/talent-lab"));
}

export default async function TalentLabPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const [{ locale }, { c }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const [t, { session }] = await Promise.all([
    getTranslations("talentLab"),
    requireSubscriber(),
  ]);
  const userId = session.user.id;

  const [conversations, active] = await Promise.all([
    prisma.agentConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, title: true, updatedAt: true },
    }),
    c
      ? prisma.agentConversation.findFirst({
          where: { id: c, userId },
          include: {
            messages: { orderBy: { createdAt: "asc" }, take: 200 },
          },
        })
      : null,
  ]);

  const initialMessages =
    active?.messages.map((m) => ({
      id: m.id,
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    })) ?? [];

  return (
    <div className="space-y-8">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-3xl md:text-5xl">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-11 border border-border/60 bg-background p-4">
          <Link
            href="/app/talent-lab"
            className="block rounded-11 bg-foreground px-3 py-2 text-center text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            {t("newChat")}
          </Link>
          <p className="mb-1 mt-4 px-1 text-xs uppercase tracking-wide text-muted-foreground">
            {t("history")}
          </p>
          {conversations.length === 0 ? (
            <p className="px-1 py-2 text-xs text-muted-foreground/70">
              {t("noHistory")}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((conv) => (
                <li key={conv.id} className="group flex items-center gap-1">
                  <Link
                    href={`/app/talent-lab?c=${conv.id}`}
                    className={`block min-w-0 flex-1 truncate rounded-11 px-3 py-2 text-sm hover:bg-muted ${
                      active?.id === conv.id ? "bg-muted font-medium" : ""
                    }`}
                  >
                    {conv.title}
                  </Link>
                  <form action={deleteConversation}>
                    <input type="hidden" name="id" value={conv.id} />
                    <ConfirmButton
                      confirmText={t("deleteConfirm")}
                      className="px-1 text-muted-foreground/50 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                    >
                      ×
                    </ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <TalentLabChat
          key={active?.id ?? "new"}
          conversationId={active?.id ?? null}
          initialMessages={initialMessages}
        />
      </div>

      <p className="text-xs text-muted-foreground/70">{t("disclaimer")}</p>
    </div>
  );
}
