"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  name: string;
  required?: boolean;
};

/** Uploads a .vtt file to storage and exposes the resulting key via a hidden input. */
export function SubtitleUpload({ name, required }: Props) {
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
        body: JSON.stringify({ filename: file.name, contentType: "text/vtt" }),
      });
      const data = (await res.json()) as {
        uploadUrl?: string;
        path?: string;
        headers?: Record<string, string>;
        error?: string;
      };
      if (!res.ok || !data.uploadUrl || !data.path) {
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
          xhr.setRequestHeader("Content-Type", "text/vtt");
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

      setPath(data.path);
    } catch (e) {
      setError((e as Error).message);
      setFileName("");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-w-0 flex-1">
      <input type="hidden" name={name} value={path} required={required} />
      {path ? (
        <p className="truncate text-xs text-foreground">
          {fileName}{" "}
          <button
            type="button"
            onClick={() => {
              setPath("");
              setFileName("");
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="ml-1 text-red-600 underline-offset-2 hover:underline"
          >
            ×
          </button>
        </p>
      ) : uploading ? (
        <p className="text-xs text-muted-foreground">
          {t("uploading")} {progress}%
        </p>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {t("subtitleSelect")}
        </button>
      )}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept=".vtt,text/vtt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
