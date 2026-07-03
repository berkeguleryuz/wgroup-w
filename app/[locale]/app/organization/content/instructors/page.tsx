import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgContentStudio } from "@/lib/corporate";
import {
  createOrgInstructor,
  updateOrgInstructor,
  deleteOrgInstructor,
} from "../actions";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { ImageUpload } from "@/components/editor/ImageUpload";
import { ConfirmButton } from "@/components/editor/ConfirmButton";

export default async function OrgInstructorsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { membership } = await requireOrgContentStudio();

  const [t, te, instructors] = await Promise.all([
    getTranslations("organization"),
    getTranslations("editor"),
    prisma.instructor.findMany({
      where: { createdByOrgId: membership.organizationId },
      orderBy: { name: "asc" },
      include: { credits: { include: { title: { select: { title: true } } } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <Link
          href="/app/organization/content"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          ← {t("contentStudio")}
        </Link>
        <h1 className="mt-2 text-3xl md:text-5xl">{te("instructors")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("contentInstructorsBody")}
        </p>
      </header>

      <section className="rounded-11 border border-border/60 bg-background p-6">
        <h2 className="font-display text-2xl">{te("newInstructor")}</h2>
        <form action={createOrgInstructor} className="mt-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="new-name">{te("instructorName")}</Label>
              <Input id="new-name" name="name" required />
            </div>
            <div>
              <Label>{te("instructorPhoto")}</Label>
              <ImageUpload name="photoUrl" shape="avatar" />
            </div>
          </div>
          <div>
            <Label htmlFor="new-bio">{te("instructorBio")}</Label>
            <Textarea id="new-bio" name="bio" rows={3} />
          </div>
          <Button type="submit" variant="dark">
            {te("addInstructor")}
          </Button>
        </form>
      </section>

      <section className="rounded-11 border border-border/60 bg-background">
        {instructors.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {te("noInstructorsYet")}
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
                          : te("noCredits")}
                      </p>
                    </div>
                  </div>
                  <form action={deleteOrgInstructor}>
                    <input type="hidden" name="id" value={i.id} />
                    <ConfirmButton
                      confirmText={te("deleteInstructorConfirm", {
                        name: i.name,
                      })}
                      className="shrink-0 text-xs text-red-600 underline-offset-4 hover:underline"
                    >
                      {te("delete")}
                    </ConfirmButton>
                  </form>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    {te("editInstructor")}
                  </summary>
                  <form
                    action={updateOrgInstructor}
                    className="mt-3 space-y-4 rounded-11 border border-border/60 bg-muted/30 p-4"
                  >
                    <input type="hidden" name="id" value={i.id} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor={`name-${i.id}`}>
                          {te("instructorName")}
                        </Label>
                        <Input
                          id={`name-${i.id}`}
                          name="name"
                          defaultValue={i.name}
                          required
                        />
                      </div>
                      <div>
                        <Label>{te("instructorPhoto")}</Label>
                        <ImageUpload
                          name="photoUrl"
                          defaultValue={i.photoUrl ?? ""}
                          shape="avatar"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`bio-${i.id}`}>
                        {te("instructorBio")}
                      </Label>
                      <Textarea
                        id={`bio-${i.id}`}
                        name="bio"
                        defaultValue={i.bio ?? ""}
                        rows={3}
                      />
                    </div>
                    <Button type="submit" variant="dark">
                      {te("saved")}
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
