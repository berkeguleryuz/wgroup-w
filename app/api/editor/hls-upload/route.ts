import { NextResponse } from "next/server";

import { getSession } from "@/lib/access";
import { getSelfServeOrgId } from "@/lib/corporate";
import { getStorage, isR2Configured } from "@/lib/storage";

const STAFF = new Set(["admin", "platform_editor"]);

// A pre-encoded HLS tree: flat file names, playlists + segments only.
const FILE_NAME_RE = /^[A-Za-z0-9._-]+\.(m3u8|ts)$/;
const MAX_FILES = 2000;

function contentTypeFor(name: string): string {
  return name.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp2t";
}

/**
 * Batch-sign an HLS folder upload (encoded locally with the panel's
 * busyflix-hls-encode tool). The whole tree lands under one
 * `hls/uploads/<ts>-<folder>/` prefix; the response carries one signed PUT
 * per file plus the public master-playlist URL to store as `videoPath`.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const role = (session.user as { role?: string | null }).role;
  const isStaff = !!role && STAFF.has(role);
  const selfServeOrgId = isStaff ? null : await getSelfServeOrgId(session.user.id);
  if (!isStaff && !selfServeOrgId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  // HLS trees are served via the public R2 base URL; the Supabase fallback
  // can't do that (signed URLs break relative segment references).
  if (!isR2Configured()) {
    return NextResponse.json({ error: "hls upload requires R2" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    folderName?: string;
    files?: { name?: string }[];
  } | null;
  const folderName = body?.folderName?.trim();
  const files = body?.files;
  if (!folderName || !Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: "folderName and files required" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: "too many files" }, { status: 400 });
  }

  const names = files.map((f) => f?.name?.trim() ?? "");
  if (names.some((n) => !FILE_NAME_RE.test(n))) {
    return NextResponse.json(
      { error: "folder must contain only .m3u8/.ts files" },
      { status: 400 },
    );
  }
  if (!names.includes("master.m3u8")) {
    return NextResponse.json({ error: "master.m3u8 missing" }, { status: 400 });
  }
  if (new Set(names).size !== names.length) {
    return NextResponse.json({ error: "duplicate file names" }, { status: 400 });
  }

  const safeFolder = folderName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const orgPrefix = selfServeOrgId ? `org/${selfServeOrgId}/` : "";
  const baseKey = `hls/uploads/${orgPrefix}${Date.now()}-${safeFolder}`;

  try {
    const storage = getStorage();
    const uploads = await Promise.all(
      names.map(async (name) => {
        const { uploadUrl, headers } = await storage.createSignedUploadUrl(
          `${baseKey}/${name}`,
          contentTypeFor(name),
        );
        return { name, uploadUrl, headers };
      }),
    );
    return NextResponse.json({
      uploads,
      masterUrl: storage.getPublicUrl(`${baseKey}/master.m3u8`),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
