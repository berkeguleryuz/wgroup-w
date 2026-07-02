import { NextResponse } from "next/server";

import { getSession } from "@/lib/access";
import { canSelfServeContent } from "@/lib/corporate";
import { getStorage, isR2Configured } from "@/lib/storage";
import {
  createImageUploadSignedUrl,
  getImagePublicUrl,
} from "@/lib/supabase-storage";

const STAFF = new Set(["admin", "platform_editor"]);
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const role = (session.user as { role?: string | null }).role;
  // Staff, or an org owner whose self-serve content studio is enabled.
  const allowed =
    (role && STAFF.has(role)) || (await canSelfServeContent(session.user.id));
  if (!allowed) {
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
  const path = `images/${Date.now()}-${safe}`;

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
    // Supabase fallback — public `thumbnails` bucket.
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
