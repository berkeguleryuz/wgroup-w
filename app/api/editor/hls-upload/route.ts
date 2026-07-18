import { NextResponse } from "next/server";

import { getSession } from "@/lib/access";
import { getSelfServeOrgId } from "@/lib/corporate";
import { getStorage, isR2Configured } from "@/lib/storage";
import { validateHlsManifest } from "@/lib/security/upload-policy";

const STAFF = new Set(["admin", "platform_editor"]);

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

  const manifest = validateHlsManifest(await request.json().catch(() => null));
  if (!manifest.success) {
    return NextResponse.json({ error: "invalid HLS upload" }, { status: 400 });
  }
  const { folderName, files } = manifest.data;

  const safeFolder = folderName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const orgPrefix = selfServeOrgId ? `org/${selfServeOrgId}/` : "";
  const baseKey = `hls/uploads/${orgPrefix}${Date.now()}-${safeFolder}`;

  try {
    const storage = getStorage();
    const uploads = await Promise.all(
      files.map(async ({ name, size }) => {
        const { uploadUrl, headers } = await storage.createSignedUploadUrl(
          `${baseKey}/${name}`,
          contentTypeFor(name),
          size,
        );
        return { name, uploadUrl, headers };
      }),
    );
    return NextResponse.json({
      uploads,
      masterUrl: storage.getPublicUrl(`${baseKey}/master.m3u8`),
    });
  } catch {
    return NextResponse.json({ error: "upload unavailable" }, { status: 500 });
  }
}
