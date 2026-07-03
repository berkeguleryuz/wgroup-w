import { NextResponse } from "next/server";

import { getSession } from "@/lib/access";
import { getStorage, isR2Configured } from "@/lib/storage";
import {
  createImageUploadSignedUrl,
  getImagePublicUrl,
} from "@/lib/supabase-storage";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

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

  const body = (await request.json().catch(() => null)) as
    | { filename?: string; contentType?: string }
    | null;
  const filename = body?.filename?.trim();
  const contentType = body?.contentType?.trim() || "image/jpeg";
  if (!filename) {
    return NextResponse.json({ error: "filename required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: "unsupported image type" },
      { status: 400 },
    );
  }

  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `images/avatars/${session.user.id}/${Date.now()}-${safe}`;

  try {
    if (isR2Configured()) {
      const { uploadUrl, key, headers } =
        await getStorage().createSignedUploadUrl(path, contentType);
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
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
