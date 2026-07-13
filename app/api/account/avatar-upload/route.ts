import { NextResponse } from "next/server";

import { getSession } from "@/lib/access";
import { getStorage, isR2Configured } from "@/lib/storage";
import { parseUploadRequest } from "@/lib/security/upload-policy";
import {
  createImageUploadSignedUrl,
  getImagePublicUrl,
} from "@/lib/supabase-storage";

/**
 * Avatar / profile-image upload — open to any signed-in user (unlike the
 * staff/studio editor route). Keys are user-scoped under images/avatars/ so
 * the storage inventory can attribute them.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const upload = parseUploadRequest(
    "avatar",
    await request.json().catch(() => null),
  );
  if (!upload.success) {
    return NextResponse.json({ error: "invalid upload" }, { status: 400 });
  }
  const { filename, contentType, size } = upload.data;

  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `images/avatars/${session.user.id}/${Date.now()}-${safe}`;

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
