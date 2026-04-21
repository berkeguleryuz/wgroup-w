import { redirect } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { updateTag } from "next/cache";

import { localizedPath, type Locale } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { slugify } from "@/lib/utils";
import { TitleType } from "@prisma/client";

async function createTitle(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);

  const title = String(formData.get("title") || "").trim();
  const synopsis = String(formData.get("synopsis") || "").trim();
  const type = String(formData.get("type") || "SERIES") as TitleType;
  const categoryId = String(formData.get("categoryId") || "");
  if (!title || !synopsis || !categoryId) throw new Error("Missing fields");

  const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`;
  const created = await prisma.title.create({
    data: { slug, title, synopsis, type, categoryId, published: false },
  });
  updateTag("featured-titles");
  const locale = await getLocale();
  redirect(localizedPath(locale, `/app/editor/titles/${created.id}`));
}

export default async function NewTitlePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole(["platform_editor", "admin"]);
  const [t, categories] = await Promise.all([
    getTranslations("editor"),
    prisma.category.findMany({
      where: { parentId: { not: null } },
      orderBy: [{ section: "asc" }, { title: "asc" }],
      include: { parent: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-3xl md:text-5xl">{t("newTitle")}</h1>
      </header>

      <form
        action={createTitle}
        className="space-y-5 rounded-11 border border-border/60 bg-background p-6"
      >
        <div>
          <Label htmlFor="title">{t("formTitle")}</Label>
          <Input id="title" name="title" required />
        </div>
        <div>
          <Label htmlFor="synopsis">{t("formSynopsis")}</Label>
          <Textarea id="synopsis" name="synopsis" rows={4} required />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="type">{t("formType")}</Label>
            <select
              id="type"
              name="type"
              className="h-11 w-full rounded-11 border border-border bg-background px-3 text-sm"
              defaultValue="SERIES"
            >
              <option value="SERIES">{t("formTypeSeries")}</option>
              <option value="MOVIE">{t("formTypeMovie")}</option>
            </select>
          </div>
          <div>
            <Label htmlFor="categoryId">{t("categoryLabel")}</Label>
            <select
              id="categoryId"
              name="categoryId"
              className="h-11 w-full rounded-11 border border-border bg-background px-3 text-sm"
              required
            >
              <option value="">{t("formSelectCategory")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent?.title} / {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button type="submit" variant="dark" size="lg">
          {t("formCreate")}
        </Button>
      </form>
    </div>
  );
}
