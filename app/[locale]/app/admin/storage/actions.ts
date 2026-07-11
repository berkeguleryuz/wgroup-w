"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { localizedPath } from "@/lib/i18n/routing";
import { requireRole } from "@/lib/access";
import { getStorage, isR2Configured } from "@/lib/storage";
import { getStorageInventory, isManagedKey, isOrphanKey, isTreeKey } from "./inventory";

/** Delete a managed reference: an HLS tree (trailing-slash key) or one object. */
async function deleteManaged(key: string) {
  const storage = getStorage();
  if (isTreeKey(key)) {
    const objects = await storage.listObjects(key);
    await Promise.all(objects.map((o) => storage.deleteObject(o.key)));
    return;
  }
  await storage.deleteObject(key);
}

async function backToStorage(toast: string) {
  const locale = await getLocale();
  redirect(localizedPath(locale, `/app/admin/storage?toast=${toast}`));
}

export async function deleteStorageObject(formData: FormData) {
  await requireRole(["admin"]);
  if (!isR2Configured()) throw new Error("R2 is not configured");

  const key = String(formData.get("key") || "");
  // Only panel-upload prefixes, and only when nothing references the key
  // anymore — re-checked server-side so a stale page can't delete live media.
  if (!isManagedKey(key) || !(await isOrphanKey(key))) {
    throw new Error("Object is not an orphan");
  }
  await deleteManaged(key);
  await backToStorage("deleted");
}

export async function deleteAllOrphans() {
  await requireRole(["admin"]);
  if (!isR2Configured()) throw new Error("R2 is not configured");

  const inventory = await getStorageInventory();
  for (const obj of inventory) {
    if (!obj.referenced) await deleteManaged(obj.key);
  }
  await backToStorage("deleted");
}
