import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgContentStudio } from "@/lib/corporate";
import {
  updateOrgTitle,
  toggleOrgPublish,
  deleteOrgTitle,
  addOrgEpisode,
  updateOrgEpisode,
  deleteOrgEpisode,
  setOrgTitleDepartments,
  addOrgCredit,
  removeOrgCredit,
} from "../actions";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { AddEpisodeForm } from "@/components/editor/AddEpisodeForm";
import { VideoUpload } from "@/components/editor/VideoUpload";
import { ImageUpload } from "@/components/editor/ImageUpload";
import { ConfirmButton } from "@/components/editor/ConfirmButton";
import { formatDuration } from "@/lib/utils";

export default async function OrgContentDetail({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { membership } = await requireOrgContentStudio();

  const [t, te, title, departments, orgInstructors] = await Promise.all([
    getTranslations("organization"),
    getTranslations("editor"),
    prisma.title.findUnique({
      where: { id },
      include: {
        category: { include: { parent: true } },
        episodes: {
          orderBy: [{ seasonNumber: "asc" }, { episodeNumber: "asc" }],
        },
        departmentAudience: { select: { departmentId: true } },
        credits: { include: { instructor: true } },
      },
    }),
    prisma.department.findMany({
      where: { organizationId: membership.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.instructor.findMany({
      where: { createdByOrgId: membership.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!title || title.createdByOrgId !== membership.organizationId) notFound();

  const creditedIds = new Set(title.credits.map((c) => c.instructorId));
  const assignableInstructors = orgInstructors.filter(
    (i) => !creditedIds.has(i.id),
  );

  const targetedDepartmentIds = new Set(
    title.departmentAudience.map((d) => d.departmentId),
  );

  const nextEpisodeNumber =
    (title.episodes[title.episodes.length - 1]?.episodeNumber ?? 0) + 1;

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/app/organization/content"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            ← {t("contentStudio")}
          </Link>
          <h1 className="mt-2 text-3xl md:text-5xl">{title.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {title.category.parent?.title ?? title.category.title}
            {title.category.parent ? ` / ${title.category.title}` : null} ·{" "}
            {title.type === "SERIES"
              ? te("formTypeSeries")
              : te("formTypeMovie")}{" "}
            · {title.published ? te("statusPublished") : te("statusDraft")} ·{" "}
            {t("contentOrgOnly")}
          </p>
        </div>
        <form action={toggleOrgPublish}>
          <input type="hidden" name="id" value={title.id} />
          <Button type="submit" variant={title.published ? "secondary" : "dark"}>
            {title.published ? te("publishToggleOff") : te("publishToggleOn")}
          </Button>
        </form>
      </header>

      <section className="rounded-11 border border-border/60 bg-background p-6">
        <h2 className="font-display text-2xl">{te("basicInfo")}</h2>
        <form action={updateOrgTitle} className="mt-6 space-y-5">
          <input type="hidden" name="id" value={title.id} />
          <div>
            <Label htmlFor="title">{te("formTitle")}</Label>
            <Input id="title" name="title" defaultValue={title.title} />
          </div>
          <div>
            <Label htmlFor="synopsis">{te("formSynopsis")}</Label>
            <Textarea
              id="synopsis"
              name="synopsis"
              defaultValue={title.synopsis}
              rows={4}
            />
          </div>
          <div>
            <Label>{te("heroImage")}</Label>
            <ImageUpload
              name="heroImageUrl"
              defaultValue={title.heroImageUrl ?? ""}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {te("heroImageHint")}
            </p>
          </div>
          <Button type="submit" variant="dark">
            {te("saved")}
          </Button>
        </form>
      </section>

      {departments.length > 0 ? (
        <section className="rounded-11 border border-border/60 bg-background p-6">
          <h2 className="font-display text-2xl">{t("contentAudience")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("contentAudienceBody")}
          </p>
          <form action={setOrgTitleDepartments} className="mt-4 space-y-4">
            <input type="hidden" name="id" value={title.id} />
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {departments.map((d) => (
                <label
                  key={d.id}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="departmentIds"
                    value={d.id}
                    defaultChecked={targetedDepartmentIds.has(d.id)}
                    className="h-4 w-4 accent-foreground"
                  />
                  {d.name}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {targetedDepartmentIds.size === 0
                ? t("contentAllCompanyNow")
                : null}
            </p>
            <Button type="submit" variant="secondary">
              {te("saved")}
            </Button>
          </form>
        </section>
      ) : null}

      <section className="rounded-11 border border-border/60 bg-background p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl">{te("instructors")}</h2>
          <Link
            href="/app/organization/content/instructors"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            {te("manageInstructors")} →
          </Link>
        </div>
        {orgInstructors.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {te("noInstructorsYet")}
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {title.credits.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {te("noCredits")}
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
                    <form action={removeOrgCredit} className="inline-flex">
                      <input type="hidden" name="titleId" value={title.id} />
                      <input
                        type="hidden"
                        name="instructorId"
                        value={c.instructorId}
                      />
                      <button
                        type="submit"
                        title={te("delete")}
                        className="text-red-600 hover:text-red-700"
                      >
                        ×
                      </button>
                    </form>
                  </span>
                ))
              )}
            </div>
            {assignableInstructors.length > 0 ? (
              <form
                action={addOrgCredit}
                className="mt-4 flex flex-wrap items-end gap-3"
              >
                <input type="hidden" name="titleId" value={title.id} />
                <div>
                  <Label htmlFor="instructorId">{te("instructor")}</Label>
                  <select
                    id="instructorId"
                    name="instructorId"
                    required
                    className="block rounded-11 border border-border bg-background px-3 py-2 text-sm"
                  >
                    {assignableInstructors.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="creditRole">{te("creditRole")}</Label>
                  <Input
                    id="creditRole"
                    name="role"
                    placeholder={te("creditRolePlaceholder")}
                  />
                </div>
                <Button type="submit" variant="secondary">
                  {te("addInstructor")}
                </Button>
              </form>
            ) : null}
          </>
        )}
      </section>

      <section className="rounded-11 border border-border/60 bg-background p-6">
        <h2 className="font-display text-2xl">{te("episodes")}</h2>
        <div className="mt-4 divide-y divide-border/70">
          {title.episodes.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              {te("noEpisodes")}
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
                      {formatDuration(ep.durationSec)} · {te("preview")}:{" "}
                      {ep.previewSec}s
                    </p>
                  </div>
                  <form action={deleteOrgEpisode}>
                    <input type="hidden" name="id" value={ep.id} />
                    <input type="hidden" name="titleId" value={title.id} />
                    <ConfirmButton
                      confirmText={te("deleteEpisodeConfirm", {
                        name: ep.name,
                      })}
                      className="shrink-0 text-xs text-red-600 underline-offset-4 hover:underline"
                    >
                      {te("delete")}
                    </ConfirmButton>
                  </form>
                </div>

                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    {te("editEpisode")}
                  </summary>
                  <form
                    action={updateOrgEpisode}
                    className="mt-3 space-y-4 rounded-11 border border-border/60 bg-muted/30 p-4"
                  >
                    <input type="hidden" name="id" value={ep.id} />
                    <input type="hidden" name="titleId" value={title.id} />
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <Label htmlFor={`season-${ep.id}`}>
                          {te("season")}
                        </Label>
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
                          {te("episodeNumber")}
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
                        <Label htmlFor={`prev-${ep.id}`}>
                          {te("preview")}
                        </Label>
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
                        {te("episodeName")}
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
                        {te("formSynopsis")}
                      </Label>
                      <Textarea
                        id={`syn-${ep.id}`}
                        name="synopsis"
                        defaultValue={ep.synopsis ?? ""}
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>{te("replaceVideo")}</Label>
                      {/* New file also refreshes durationSec from metadata. */}
                      <VideoUpload name="videoPath" durationName="durationSec" />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {te("replaceVideoHint")}
                      </p>
                    </div>
                    <Button type="submit" variant="dark">
                      {te("saved")}
                    </Button>
                  </form>
                </details>
              </div>
            ))
          )}
        </div>

        <AddEpisodeForm
          action={addOrgEpisode}
          titleId={title.id}
          nextEpisodeNumber={nextEpisodeNumber}
        />
      </section>

      <section className="rounded-11 border border-border/60 bg-background p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-2xl">{t("contentDelete")}</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {t("contentDeleteBody")}
            </p>
          </div>
          <form action={deleteOrgTitle} className="shrink-0">
            <input type="hidden" name="id" value={title.id} />
            <ConfirmButton
              confirmTitle={t("contentDelete")}
              confirmText={t("contentDeleteConfirm", { name: title.title })}
              confirmLabel={t("contentDelete")}
              className="rounded-11 border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30"
            >
              {t("contentDelete")}
            </ConfirmButton>
          </form>
        </div>
      </section>
    </div>
  );
}
