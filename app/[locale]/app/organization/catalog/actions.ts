"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { localizedPath } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";
import { requireOrgOwner } from "@/lib/corporate";
import { isNextRedirect } from "@/lib/utils";

async function backToCatalog(toast: string, emsg?: string) {
  revalidatePath("/", "layout");
  const locale = await getLocale();
  const q = emsg ? `&emsg=${encodeURIComponent(emsg)}` : "";
  redirect(localizedPath(locale, `/app/organization/catalog?toast=${toast}${q}`));
}

/** Hide or unhide a PUBLIC platform title from this organization's members. */
export async function toggleTitleHidden(formData: FormData) {
  const { membership } = await requireOrgOwner();
  try {
    const titleId = String(formData.get("titleId") || "");
    const hide = String(formData.get("hide")) === "1";
    if (!titleId) throw new Error("Missing titleId");

    // Only PUBLIC titles can be org-hidden — ORG_ONLY visibility is already
    // controlled by audience assignment.
    const title = await prisma.title.findUnique({
      where: { id: titleId },
      select: { visibility: true },
    });
    if (!title || title.visibility !== "PUBLIC") {
      throw new Error("Title not found");
    }

    const key = {
      organizationId: membership.organizationId,
      titleId,
    };
    if (hide) {
      await prisma.organizationHiddenTitle.upsert({
        where: { organizationId_titleId: key },
        create: key,
        update: {},
      });
    } else {
      await prisma.organizationHiddenTitle.deleteMany({ where: key });
    }
    await backToCatalog("saved");
  } catch (e) {
    if (isNextRedirect(e)) throw e;
    await backToCatalog("error", (e as Error).message);
  }
}
