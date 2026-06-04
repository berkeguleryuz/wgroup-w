import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { updateTag } from "next/cache";

import { localizedPath, type Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { AddEpisodeForm } from "@/components/editor/AddEpisodeForm";
import { SubtitleUpload } from "@/components/editor/SubtitleUpload";
import { formatDuration } from "@/lib/utils";

const LANG_LABELS: Record<string, string> = {
  tr: "Türkçe",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  ar: "العربية",
};

async function updateTitle(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const id = String(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  const synopsis = String(formData.get("synopsis") || "").trim();
  const heroImageUrl = String(formData.get("heroImageUrl") || "").trim() || null;
  const trailerUrl = String(formData.get("trailerUrl") || "").trim() || null;

  await prisma.title.update({
    where: { id },
    data: { title, synopsis, heroImageUrl, trailerUrl },
  });
  updateTag("featured-titles");
  const locale = await getLocale();
  redirect(localizedPath(locale, `/app/editor/titles/${id}`));
}

async function togglePublish(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const id = String(formData.get("id"));
  const current = await prisma.title.findUnique({ where: { id } });
  if (!current) return;
  await prisma.title.update({
    where: { id },
    data: {
      published: !current.published,
      publishedAt: !current.published ? new Date() : current.publishedAt,
    },
  });
  updateTag("featured-titles");
  const locale = await getLocale();
  redirect(localizedPath(locale, `/app/editor/titles/${id}`));
}

async function addEpisode(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const titleId = String(formData.get("titleId"));
  const name = String(formData.get("name") || "").trim();
  const seasonNumber = Number(formData.get("seasonNumber") || 1);
  const episodeNumber = Number(formData.get("episodeNumber") || 1);
  const durationSec = Number(formData.get("durationSec") || 0);
  const previewSec = Number(formData.get("previewSec") || 0);
  const videoPath = String(formData.get("videoPath") || "").trim();

  if (!name || !videoPath) throw new Error("Missing fields");

  await prisma.episode.create({
    data: {
      titleId,
      name,
      seasonNumber,
      episodeNumber,
      durationSec,
      previewSec,
      videoPath,
    },
  });
  updateTag("featured-titles");
  const locale = await getLocale();
  redirect(localizedPath(locale, `/app/editor/titles/${titleId}`));
}

async function addSubtitle(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const titleId = String(formData.get("titleId"));
  const episodeId = String(formData.get("episodeId"));
  const lang = String(formData.get("lang") || "").trim().toLowerCase();
  const vttPath = String(formData.get("vttPath") || "").trim();
  if (!episodeId || !lang || !vttPath) throw new Error("Missing fields");

  const label = LANG_LABELS[lang] ?? lang.toUpperCase();
  await prisma.subtitle.upsert({
    where: { episodeId_lang: { episodeId, lang } },
    create: { episodeId, lang, label, vttPath },
    update: { vttPath, label },
  });
  const locale = await getLocale();
  redirect(localizedPath(locale, `/app/editor/titles/${titleId}`));
}

async function deleteSubtitle(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const id = String(formData.get("id"));
  const titleId = String(formData.get("titleId"));
  await prisma.subtitle.delete({ where: { id } });
  const locale = await getLocale();
  redirect(localizedPath(locale, `/app/editor/titles/${titleId}`));
}

export default async function EditorTitleDetail({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireRole(["platform_editor", "admin"]);
  const [t, title] = await Promise.all([
    getTranslations("editor"),
    prisma.title.findUnique({
      where: { id },
      include: {
        category: { include: { parent: true } },
        episodes: {
          orderBy: [{ seasonNumber: "asc" }, { episodeNumber: "asc" }],
          include: { subtitles: { orderBy: { label: "asc" } } },
        },
      },
    }),
  ]);
  if (!title) notFound();

  const nextEpisodeNumber =
    (title.episodes[title.episodes.length - 1]?.episodeNumber ?? 0) + 1;

  return (
    <div className="space-y-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <Link
            href="/app/editor/titles"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            ← {t("titles")}
          </Link>
          <h1 className="mt-2 text-3xl md:text-5xl">{title.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {title.category.parent?.title ?? title.category.title}
            {title.category.parent ? ` / ${title.category.title}` : null} ·{" "}
            {title.type === "SERIES"
              ? t("formTypeSeries")
              : t("formTypeMovie")}{" "}
            ·{" "}
            {title.published ? t("statusPublished") : t("statusDraft")}
          </p>
        </div>
        <form action={togglePublish}>
          <input type="hidden" name="id" value={title.id} />
          <Button
            type="submit"
            variant={title.published ? "secondary" : "dark"}
          >
            {title.published ? t("publishToggleOff") : t("publishToggleOn")}
          </Button>
        </form>
      </header>

      <section className="rounded-11 border border-border/60 bg-background p-6">
        <h2 className="font-display text-2xl">{t("basicInfo")}</h2>
        <form action={updateTitle} className="mt-6 space-y-5">
          <input type="hidden" name="id" value={title.id} />
          <div>
            <Label htmlFor="title">{t("formTitle")}</Label>
            <Input id="title" name="title" defaultValue={title.title} />
          </div>
          <div>
            <Label htmlFor="synopsis">{t("formSynopsis")}</Label>
            <Textarea
              id="synopsis"
              name="synopsis"
              defaultValue={title.synopsis}
              rows={4}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="heroImageUrl">{t("heroImage")}</Label>
              <Input
                id="heroImageUrl"
                name="heroImageUrl"
                defaultValue={title.heroImageUrl ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="trailerUrl">{t("trailer")}</Label>
              <Input
                id="trailerUrl"
                name="trailerUrl"
                defaultValue={title.trailerUrl ?? ""}
              />
            </div>
          </div>
          <Button type="submit" variant="dark">
            {t("saved")}
          </Button>
        </form>
      </section>

      <section className="rounded-11 border border-border/60 bg-background p-6">
        <h2 className="font-display text-2xl">{t("episodes")}</h2>
        <div className="mt-4 divide-y divide-border/70">
          {title.episodes.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              {t("noEpisodes")}
            </p>
          ) : (
            title.episodes.map((ep) => (
              <div key={ep.id} className="py-3 text-sm">
                <p className="font-medium">
                  S{ep.seasonNumber}E{ep.episodeNumber} · {ep.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ep.videoPath} · {formatDuration(ep.durationSec)} ·{" "}
                  {t("preview")}: {ep.previewSec}s
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {t("subtitles")}:
                  </span>
                  {ep.subtitles.length === 0 ? (
                    <span className="text-xs text-muted-foreground/70">—</span>
                  ) : (
                    ep.subtitles.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs"
                      >
                        {s.label}
                        <form action={deleteSubtitle} className="inline-flex">
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="titleId" value={title.id} />
                          <button
                            type="submit"
                            title={t("delete")}
                            className="text-red-600 hover:text-red-700"
                          >
                            ×
                          </button>
                        </form>
                      </span>
                    ))
                  )}
                </div>

                <form
                  action={addSubtitle}
                  className="mt-2 flex flex-wrap items-center gap-2"
                >
                  <input type="hidden" name="titleId" value={title.id} />
                  <input type="hidden" name="episodeId" value={ep.id} />
                  <select
                    name="lang"
                    defaultValue="tr"
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  >
                    {Object.entries(LANG_LABELS).map(([code, label]) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <SubtitleUpload name="vttPath" required />
                  <button
                    type="submit"
                    className="rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background transition-colors hover:bg-foreground/90"
                  >
                    {t("addSubtitle")}
                  </button>
                </form>
              </div>
            ))
          )}
        </div>

        <AddEpisodeForm
          action={addEpisode}
          titleId={title.id}
          nextEpisodeNumber={nextEpisodeNumber}
        />
      </section>
    </div>
  );
}
