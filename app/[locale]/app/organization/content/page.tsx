import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgContentStudio } from "@/lib/corporate";
import { createOrgTitle } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";

export default async function OrgContentPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { membership } = await requireOrgContentStudio();

  const orgId = membership.organizationId;
  const [t, te, titles, assignedTitles, categories, departments] =
    await Promise.all([
      getTranslations("organization"),
      getTranslations("editor"),
      prisma.title.findMany({
        where: { createdByOrgId: orgId },
        orderBy: { createdAt: "desc" },
        include: {
          category: { include: { parent: true } },
          departmentAudience: {
            include: { department: { select: { name: true } } },
          },
          _count: { select: { episodes: true } },
        },
      }),
      // Titles Busyflix assigned to this company from the editor panel —
      // shown read-only so the owner sees the full company catalog.
      prisma.title.findMany({
        where: {
          visibility: "ORG_ONLY",
          orgAudience: { some: { organizationId: orgId } },
          OR: [
            { createdByOrgId: null },
            { createdByOrgId: { not: orgId } },
          ],
        },
        orderBy: { createdAt: "desc" },
        include: {
          category: { include: { parent: true } },
          _count: { select: { episodes: true } },
        },
      }),
      prisma.category.findMany({
        where: { parentId: { not: null } },
        orderBy: [{ section: "asc" }, { title: "asc" }],
        include: { parent: true },
      }),
      prisma.department.findMany({
        where: { organizationId: orgId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-accent text-lg text-muted-foreground">
            {t("kicker")}
          </span>
          <h1 className="mt-1 text-3xl md:text-5xl">{t("contentStudio")}</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            {t("contentBody")}
          </p>
        </div>
        <Link
          href="/app/organization/content/instructors"
          className="inline-flex h-11 items-center rounded-11 border border-border bg-background px-5 text-sm font-medium transition-colors hover:bg-muted"
        >
          {te("instructors")} →
        </Link>
      </header>

      <section>
        <h2 className="font-display text-2xl">{t("contentList")}</h2>
        <div className="mt-4 space-y-3">
          {titles.length === 0 ? (
            <p className="rounded-11 border border-border/60 bg-background px-4 py-6 text-center text-sm text-muted-foreground">
              {t("contentEmpty")}
            </p>
          ) : (
            titles.map((title) => (
              <Link
                key={title.id}
                href={`/app/organization/content/${title.id}`}
                className="flex items-center justify-between gap-4 rounded-11 border border-border/60 bg-background p-5 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{title.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {title.category.parent?.title ?? title.category.title}
                    {title.category.parent
                      ? ` / ${title.category.title}`
                      : null}{" "}
                    ·{" "}
                    {title.type === "SERIES"
                      ? te("formTypeSeries")
                      : te("formTypeMovie")}{" "}
                    · {title._count.episodes} {te("episodes").toLowerCase()} ·{" "}
                    {title.departmentAudience.length === 0
                      ? t("contentAllCompany")
                      : title.departmentAudience
                          .map((d) => d.department.name)
                          .join(", ")}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-11 px-2.5 py-1 text-xs font-medium ${
                    title.published
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {title.published
                    ? te("statusPublished")
                    : te("statusDraft")}
                </span>
              </Link>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl">{t("contentAssigned")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("contentAssignedBody")}
        </p>
        <div className="mt-4 space-y-3">
          {assignedTitles.length === 0 ? (
            <p className="rounded-11 border border-border/60 bg-background px-4 py-6 text-center text-sm text-muted-foreground">
              {t("contentAssignedEmpty")}
            </p>
          ) : (
            assignedTitles.map((title) => (
              <div
                key={title.id}
                className="flex items-center justify-between gap-4 rounded-11 border border-border/60 bg-background p-5"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{title.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {title.category.parent?.title ?? title.category.title}
                    {title.category.parent
                      ? ` / ${title.category.title}`
                      : null}{" "}
                    ·{" "}
                    {title.type === "SERIES"
                      ? te("formTypeSeries")
                      : te("formTypeMovie")}{" "}
                    · {title._count.episodes} {te("episodes").toLowerCase()}
                  </p>
                </div>
                <span className="shrink-0 rounded-11 bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {t("contentAssignedBadge")}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl">{t("newContent")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("newContentBody")}
        </p>
        <form
          action={createOrgTitle}
          className="mt-5 space-y-5 rounded-11 border border-border/60 bg-background p-6"
        >
          <div>
            <Label htmlFor="title">{te("formTitle")}</Label>
            <Input id="title" name="title" required />
          </div>
          <div>
            <Label htmlFor="synopsis">{te("formSynopsis")}</Label>
            <Textarea id="synopsis" name="synopsis" rows={4} required />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="type">{te("formType")}</Label>
              <select
                id="type"
                name="type"
                className="h-11 w-full rounded-11 border border-border bg-background px-3 text-sm"
                defaultValue="SERIES"
              >
                <option value="SERIES">{te("formTypeSeries")}</option>
                <option value="MOVIE">{te("formTypeMovie")}</option>
              </select>
            </div>
            <div>
              <Label htmlFor="categoryId">{te("categoryLabel")}</Label>
              <select
                id="categoryId"
                name="categoryId"
                className="h-11 w-full rounded-11 border border-border bg-background px-3 text-sm"
                required
              >
                <option value="">{te("formSelectCategory")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent?.title} / {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {departments.length > 0 ? (
            <div>
              <Label>{t("contentAudience")}</Label>
              <p className="mb-2 text-xs text-muted-foreground">
                {t("contentAudienceBody")}
              </p>
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
                      className="h-4 w-4 accent-foreground"
                    />
                    {d.name}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <Button type="submit" variant="dark" size="lg">
            {te("formCreate")}
          </Button>
        </form>
      </section>
    </div>
  );
}
