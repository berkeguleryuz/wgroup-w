import "server-only";

import { prisma } from "./prisma";
import { getStorage, isR2Configured } from "./storage";

const MANAGED_PREFIXES = ["uploads/", "images/"];
// Editor uploads transcoded to HLS live under hls/uploads/<name>/ — the whole
// tree (playlists + segments) is one logical video and is deleted as a unit.
const MANAGED_TREE_PREFIX = "hls/uploads/";

/** Normalize a stored reference (bare key or full public URL) to a bucket key. */
function refToKey(ref: string): string | null {
  if (!/^https?:\/\//i.test(ref)) return ref;
  try {
    return new URL(ref).pathname.replace(/^\/+/, "");
  } catch {
    return null;
  }
}

/**
 * Managed single-object key for a reference, or null for anything this tooling
 * must not touch (external URLs, empty values, non-managed prefixes).
 */
function toManagedKey(ref: string | null | undefined): string | null {
  if (!ref) return null;
  const key = refToKey(ref);
  if (!key) return null;
  return MANAGED_PREFIXES.some((p) => key.startsWith(p)) ? key : null;
}

/** Managed HLS tree prefix (`hls/uploads/<name>/`) for a master-playlist ref. */
function toManagedTreePrefix(ref: string | null | undefined): string | null {
  if (!ref) return null;
  const key = refToKey(ref);
  if (!key || !key.startsWith(MANAGED_TREE_PREFIX) || !key.endsWith(".m3u8")) {
    return null;
  }
  return `${key.slice(0, key.lastIndexOf("/"))}/`;
}

/** True when any DB record still points at the key (bare key or URL form). */
async function isReferenced(key: string): Promise<boolean> {
  const [episode, title, subtitle, instructor, user, org] = await Promise.all([
    prisma.episode.findFirst({
      where: { videoPath: { contains: key } },
      select: { id: true },
    }),
    prisma.title.findFirst({
      where: {
        OR: [
          { heroImageUrl: { contains: key } },
          { trailerUrl: { contains: key } },
        ],
      },
      select: { id: true },
    }),
    prisma.subtitle.findFirst({
      where: { vttPath: { contains: key } },
      select: { id: true },
    }),
    prisma.instructor.findFirst({
      where: { photoUrl: { contains: key } },
      select: { id: true },
    }),
    prisma.user.findFirst({
      where: { image: { contains: key } },
      select: { id: true },
    }),
    prisma.organization.findFirst({
      where: { logo: { contains: key } },
      select: { id: true },
    }),
  ]);
  return !!(episode || title || subtitle || instructor || user || org);
}

/**
 * Best-effort storage cleanup: delete the object behind a replaced/removed
 * reference once nothing in the DB points at it anymore. Call AFTER the DB
 * mutation. Never throws — a cleanup hiccup must not fail the user's action
 * (leftovers are still visible in the admin storage inventory).
 */
export async function cleanupStorageRefs(
  refs: (string | null | undefined)[],
): Promise<void> {
  if (!isR2Configured()) return;
  const keys = [...new Set(refs.map(toManagedKey).filter((k): k is string => !!k))];
  const trees = [
    ...new Set(refs.map(toManagedTreePrefix).filter((p): p is string => !!p)),
  ];
  if (keys.length === 0 && trees.length === 0) return;
  const storage = getStorage();
  await Promise.all([
    ...keys.map(async (key) => {
      try {
        if (!(await isReferenced(key))) await storage.deleteObject(key);
      } catch (e) {
        console.warn(`[storage-cleanup] failed to delete ${key}:`, e);
      }
    }),
    ...trees.map(async (prefix) => {
      try {
        if (await isReferenced(prefix)) return;
        const objects = await storage.listObjects(prefix);
        await Promise.all(objects.map((o) => storage.deleteObject(o.key)));
      } catch (e) {
        console.warn(`[storage-cleanup] failed to delete tree ${prefix}:`, e);
      }
    }),
  ]);
}
