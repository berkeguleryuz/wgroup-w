import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { updateTag } from "next/cache";

import { localizedPath, type Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { cleanupStorageRefs } from "@/lib/storage-cleanup";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { AddEpisodeForm } from "@/components/editor/AddEpisodeForm";
import { SubtitleUpload } from "@/components/editor/SubtitleUpload";
import { VideoUpload } from "@/components/editor/VideoUpload";
import { ImageUpload } from "@/components/editor/ImageUpload";
import { TrailerUpload } from "@/components/editor/TrailerUpload";
import { ConfirmButton } from "@/components/editor/ConfirmButton";
import { formatDuration } from "@/lib/utils";

const LANG_LABELS: Record<string, string> = {
  tr: "Türkçe",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  ar: "العربية",
};

async function backToTitle(titleId: string, toast = "saved") {
  updateTag("featured-titles");
  const locale = await getLocale();
  // `?toast=<key>` is picked up client-side by the Toaster and shown once.
  redirect(localizedPath(locale, `/app/editor/titles/${titleId}?toast=${toast}`));
}

async function updateTitle(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const id = String(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  const synopsis = String(formData.get("synopsis") || "").trim();
  const heroImageUrl = String(formData.get("heroImageUrl") || "").trim() || null;
  const trailerUrl = String(formData.get("trailerUrl") || "").trim() || null;

  const before = await prisma.title.findUnique({
    where: { id },
    select: { heroImageUrl: true, trailerUrl: true },
  });
  await prisma.title.update({
    where: { id },
    data: { title, synopsis, heroImageUrl, trailerUrl },
  });
  // Drop replaced media from storage once nothing references it.
  await cleanupStorageRefs([
    before?.heroImageUrl !== heroImageUrl ? before?.heroImageUrl : null,
    before?.trailerUrl !== trailerUrl ? before?.trailerUrl : null,
  ]);
  await backToTitle(id);
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
      // Manual publish/unpublish supersedes any pending schedule.
      scheduledFor: null,
    },
  });
  await backToTitle(id);
}

async function scheduleTitle(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const id = String(formData.get("id"));
  const raw = String(formData.get("scheduledFor") || "");
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) return;

  await prisma.title.update({
    where: { id },
    data: { scheduledFor: date, published: false },
  });
  await backToTitle(id);
}

async function cancelSchedule(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const id = String(formData.get("id"));
  await prisma.title.update({ where: { id }, data: { scheduledFor: null } });
  await backToTitle(id);
}

async function deleteTitle(formData: FormData) {
  "use server";
  // Deleting a whole training is admin-only; editors manage content but
  // cannot remove it (episodes + watch progress go with it).
  await requireRole(["admin"]);
  const id = String(formData.get("id"));
  const doomed = await prisma.title.findUnique({
    where: { id },
    include: {
      episodes: { select: { videoPath: true, subtitles: { select: { vttPath: true } } } },
    },
  });
  await prisma.title.delete({ where: { id } });
  if (doomed) {
    await cleanupStorageRefs([
      doomed.heroImageUrl,
      doomed.trailerUrl,
      ...doomed.episodes.flatMap((e) => [e.videoPath, ...e.subtitles.map((s) => s.vttPath)]),
    ]);
  }
  updateTag("featured-titles");
  const locale = await getLocale();
  redirect(localizedPath(locale, "/app/editor/titles?toast=deleted"));
}

async function addEpisode(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const titleId = String(formData.get("titleId"));
  const name = String(formData.get("name") || "").trim();
  const synopsis = String(formData.get("synopsis") || "").trim() || null;
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
      synopsis,
      seasonNumber,
      episodeNumber,
      durationSec,
      previewSec,
      videoPath,
    },
  });
  await backToTitle(titleId);
}

async function updateEpisode(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const id = String(formData.get("id"));
  const titleId = String(formData.get("titleId"));
  const name = String(formData.get("name") || "").trim();
  const synopsis = String(formData.get("synopsis") || "").trim() || null;
  const seasonNumber = Number(formData.get("seasonNumber") || 1);
  const episodeNumber = Number(formData.get("episodeNumber") || 1);
  // Only present when a replacement video was selected (measured client-side
  // from the file's metadata); absent = keep the stored duration.
  const durationRaw = String(formData.get("durationSec") ?? "").trim();
  const previewSec = Number(formData.get("previewSec") || 0);
  // Empty = keep the current video; the upload field is optional on edit.
  const videoPath = String(formData.get("videoPath") || "").trim();

  if (!name) throw new Error("Missing fields");

  const before = videoPath
    ? await prisma.episode.findUnique({ where: { id }, select: { videoPath: true } })
    : null;
  await prisma.episode.update({
    where: { id },
    data: {
      name,
      synopsis,
      seasonNumber,
      episodeNumber,
      previewSec,
      ...(durationRaw ? { durationSec: Number(durationRaw) } : {}),
      ...(videoPath ? { videoPath } : {}),
    },
  });
  // Drop the replaced video from storage once nothing references it.
  if (before && before.videoPath !== videoPath) {
    await cleanupStorageRefs([before.videoPath]);
  }
  await backToTitle(titleId);
}

