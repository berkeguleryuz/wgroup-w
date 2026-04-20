import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

export function getStorageClient(): SupabaseClient {
  if (!client) {
    if (!url || !serviceKey) {
      throw new Error(
        "Supabase storage not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
      );
    }
    client = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
  }
  return client;
}

export const VIDEO_BUCKET = process.env.SUPABASE_VIDEO_BUCKET || "videos";
export const IMAGE_BUCKET = process.env.SUPABASE_IMAGE_BUCKET || "thumbnails";

export async function createVideoSignedUrl(videoPath: string, expiresInSec = 60 * 60) {
  const supabase = getStorageClient();
  const { data, error } = await supabase.storage
    .from(VIDEO_BUCKET)
    .createSignedUrl(videoPath, expiresInSec);
  if (error || !data) throw new Error(`Signed URL error: ${error?.message}`);
  return data.signedUrl;
}

export async function createUploadSignedUrl(videoPath: string) {
  const supabase = getStorageClient();
  const { data, error } = await supabase.storage
    .from(VIDEO_BUCKET)
    .createSignedUploadUrl(videoPath);
  if (error || !data) throw new Error(`Upload URL error: ${error?.message}`);
  return data;
}
