"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  name: string;
  defaultValue?: string;
  required?: boolean;
};

/**
 * Uploads an image to storage (R2 or public Supabase bucket) and exposes the
 * resulting public URL via a visually hidden input — the raw URL is never
 * shown or hand-editable (the preview thumbnail is the source of truth).
 */
export function ImageUpload({ name, defaultValue, required }: Props) {
  const t = useTranslations("editor");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [url, setUrl] = useState(defaultValue ?? "");
  const [error, setError] = useState<string | null>(null);

  // Block the surrounding form from submitting while an upload is in flight —
  // otherwise a fast click saves an empty URL (the bug where a freshly added
  // instructor lost its photo). Toggled from the upload handler (the event that
  // owns this state), not a state-syncing effect.
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
      const res = await fetch("/api/editor/image-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "image/jpeg",
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
          xhr.setRequestHeader("Content-Type", file.type || "image/jpeg");
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

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-11 border border-border bg-muted">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground/70">
              —
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {/* Visually hidden (not display:none) so `required` validation still
              works — the URL itself stays out of sight and out of reach. */}
          <input
            type="text"
            name={name}
            value={url}
            required={required}
            readOnly
            tabIndex={-1}
            aria-hidden
            className="sr-only"
          />
          {uploading ? (
            <div className="flex h-full min-h-[3.5rem] flex-col justify-center rounded-11 border border-dashed border-border bg-muted/40 px-4">
              <p className="text-xs text-muted-foreground">
                {t("uploading")} — {progress}%
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={`flex min-h-[3.5rem] w-full items-center justify-center gap-2 rounded-11 border border-dashed px-4 text-sm font-medium transition-colors ${
                url
                  ? "border-primary bg-primary/10 text-muted-foreground hover:text-foreground"
                  : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              <UploadIcon />
              {url ? t("imageReplace") : t("imageUploadSelect")}
            </button>
          )}
          {!uploading && url ? (
            <button
              type="button"
              onClick={() => {
                setUrl("");
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-xs text-red-600 underline-offset-2 hover:underline"
            >
              {t("uploadRemove")}
            </button>
          ) : null}
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 13V3" />
      <path d="M6 7l4-4 4 4" />
      <path d="M3.5 13v3a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-3" />
    </svg>
  );
}
