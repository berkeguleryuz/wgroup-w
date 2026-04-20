import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import { localizedPath, type Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
              <div
                key={ep.id}
                className="flex items-center justify-between py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    S{ep.seasonNumber}E{ep.episodeNumber} · {ep.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ep.videoPath} · {formatDuration(ep.durationSec)} ·{" "}
                    {t("preview")}: {ep.previewSec}s
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <form
          action={addEpisode}
          className="mt-8 space-y-4 rounded-11 border border-border p-5"
        >
          <h3 className="font-semibold">{t("newEpisode")}</h3>
          <input type="hidden" name="titleId" value={title.id} />
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="seasonNumber">{t("season")}</Label>
              <Input
                id="seasonNumber"
                name="seasonNumber"
                type="number"
                defaultValue={1}
                min={1}
              />
            </div>
            <div>
              <Label htmlFor="episodeNumber">{t("episodeNumber")}</Label>
              <Input
                id="episodeNumber"
                name="episodeNumber"
                type="number"
                defaultValue={nextEpisodeNumber}
                min={1}
              />
            </div>
            <div>
              <Label htmlFor="durationSec">{t("duration")}</Label>
              <Input
                id="durationSec"
                name="durationSec"
                type="number"
                min={0}
                defaultValue={0}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="name">{t("episodeName")}</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="videoPath">{t("videoPath")}</Label>
              <Input
                id="videoPath"
                name="videoPath"
                placeholder={`${title.slug}/s1-eX.mp4`}
                required
              />
            </div>
            <div>
              <Label htmlFor="previewSec">{t("preview")}</Label>
              <Input
                id="previewSec"
                name="previewSec"
                type="number"
                min={0}
                defaultValue={60}
              />
            </div>
          </div>
          <Button type="submit" variant="dark">
            {t("addEpisode")}
          </Button>
        </form>
      </section>
    </div>
  );
}
