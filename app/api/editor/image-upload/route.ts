import { NextResponse } from "next/server";

import { getSession } from "@/lib/access";
import { getSelfServeOrgId } from "@/lib/corporate";
import { getStorage, isR2Configured } from "@/lib/storage";
import { parseUploadRequest } from "@/lib/security/upload-policy";
import {
  createImageUploadSignedUrl,
  getImagePublicUrl,
} from "@/lib/supabase-storage";

const STAFF = new Set(["admin", "platform_editor"]);
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const role = (session.user as { role?: string | null }).role;
  const isStaff = !!role && STAFF.has(role);
  // Staff, or an org owner whose self-serve content studio is enabled. Org
  // uploads get an org-scoped prefix so per-company usage is measurable.
  const selfServeOrgId = isStaff ? null : await getSelfServeOrgId(session.user.id);
  if (!isStaff && !selfServeOrgId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const upload = parseUploadRequest(
    "image",
    await request.json().catch(() => null),
  );
  if (!upload.success) {
    return NextResponse.json({ error: "invalid upload" }, { status: 400 });
  }
  const { filename, contentType, size } = upload.data;

  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const orgPrefix = selfServeOrgId ? `org/${selfServeOrgId}/` : "";
  const path = `images/${orgPrefix}${Date.now()}-${safe}`;

  try {
    if (isR2Configured()) {
      const { uploadUrl, key, headers } =
        await getStorage().createSignedUploadUrl(path, contentType, size);
      return NextResponse.json({
        uploadUrl,
        headers,
        publicUrl: getStorage().getPublicUrl(key),
      });
    }
    // Supabase fallback — public `thumbnails` bucket.
    const { signedUrl, path: key } = await createImageUploadSignedUrl(path);
    return NextResponse.json({
      uploadUrl: signedUrl,
      headers: { "content-type": contentType },
      publicUrl: getImagePublicUrl(key),
    });
  } catch {
    return NextResponse.json({ error: "upload unavailable" }, { status: 500 });
  }
}