async function deleteEpisode(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const id = String(formData.get("id"));
  const titleId = String(formData.get("titleId"));
  const doomed = await prisma.episode.findUnique({
    where: { id },
    include: { subtitles: { select: { vttPath: true } } },
  });
  await prisma.episode.delete({ where: { id } });
  if (doomed) {
    await cleanupStorageRefs([
      doomed.videoPath,
      ...doomed.subtitles.map((s) => s.vttPath),
    ]);
  }
  await backToTitle(titleId, "deleted");
}

async function setVisibility(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const id = String(formData.get("id"));
  const visibility =
    String(formData.get("visibility")) === "ORG_ONLY" ? "ORG_ONLY" : "PUBLIC";
  await prisma.title.update({ where: { id }, data: { visibility } });
  updateTag("featured-titles");
  await backToTitle(id);
}

async function addTitleOrg(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const titleId = String(formData.get("titleId"));
  const organizationId = String(formData.get("organizationId") || "");
  if (!organizationId) return;
  await prisma.titleOrganization.upsert({
    where: { titleId_organizationId: { titleId, organizationId } },
    create: { titleId, organizationId },
    update: {},
  });
  await backToTitle(titleId);
}

async function removeTitleOrg(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const titleId = String(formData.get("titleId"));
  const organizationId = String(formData.get("organizationId"));
  await prisma.titleOrganization.delete({
    where: { titleId_organizationId: { titleId, organizationId } },
  });
  await backToTitle(titleId);
}

async function addCredit(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const titleId = String(formData.get("titleId"));
  const instructorId = String(formData.get("instructorId") || "");
  const role = String(formData.get("role") || "").trim() || null;
  if (!instructorId) return;
  await prisma.titleInstructor.upsert({
    where: { titleId_instructorId: { titleId, instructorId } },
    create: { titleId, instructorId, role },
    update: { role },
  });
  await backToTitle(titleId);
}

async function removeCredit(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const titleId = String(formData.get("titleId"));
  const instructorId = String(formData.get("instructorId"));
  await prisma.titleInstructor.delete({
    where: { titleId_instructorId: { titleId, instructorId } },
  });
  await backToTitle(titleId);
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
  const before = await prisma.subtitle.findUnique({
    where: { episodeId_lang: { episodeId, lang } },
    select: { vttPath: true },
  });
  await prisma.subtitle.upsert({
    where: { episodeId_lang: { episodeId, lang } },
    create: { episodeId, lang, label, vttPath },
    update: { vttPath, label },
  });
  if (before && before.vttPath !== vttPath) {
    await cleanupStorageRefs([before.vttPath]);
  }
  await backToTitle(titleId);
}

async function deleteSubtitle(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const id = String(formData.get("id"));
  const titleId = String(formData.get("titleId"));
  const doomed = await prisma.subtitle.findUnique({
    where: { id },
    select: { vttPath: true },
  });
  await prisma.subtitle.delete({ where: { id } });
  await cleanupStorageRefs([doomed?.vttPath]);
  await backToTitle(titleId, "deleted");
}

