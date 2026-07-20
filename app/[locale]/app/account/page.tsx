import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import { localizedPath, type Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/access";
import { cleanupStorageRefs } from "@/lib/storage-cleanup";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { ImageUpload } from "@/components/editor/ImageUpload";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: `${t("heading")} · Busyflix` };
}

async function updateProfile(formData: FormData) {
  "use server";
  const session = await requireSession();
  const name = String(formData.get("name") || "").trim();
  const image = String(formData.get("image") || "").trim() || null;
  if (!name) throw new Error("Missing fields");

  const before = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  });
  await prisma.user.update({
    where: { id: session.user.id },
    data: { name, image },
  });
  // Drop a replaced avatar from storage once nothing references it.
  if (before && before.image !== image) {
    await cleanupStorageRefs([before.image]);
  }
  // Layouts don't re-render on navigation (router cache), so the topbar and
  // settings-sidebar avatars would keep the stale image — invalidate the
  // whole layout tree before redirecting.
  revalidatePath("/", "layout");
  const locale = await getLocale();
  redirect(localizedPath(locale, "/app/account?toast=saved"));
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tc, session] = await Promise.all([
    getTranslations("account"),
    getTranslations("common"),
    requireSession(),
  ]);
  const user = session.user as typeof session.user & {
    role?: string | null;
    image?: string | null;
  };
  const roleLabels: Record<string, string> = {
    individual: t("roleIndividual"),
    platform_editor: t("rolePlatformEditor"),
    admin: t("roleAdmin"),
    instructor: t("roleInstructor"),
  };
  const roleLabel = roleLabels[user.role ?? "individual"] ?? user.role ?? "";

  return (
    <div className="space-y-10">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-4xl md:text-6xl">{t("heading")}</h1>
      </header>

      <section className="rounded-11 border border-border/60 bg-background p-6 dark:bg-surface-dark md:p-8">
        <h2 className="font-display text-2xl">{t("profile")}</h2>
        <form action={updateProfile} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="name">{t("name")}</Label>
              <Input id="name" name="name" defaultValue={user.name} required />
            </div>
            <div>
              <Label>{t("avatar")}</Label>
              <ImageUpload
                name="image"
                defaultValue={user.image ?? ""}
                shape="avatar"
                endpoint="/api/account/avatar-upload"
              />
            </div>
          </div>
          <Button type="submit" variant="dark">
            {tc("save")}
          </Button>
        </form>

        <dl className="mt-8 grid gap-4 border-t border-border/60 pt-6 text-sm md:grid-cols-3">
          <Field label={t("email")} value={user.email} />
          <Field label={t("role")} value={roleLabel} />
          <Field
            label={t("verified")}
            value={user.emailVerified ? tc("yes") : tc("no")}
          />
        </dl>
      </section>

      <section className="rounded-11 border border-border/60 bg-background p-6 dark:bg-surface-dark md:p-8">
        <h2 className="font-display text-2xl">{t("subscription")}</h2>
        <Link href="/app/account/subscription" className="mt-4 inline-block">
          <Button variant="dark">{t("manage")}</Button>
        </Link>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
