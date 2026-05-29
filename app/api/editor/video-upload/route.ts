import { NextResponse } from "next/server";

import { getSession } from "@/lib/access";
import { createUploadSignedUrl } from "@/lib/supabase-storage";

const STAFF = new Set(["admin", "platform_editor"]);

export async function POST(request: Request) {
  const session = await getSession();
  const role = (session?.user as { role?: string | null } | undefined)?.role;
  if (!session || !role || !STAFF.has(role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { filename?: string }
    | null;
  const filename = body?.filename?.trim();
  if (!filename) {
    return NextResponse.json({ error: "filename required" }, { status: 400 });
  }

  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `uploads/${Date.now()}-${safe}`;

  try {
    const signed = await createUploadSignedUrl(path);
    return NextResponse.json({
      uploadUrl: signed.signedUrl,
      token: signed.token,
      path: signed.path,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
