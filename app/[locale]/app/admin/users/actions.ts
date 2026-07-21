"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { localizedPath } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";
import { USER_ROLES } from "@/lib/auth";
import { requireFreshRole } from "@/lib/access";

export async function updateUserRole(formData: FormData) {
  await requireFreshRole(["admin"]);
  const userId = String(formData.get("userId"));
  const role = String(formData.get("role"));
  if (!(USER_ROLES as readonly string[]).includes(role)) {
    throw new Error("Geçersiz rol");
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { name: true, email: true, image: true },
  });

  // Making someone an instructor should also surface them in the editor's
  // Eğitmenler list — ensure a linked Instructor profile exists.
  if (role === "instructor") {
    const existing = await prisma.instructor.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!existing) {
      await prisma.instructor.create({
        data: {
          name: user.name || user.email,
          photoUrl: user.image ?? null,
          userId,
        },
      });
    }
  }
  // Routes live under /[locale]/…, so a literal "/app/admin/users" never
  // matches and the page kept serving the stale role until a hard refresh.
  revalidatePath("/", "layout");
  // Redirect back with a one-shot flash toast (same pattern as companies).
  const locale = await getLocale();
  redirect(localizedPath(locale, "/app/admin/users?toast=saved"));
}
