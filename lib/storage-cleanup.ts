import "server-only";

import { prisma } from "./prisma";
import { getStorage, isR2Configured } from "./storage";

const MANAGED_PREFIXES = ["uploads/", "images/"];

/**
 * Normalize a stored reference (bare key or full public URL) to a bucket key.
 * Returns null for anything this tooling must not touch (HLS trees, external
 * URLs, empty values).
 */
function toManagedKey(ref: string | null | undefined): string | null {
  if (!ref) return null;
  let key = ref;
  if (/^https?:\/\//i.test(ref)) {
    try {
      key = new URL(ref).pathname.replace(/^\/+/, "");
    } catch {
      return null;
    }
  }
  return MANAGED_PREFIXES.some((p) => key.startsWith(p)) ? key : null;
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
  if (keys.length === 0) return;
  const storage = getStorage();
  await Promise.all(
    keys.map(async (key) => {
      try {
        if (!(await isReferenced(key))) await storage.deleteObject(key);
      } catch (e) {
        console.warn(`[storage-cleanup] failed to delete ${key}:`, e);
      }
    }),
  );
}