export default async function EditorTitleDetail({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireRole(["platform_editor", "admin"]);
  const isAdmin =
    (session.user as { role?: string | null }).role === "admin";
  const [t, title, instructors, organizations] = await Promise.all([
    getTranslations("editor"),
    prisma.title.findUnique({
      where: { id },
      include: {
        category: { include: { parent: true } },
        episodes: {
          orderBy: [{ seasonNumber: "asc" }, { episodeNumber: "asc" }],
          include: { subtitles: { orderBy: { label: "asc" } } },
        },
        credits: { include: { instructor: true } },
        orgAudience: { include: { organization: { select: { id: true, name: true } } } },
      },
    }),
    prisma.instructor.findMany({ orderBy: { name: "asc" } }),
    prisma.organization.findMany({
      where: { companyProfile: { isNot: null } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!title) notFound();

  const audienceOrgIds = new Set(title.orgAudience.map((a) => a.organizationId));
  const assignableOrgs = organizations.filter((o) => !audienceOrgIds.has(o.id));

  const nextEpisodeNumber =
    (title.episodes[title.episodes.length - 1]?.episodeNumber ?? 0) + 1;
  const creditedIds = new Set(title.credits.map((c) => c.instructorId));
  // Company-scoped instructors are only assignable to that company's own
  // titles — keep them out of the pool for platform content.
  const assignable = instructors.filter(
    (i) =>
      !creditedIds.has(i.id) &&
      (i.createdByOrgId === null || i.createdByOrgId === title.createdByOrgId),
  );

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
            {title.published
              ? t("statusPublished")
              : title.scheduledFor
                ? t("statusScheduled")
                : t("statusDraft")}
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
              <Label>{t("heroImage")}</Label>
              <ImageUpload
                name="heroImageUrl"
                defaultValue={title.heroImageUrl ?? ""}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t("heroImageHint")}
              </p>
            </div>
            <div>
              <Label>{t("trailer")}</Label>
              <TrailerUpload
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
        <h2 className="font-display text-2xl">{t("scheduling")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("schedulingBody")}
        </p>
        {title.scheduledFor && !title.published ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-11 bg-muted px-3 py-1.5 text-sm">
              {t("scheduledForLabel")}:{" "}
              <strong>
                {title.scheduledFor.toLocaleString(
                  locale === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-US",
                )}
              </strong>
            </span>
            <form action={cancelSchedule}>
              <input type="hidden" name="id" value={title.id} />
              <button
                type="submit"
                className="text-xs text-red-600 underline-offset-4 hover:underline"
              >
                {t("cancelSchedule")}
              </button>
            </form>
          </div>
        ) : null}
        {!title.published ? (
          <form
            action={scheduleTitle}
            className="mt-4 flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="id" value={title.id} />
            <div>
              <Label htmlFor="scheduledFor">{t("publishDate")}</Label>
              <Input
                id="scheduledFor"
                name="scheduledFor"
                type="datetime-local"
                required
              />
            </div>
            <Button type="submit" variant="secondary">
              {t("schedule")}
            </Button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            {t("schedulingAlreadyPublished")}
          </p>
        )}
      </section>

      <section className="rounded-11 border border-border/60 bg-background p-6">
        <h2 className="font-display text-2xl">{t("audience")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("audienceBody")}
        </p>
        <form action={setVisibility} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={title.id} />
          <div>
            <Label htmlFor="visibility">{t("visibility")}</Label>
            <select
              id="visibility"
              name="visibility"
              defaultValue={title.visibility}
              className="block h-11 rounded-11 border border-border bg-background px-3 text-sm"
            >
              <option value="PUBLIC">{t("visibilityPublic")}</option>
              <option value="ORG_ONLY">{t("visibilityOrgOnly")}</option>
            </select>
          </div>
          <Button type="submit" variant="secondary">
            {t("saved")}
          </Button>
        </form>

        {title.visibility === "ORG_ONLY" ? (
          <div className="mt-5 border-t border-border/60 pt-5">
            <p className="text-sm font-medium">{t("assignedCompanies")}</p>
            {organizations.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {t("noCompaniesYet")}
              </p>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {title.orgAudience.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("noAssignedCompanies")}
                    </p>
                  ) : (
                    title.orgAudience.map((a) => (
                      <span
                        key={a.organizationId}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-sm"
                      >
                        {a.organization.name}
                        <form action={removeTitleOrg} className="inline-flex">
                          <input type="hidden" name="titleId" value={title.id} />
                          <input
                            type="hidden"
                            name="organizationId"
                            value={a.organizationId}
                          />
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
                {assignableOrgs.length > 0 ? (
                  <form
                    action={addTitleOrg}
                    className="mt-4 flex flex-wrap items-end gap-3"
                  >
                    <input type="hidden" name="titleId" value={title.id} />
                    <div>
                      <Label htmlFor="organizationId">{t("company")}</Label>
                      <select
                        id="organizationId"
                        name="organizationId"
                        required
                        className="block h-11 rounded-11 border border-border bg-background px-3 text-sm"
                      >
                        {assignableOrgs.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button type="submit" variant="secondary">
                      {t("assignCompany")}
                    </Button>
                  </form>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </section>

      <section className="rounded-11 border border-border/60 bg-background p-6">
        <h2 className="font-display text-2xl">{t("instructors")}</h2>
        {instructors.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {t("noInstructorsYet")}{" "}
            <Link
              href="/app/editor/instructors"
              className="underline underline-offset-4"
            >
              {t("manageInstructors")}
            </Link>
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {title.credits.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("noCredits")}
                </p>
              ) : (
                title.credits.map((c) => (
                  <span
                    key={c.instructorId}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-sm"
                  >
                    {c.instructor.name}
                    {c.role ? (
                      <span className="text-xs text-muted-foreground">
                        · {c.role}
                      </span>
                    ) : null}
                    <form action={removeCredit} className="inline-flex">
                      <input type="hidden" name="titleId" value={title.id} />
                      <input
                        type="hidden"
                        name="instructorId"
                        value={c.instructorId}
                      />
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
            {assignable.length > 0 ? (
              <form
                action={addCredit}
                className="mt-4 flex flex-wrap items-end gap-3"
              >
                <input type="hidden" name="titleId" value={title.id} />
                <div>
                  <Label htmlFor="instructorId">{t("instructor")}</Label>
                  <select
                    id="instructorId"
                    name="instructorId"
                    required
                    className="block rounded-11 border border-border bg-background px-3 py-2 text-sm"
                  >
                    {assignable.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="creditRole">{t("creditRole")}</Label>
                  <Input
                    id="creditRole"
                    name="role"
                    placeholder={t("creditRolePlaceholder")}
                  />
                </div>
                <Button type="submit" variant="secondary">
                  {t("addInstructor")}
                </Button>
              </form>
            ) : null}
          </>
        )}
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
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      S{ep.seasonNumber}E{ep.episodeNumber} · {ep.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ep.videoPath} · {formatDuration(ep.durationSec)} ·{" "}
                      {t("preview")}: {ep.previewSec}s
                    </p>
                  </div>
                  <form action={deleteEpisode}>
                    <input type="hidden" name="id" value={ep.id} />
                    <input type="hidden" name="titleId" value={title.id} />
                    <ConfirmButton
                      confirmText={t("deleteEpisodeConfirm", {
                        name: ep.name,
                      })}
                      className="shrink-0 text-xs text-red-600 underline-offset-4 hover:underline"
                    >
                      {t("delete")}
                    </ConfirmButton>
                  </form>
                </div>

                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    {t("editEpisode")}
                  </summary>
                  <form
                    action={updateEpisode}
                    className="mt-3 space-y-4 rounded-11 border border-border/60 bg-muted/30 p-4"
                  >
                    <input type="hidden" name="id" value={ep.id} />
                    <input type="hidden" name="titleId" value={title.id} />
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <Label htmlFor={`season-${ep.id}`}>{t("season")}</Label>
                        <Input
                          id={`season-${ep.id}`}
                          name="seasonNumber"
                          type="number"
                          min={1}
                          defaultValue={ep.seasonNumber}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`epno-${ep.id}`}>
                          {t("episodeNumber")}
                        </Label>
                        <Input
                          id={`epno-${ep.id}`}
                          name="episodeNumber"
                          type="number"
                          min={1}
                          defaultValue={ep.episodeNumber}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`prev-${ep.id}`}>{t("preview")}</Label>
                        <Input
                          id={`prev-${ep.id}`}
                          name="previewSec"
                          type="number"
                          min={0}
                          defaultValue={ep.previewSec}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`name-${ep.id}`}>
                        {t("episodeName")}
                      </Label>
                      <Input
                        id={`name-${ep.id}`}
                        name="name"
                        defaultValue={ep.name}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor={`syn-${ep.id}`}>
                        {t("formSynopsis")}
                      </Label>
                      <Textarea
                        id={`syn-${ep.id}`}
                        name="synopsis"
                        defaultValue={ep.synopsis ?? ""}
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>{t("replaceVideo")}</Label>
                      {/* New file also refreshes durationSec from metadata. */}
                      <VideoUpload name="videoPath" durationName="durationSec" />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("replaceVideoHint")}
                      </p>
                    </div>
                    <Button type="submit" variant="dark">
                      {t("saved")}
                    </Button>
                  </form>
                </details>

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

      {isAdmin ? (
        <section className="rounded-11 border border-border/60 bg-background p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-2xl">{t("deleteTitle")}</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {t("deleteTitleBody")}
              </p>
            </div>
            <form action={deleteTitle} className="shrink-0">
              <input type="hidden" name="id" value={title.id} />
              <ConfirmButton
                confirmTitle={t("deleteTitle")}
                confirmText={t("deleteTitleConfirm", { name: title.title })}
                confirmLabel={t("deleteTitle")}
                className="rounded-11 border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30"
              >
                {t("deleteTitle")}
              </ConfirmButton>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  );
}
