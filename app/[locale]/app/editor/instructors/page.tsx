import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { localizedPath, type Locale } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { ImageUpload } from "@/components/editor/ImageUpload";
import { ConfirmButton } from "@/components/editor/ConfirmButton";

async function backToList(error?: string) {
  const locale = await getLocale();
  redirect(
    localizedPath(locale, "/app/editor/instructors") +
      (error ? `?error=${error}` : ""),
  );
}

/**
 * Resolve the optional "user e-mail" field to a platform user id. Returns the
 * error code instead of the id when the address doesn't match a user, or the
 * user is already linked to another instructor profile. Linking also promotes
 * a plain `individual` account to the `instructor` role (never touches
 * staff/admin roles).
 */
async function resolveLinkedUser(
  formData: FormData,
  currentInstructorId?: string,
): Promise<{ userId: string | null } | { error: string }> {
  const email = String(formData.get("userEmail") || "")
    .trim()
    .toLowerCase();
  if (!email) return { userId: null };

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });
  if (!user) return { error: "userNotFound" };

  const existing = await prisma.instructor.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (existing && existing.id !== currentInstructorId) {
    return { error: "userAlreadyLinked" };
  }

  if (!user.role || user.role === "individual") {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "instructor" },
    });
  }
  return { userId: user.id };
}

async function createInstructor(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const name = String(formData.get("name") || "").trim();
  const bio = String(formData.get("bio") || "").trim() || null;
  const photoUrl = String(formData.get("photoUrl") || "").trim() || null;
  if (!name) throw new Error("Missing fields");

  const linked = await resolveLinkedUser(formData);
  if ("error" in linked) return backToList(linked.error);

  await prisma.instructor.create({
    data: { name, bio, photoUrl, userId: linked.userId },
  });
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

  const linked = await resolveLinkedUser(formData, id);
  if ("error" in linked) return backToList(linked.error);

  await prisma.instructor.update({
    where: { id },
    data: { name, bio, photoUrl, userId: linked.userId },
  });
  await backToList();
}

async function deleteInstructor(formData: FormData) {
  "use server";
  await requireRole(["platform_editor", "admin"]);
  const id = String(formData.get("id"));
  await prisma.instructor.delete({ where: { id } });
  await backToList();
}

const LINK_ERRORS = ["userNotFound", "userAlreadyLinked"] as const;

export default async function EditorInstructorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ locale }, { error }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  await requireRole(["platform_editor", "admin"]);
  const [t, instructors] = await Promise.all([
    getTranslations("editor"),
    prisma.instructor.findMany({
      orderBy: { name: "asc" },
      include: {
        credits: { include: { title: { select: { title: true } } } },
        user: { select: { email: true } },
      },
    }),
  ]);
  const linkError = LINK_ERRORS.find((e) => e === error);

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

      {linkError ? (
        <p className="rounded-11 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t(
            linkError === "userNotFound"
              ? "instructorUserNotFound"
              : "instructorUserAlreadyLinked",
          )}
        </p>
      ) : null}

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
              <ImageUpload name="photoUrl" shape="avatar" />
            </div>
          </div>
          <div>
            <Label htmlFor="new-user-email">{t("instructorUserEmail")}</Label>
            <Input
              id="new-user-email"
              name="userEmail"
              type="email"
              placeholder="ornek@sirket.com"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("instructorUserEmailHint")}
            </p>
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
                      <p className="font-medium">
                        {i.name}
                        {i.user ? (
                          <span className="ml-2 rounded-full bg-primary/60 px-2 py-0.5 text-[11px] font-normal text-primary-foreground">
                            {i.user.email}
                          </span>
                        ) : null}
                      </p>
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
                          shape="avatar"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`user-email-${i.id}`}>
                        {t("instructorUserEmail")}
                      </Label>
                      <Input
                        id={`user-email-${i.id}`}
                        name="userEmail"
                        type="email"
                        defaultValue={i.user?.email ?? ""}
                        placeholder="ornek@sirket.com"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("instructorUserEmailHint")}
                      </p>
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
