import "server-only";

import { prisma } from "@/lib/prisma";
import { getStorage, isR2Configured, type StorageObject } from "@/lib/storage";

/** Prefixes panel uploads land under — the only keys this tooling touches. */
export const MANAGED_PREFIXES = ["uploads/", "images/"] as const;

export type InventoryObject = StorageObject & { referenced: boolean };

export function isManagedKey(key: string): boolean {
  return MANAGED_PREFIXES.some((p) => key.startsWith(p));
}

/** Every DB string that may point at a storage object. */
async function getReferenceStrings(): Promise<string[]> {
  const [episodes, titles, subtitles, instructors, users, orgs] =
    await Promise.all([
      prisma.episode.findMany({ select: { videoPath: true } }),
      prisma.title.findMany({ select: { heroImageUrl: true, trailerUrl: true } }),
      prisma.subtitle.findMany({ select: { vttPath: true } }),
      prisma.instructor.findMany({ select: { photoUrl: true } }),
      prisma.user.findMany({ select: { image: true } }),
      prisma.organization.findMany({ select: { logo: true } }),
    ]);
  return [
    ...episodes.map((e) => e.videoPath),
    ...titles.flatMap((t) => [t.heroImageUrl, t.trailerUrl]),
    ...subtitles.map((s) => s.vttPath),
    ...instructors.map((i) => i.photoUrl),
    ...users.map((u) => u.image),
    ...orgs.map((o) => o.logo),
  ].filter((s): s is string => !!s);
}

/**
 * List all panel-uploaded objects (uploads/ + images/) and mark whether any DB
 * record still points at them. References may be bare keys or full public
 * URLs, so an object counts as referenced when any ref string CONTAINS its key.
 */
export async function getStorageInventory(): Promise<InventoryObject[]> {
  if (!isR2Configured()) return [];
  const storage = getStorage();
  const [refs, ...lists] = await Promise.all([
    getReferenceStrings(),
    ...MANAGED_PREFIXES.map((p) => storage.listObjects(p)),
  ]);
  return lists
    .flat()
    .map((obj) => ({
      ...obj,
      referenced: refs.some((r) => r.includes(obj.key)),
    }))
    .sort((a, b) => {
      // Orphans first, newest first within each group.
      if (a.referenced !== b.referenced) return a.referenced ? 1 : -1;
      return (b.lastModified?.getTime() ?? 0) - (a.lastModified?.getTime() ?? 0);
    });
}

/** True when no DB record points at the key anymore (re-check before delete). */
export async function isOrphanKey(key: string): Promise<boolean> {
  if (!isManagedKey(key)) return false;
  const refs = await getReferenceStrings();
  return !refs.some((r) => r.includes(key));
}
