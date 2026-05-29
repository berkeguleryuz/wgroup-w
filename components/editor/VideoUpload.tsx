"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  name: string;
  required?: boolean;
};

export function VideoUpload({ name, required }: Props) {
  const t = useTranslations("editor");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [path, setPath] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    setProgress(0);
    setPath("");
    setFileName(file.name);
    try {
      const res = await fetch("/api/editor/video-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      });
      const data = (await res.json()) as {
        uploadUrl?: string;
        path?: string;
        error?: string;
      };
      if (!res.ok || !data.uploadUrl || !data.path) {
        throw new Error(data.error || "upload init failed");
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", data.uploadUrl!);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
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

      setPath(data.path);
    } catch (e) {
      setError((e as Error).message);
      setFileName("");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={path} required={required} />

      <div
        className={`rounded-11 border border-dashed p-5 transition-colors ${
          path ? "border-primary bg-primary/10" : "border-border bg-muted/40"
        }`}
      >
        {path ? (
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{fileName}</p>
              <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                {path}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPath("");
                setFileName("");
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="shrink-0 text-xs text-red-600 underline-offset-4 hover:underline"
            >
              {t("uploadRemove")}
            </button>
          </div>
        ) : uploading ? (
          <div>
            <p className="text-sm text-muted-foreground">
              {t("uploading")} — {progress}%
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
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
            className="flex w-full items-center justify-center gap-2 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <UploadIcon />
            {t("uploadSelect")}
          </button>
        )}
      </div>

      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {t("uploadHint")}
        </p>
      )}

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
