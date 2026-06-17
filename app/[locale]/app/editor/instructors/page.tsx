import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { localizedPath, type Locale } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { ImageUpload } from "@/components/editor/ImageUpload";
import { ConfirmButton } from "@/components/editor/ConfirmButton";

async function backToList() {
  const locale = await getLocale();
  redirect(localizedPath(locale, "/app/editor/instructors"));
}

async function createInstructor(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const name = String(formData.get("name") || "").trim();
  const bio = String(formData.get("bio") || "").trim() || null;
  const photoUrl = String(formData.get("photoUrl") || "").trim() || null;
  if (!name) throw new Error("Missing fields");

  await prisma.instructor.create({ data: { name, bio, photoUrl } });
  await backToList();
}

async function updateInstructor(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const bio = String(formData.get("bio") || "").trim() || null;
  const photoUrl = String(formData.get("photoUrl") || "").trim() || null;
  if (!name) throw new Error("Missing fields");

  await prisma.instructor.update({ where: { id }, data: { name, bio, photoUrl } });
  await backToList();
}

async function deleteInstructor(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const id = String(formData.get("id"));
  await prisma.instructor.delete({ where: { id } });
  await backToList();
}

export default async function EditorInstructorsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole(["platform_editor", "admin"]);
  const [t, instructors] = await Promise.all([
    getTranslations("editor"),
    prisma.instructor.findMany({
      orderBy: { name: "asc" },
      include: { credits: { include: { title: { select: { title: true } } } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-3xl md:text-5xl">{t("instructors")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("instructorsBody")}
        </p>
      </header>

      <section className="rounded-11 border border-border/60 bg-background p-6">
        <h2 className="font-display text-2xl">{t("newInstructor")}</h2>
        <form action={createInstructor} className="mt-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="new-name">{t("instructorName")}</Label>
              <Input id="new-name" name="name" required />
            </div>
            <div>
              <Label>{t("instructorPhoto")}</Label>
              <ImageUpload name="photoUrl" />
            </div>
          </div>
          <div>
            <Label htmlFor="new-bio">{t("instructorBio")}</Label>
            <Textarea id="new-bio" name="bio" rows={3} />
          </div>
          <Button type="submit" variant="dark">
            {t("addInstructor")}
          </Button>
        </form>
      </section>

      <section className="rounded-11 border border-border/60 bg-background">
        {instructors.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {t("noInstructorsYet")}
          </p>
        ) : (
          <div className="divide-y divide-border/70">
            {instructors.map((i) => (
              <div key={i.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                      {i.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={i.photoUrl}
                          alt={i.name}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">{i.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {i.credits.length > 0
                          ? i.credits.map((c) => c.title.title).join(", ")
                          : t("noCredits")}
                      </p>
                    </div>
                  </div>
                  <form action={deleteInstructor}>
                    <input type="hidden" name="id" value={i.id} />
                    <ConfirmButton
                      confirmText={t("deleteInstructorConfirm", {
                        name: i.name,
                      })}
                      className="shrink-0 text-xs text-red-600 underline-offset-4 hover:underline"
                    >
                      {t("delete")}
                    </ConfirmButton>
                  </form>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    {t("editInstructor")}
                  </summary>
                  <form
                    action={updateInstructor}
                    className="mt-3 space-y-4 rounded-11 border border-border/60 bg-muted/30 p-4"
                  >
                    <input type="hidden" name="id" value={i.id} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor={`name-${i.id}`}>
                          {t("instructorName")}
                        </Label>
                        <Input
                          id={`name-${i.id}`}
                          name="name"
                          defaultValue={i.name}
                          required
                        />
                      </div>
                      <div>
                        <Label>{t("instructorPhoto")}</Label>
                        <ImageUpload
                          name="photoUrl"
                          defaultValue={i.photoUrl ?? ""}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`bio-${i.id}`}>
                        {t("instructorBio")}
                      </Label>
                      <Textarea
                        id={`bio-${i.id}`}
                        name="bio"
                        defaultValue={i.bio ?? ""}
                        rows={3}
                      />
                    </div>
                    <Button type="submit" variant="dark">
                      {t("saved")}
                    </Button>
                  </form>
                </details>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
