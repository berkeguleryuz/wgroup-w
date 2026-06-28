import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { localizedPath, type Locale } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";
import { requireOrgOwner } from "@/lib/corporate";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { ConfirmButton } from "@/components/editor/ConfirmButton";

async function backToList() {
  const locale = await getLocale();
  redirect(localizedPath(locale, "/app/organization/departments"));
}

async function createDepartment(formData: FormData) {
  "use server";
  const { membership } = await requireOrgOwner();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  await prisma.department.upsert({
    where: {
      organizationId_name: {
        organizationId: membership.organizationId,
        name,
      },
    },
    create: { organizationId: membership.organizationId, name },
    update: {},
  });
  await backToList();
}

async function renameDepartment(formData: FormData) {
  "use server";
  const { membership } = await requireOrgOwner();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  // Scope by organizationId so an owner can only touch their own departments.
  await prisma.department.updateMany({
    where: { id, organizationId: membership.organizationId },
    data: { name },
  });
  await backToList();
}

async function deleteDepartment(formData: FormData) {
  "use server";
  const { membership } = await requireOrgOwner();
  const id = String(formData.get("id"));
  await prisma.department.deleteMany({
    where: { id, organizationId: membership.organizationId },
  });
  await backToList();
}

export default async function CorporateDepartmentsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, { membership }] = await Promise.all([
    getTranslations("organization"),
    requireOrgOwner(),
  ]);

  const departments = await prisma.department.findMany({
    where: { organizationId: membership.organizationId },
    orderBy: { name: "asc" },
    include: { members: { select: { id: true } } },
  });

  return (
    <div className="space-y-10">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-3xl md:text-5xl">{t("departments")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("departmentsBody")}
        </p>
      </header>

      <section className="rounded-11 border border-border/60 bg-background p-6">
        <h2 className="font-display text-2xl">{t("newDepartment")}</h2>
        <form
          action={createDepartment}
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <div className="min-w-64">
            <Label htmlFor="new-dep-name">{t("departmentName")}</Label>
            <Input
              id="new-dep-name"
              name="name"
              required
              placeholder={t("departmentPlaceholder")}
            />
          </div>
          <Button type="submit" variant="dark">
            {t("addDepartment")}
          </Button>
        </form>
      </section>

      <section className="rounded-11 border border-border/60 bg-background">
        {departments.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {t("noDepartments")}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">{t("departmentName")}</th>
                <th className="px-5 py-3">{t("memberCount")}</th>
                <th className="px-5 py-3 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {departments.map((d) => (
                <tr key={d.id}>
                  <td className="px-5 py-3">
                    <form
                      action={renameDepartment}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="id" value={d.id} />
                      <Input
                        name="name"
                        defaultValue={d.name}
                        className="max-w-60"
                        required
                      />
                      <button
                        type="submit"
                        className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      >
                        {t("rename")}
                      </button>
                    </form>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {d.members.length}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <form action={deleteDepartment} className="inline-flex">
                      <input type="hidden" name="id" value={d.id} />
                      <ConfirmButton
                        confirmText={t("deleteDepartmentConfirm", {
                          name: d.name,
                        })}
                        className="text-xs text-red-600 underline-offset-4 hover:underline"
                      >
                        {t("delete")}
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
