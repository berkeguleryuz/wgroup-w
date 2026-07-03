import { NextResponse } from "next/server";

import { getSession } from "@/lib/access";
import { getSelfServeOrgId } from "@/lib/corporate";
import { getStorage } from "@/lib/storage";

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

  const body = (await request.json().catch(() => null)) as
    | { filename?: string; contentType?: string }
    | null;
  const filename = body?.filename?.trim();
  if (!filename) {
    return NextResponse.json({ error: "filename required" }, { status: 400 });
  }

  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const orgPrefix = selfServeOrgId ? `org/${selfServeOrgId}/` : "";
  const path = `uploads/${orgPrefix}${Date.now()}-${safe}`;
  const contentType = body?.contentType?.trim() || "video/mp4";

  try {
    const storage = getStorage();
    const { uploadUrl, key, headers } = await storage.createSignedUploadUrl(
      path,
      contentType,
    );
    return NextResponse.json({
      uploadUrl,
      path: key,
      headers,
      // Direct public URL — used by callers (e.g. trailers) that play the file
      // as-is rather than resolving the key through a signed URL.
      publicUrl: storage.getPublicUrl(key),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
