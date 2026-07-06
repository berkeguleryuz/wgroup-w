"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  name: string;
  defaultValue?: string;
  required?: boolean;
};

/**
 * Trailer field: paste a video URL or upload a file to storage (R2/Supabase).
 * Stores the resulting *public* URL — trailers are played directly as the hero
 * background (no signed-URL resolution), so a bare storage key won't work.
 * Mirrors {@link ImageUpload}.
 */
export function TrailerUpload({ name, defaultValue, required }: Props) {
  const t = useTranslations("editor");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [url, setUrl] = useState(defaultValue ?? "");
  const [error, setError] = useState<string | null>(null);

  // Keep the form from submitting mid-upload (would save an empty URL). Done
  // from the handler that owns the upload, not a state-syncing effect.
  function setFormBusy(busy: boolean) {
    const form = inputRef.current?.form;
    if (!form) return;
    form
      .querySelectorAll<HTMLButtonElement>(
        'button[type="submit"], button:not([type])',
      )
      .forEach((b) => {
        b.disabled = busy;
      });
  }

  async function handleFile(file: File) {
    setUploading(true);
    setFormBusy(true);
    setError(null);
    setProgress(0);
    try {
      const res = await fetch("/api/editor/video-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "video/mp4",
        }),
      });
      const data = (await res.json()) as {
        uploadUrl?: string;
        publicUrl?: string;
        headers?: Record<string, string>;
        error?: string;
      };
      if (!res.ok || !data.uploadUrl || !data.publicUrl) {
        throw new Error(data.error || "upload init failed");
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", data.uploadUrl!);
        if (data.headers && Object.keys(data.headers).length > 0) {
          for (const [k, v] of Object.entries(data.headers)) {
            xhr.setRequestHeader(k, v);
          }
        } else {
          xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
        }
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error("network error"));
        xhr.send(file);
      });

      setUrl(data.publicUrl);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      setFormBusy(false);
    }
  }

  // Mirrors ImageUpload's layout (small 16:9 thumb + controls) so the hero
  // image and trailer columns line up in the editor form.
  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-11 border border-border bg-muted">
          {url ? (
            <video
              src={url}
              className="h-full w-full bg-black object-cover"
              controls
              muted
              preload="metadata"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground/70">
              —
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <input
            type="text"
            name={name}
            value={url}
            required={required}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="flex h-11 w-full rounded-11 border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
          />

          {uploading ? (
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
              >
                {t("uploadSelect")}
              </button>
              {url ? (
                <button
                  type="button"
                  onClick={() => {
                    setUrl("");
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  className="text-red-600 underline-offset-2 hover:underline"
                >
                  {t("uploadRemove")}
                </button>
              ) : null}
            </div>
          )}

          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
