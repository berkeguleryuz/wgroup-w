"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { USER_ROLES } from "@/lib/auth";
import { requireRole } from "@/lib/access";

export async function updateUserRole(formData: FormData) {
  await requireRole(["admin"]);
  const userId = String(formData.get("userId"));
  const role = String(formData.get("role"));
  if (!(USER_ROLES as readonly string[]).includes(role)) {
    throw new Error("Geçersiz rol");
  }
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/app/admin/users");
}
