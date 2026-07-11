import "server-only";

import { prisma } from "@/lib/prisma";
import { getStorage, isR2Configured, type StorageObject } from "@/lib/storage";

/** Prefixes panel uploads land under — the only keys this tooling touches. */
export const MANAGED_PREFIXES = ["uploads/", "images/"] as const;
/** HLS trees produced from panel uploads (worker / folder upload). One tree =
    one video; listed and deleted as a single unit. Curated ingest trees under
    other hls/ paths are deliberately out of scope. */
export const MANAGED_TREE_PREFIX = "hls/uploads/";

export type InventoryObject = StorageObject & {
  referenced: boolean;
  /** Set for HLS trees: number of files aggregated into this row. */
  fileCount?: number;
};

/** Tree keys carry a trailing slash so actions know to delete the whole prefix. */
export function isTreeKey(key: string): boolean {
  return key.startsWith(MANAGED_TREE_PREFIX) && key.endsWith("/");
}

export function isManagedKey(key: string): boolean {
  return MANAGED_PREFIXES.some((p) => key.startsWith(p)) || isTreeKey(key);
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
  const [refs, treeObjects, ...lists] = await Promise.all([
    getReferenceStrings(),
    storage.listObjects(MANAGED_TREE_PREFIX),
    ...MANAGED_PREFIXES.map((p) => storage.listObjects(p)),
  ]);

  // Collapse each HLS tree (hls/uploads/<name>/*) into one logical row keyed
  // by its directory prefix; referenced when an episode's master URL points
  // inside it.
  const trees = new Map<string, InventoryObject>();
  for (const obj of treeObjects) {
    const dir = `${obj.key.slice(0, obj.key.lastIndexOf("/"))}/`;
    const row = trees.get(dir);
    if (row) {
      row.size += obj.size;
      row.fileCount = (row.fileCount ?? 0) + 1;
      if (
        obj.lastModified &&
        (!row.lastModified || obj.lastModified > row.lastModified)
      ) {
        row.lastModified = obj.lastModified;
      }
    } else {
      trees.set(dir, {
        key: dir,
        size: obj.size,
        lastModified: obj.lastModified,
        fileCount: 1,
        referenced: refs.some((r) => r.includes(dir)),
      });
    }
  }

  return lists
    .flat()
    .map((obj) => ({
      ...obj,
      referenced: refs.some((r) => r.includes(obj.key)),
    }))
    .concat([...trees.values()])
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
