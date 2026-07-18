"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  name: string;
  required?: boolean;
  /** When set, a hidden input with this name carries the video's duration in
      seconds, read from the file's metadata — no manual entry needed. */
  durationName?: string;
  /** Playable URL of the episode's current video (edit forms) — shown as a
      small preview so the editor can see what's there before replacing it. */
  currentUrl?: string | null;
};

/** Read the duration (seconds) from a video file's metadata in the browser. */
function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(
        Number.isFinite(video.duration) && video.duration > 0
          ? Math.round(video.duration)
          : null,
      );
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}

/** Sum the EXTINF durations of a variant playlist (an .m3u8 file's text). */
function playlistDuration(text: string): number {
  let total = 0;
  for (const m of text.matchAll(/#EXTINF:([\d.]+)/g)) {
    total += Number(m[1]) || 0;
  }
  return Math.round(total);
}

function formatDuration(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

async function putFile(
  file: File,
  uploadUrl: string,
  headers: Record<string, string> | undefined,
  fallbackType: string,
  onProgress: (loaded: number) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    // Send exactly the headers the upload URL was signed with (R2), or fall
    // back to the file's content type (Supabase).
    if (headers && Object.keys(headers).length > 0) {
      for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    } else {
      xhr.setRequestHeader("Content-Type", fallbackType);
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("network error"));
    xhr.send(file);
  });
}

export function VideoUpload({ name, required, durationName, currentUrl }: Props) {
  const t = useTranslations("editor");
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"mp4" | "hls">("mp4");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [path, setPath] = useState("");
  const [fileName, setFileName] = useState("");
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep the form from submitting mid-upload (would save an empty path).
  function setFormBusy(busy: boolean) {
    const form = fileRef.current?.form;
    if (!form) return;
    form
      .querySelectorAll<HTMLButtonElement>(
        'button[type="submit"], button:not([type])',
      )
      .forEach((b) => {
        b.disabled = busy;
      });
  }

  function reset() {
    setPath("");
    setFileName("");
    setDurationSec(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
    if (folderRef.current) folderRef.current.value = "";
  }

  // --- Direct MP4 (single quality) -----------------------------------------
  async function handleFile(file: File) {
    setUploading(true);
    setFormBusy(true);
    setError(null);
    setProgress(0);
    setPath("");
    setFileName(file.name);
    setDurationSec(null);
    if (durationName) {
      void readVideoDuration(file).then(setDurationSec);
    }
    try {
      const res = await fetch("/api/editor/video-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "video/mp4",
          size: file.size,
        }),
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
      await putFile(file, data.uploadUrl, data.headers, file.type || "video/mp4", (loaded) =>
        setProgress(Math.round((loaded / file.size) * 100)),
      );
      setPath(data.path);
    } catch (e) {
      setError((e as Error).message);
      setFileName("");
    } finally {
      setUploading(false);
      setFormBusy(false);
    }
  }

  // --- Pre-encoded HLS folder (multi quality) -------------------------------
  async function handleFolder(list: FileList) {
    const files = Array.from(list);
    setError(null);

    // Flat folder of playlists + segments, produced by the encoder tool.
    const entries = files.map((f) => {
      const rel = (f.webkitRelativePath || f.name).split("/");
      return { file: f, root: rel[0] ?? "", name: rel[rel.length - 1] ?? "", depth: rel.length };
    });
    const valid =
      entries.length > 0 &&
      entries.every((e) => e.depth <= 2 && /\.(m3u8|ts)$/i.test(e.name)) &&
      entries.some((e) => e.name === "master.m3u8");
    if (!valid) {
      setError(t("hlsInvalidFolder"));
      return;
    }

    setUploading(true);
    setFormBusy(true);
    setProgress(0);
    setPath("");
    setFileName(entries[0].root || "hls");
    setDurationSec(null);
    try {
      // Duration: sum a variant playlist's EXTINF entries.
      const variant = entries.find((e) => e.name !== "master.m3u8" && e.name.endsWith(".m3u8"));
      if (variant) {
        setDurationSec(playlistDuration(await variant.file.text()));
      }

      const res = await fetch("/api/editor/hls-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderName: entries[0].root || "hls",
          files: entries.map((e) => ({ name: e.name, size: e.file.size })),
        }),
      });
      const data = (await res.json()) as {
        uploads?: { name: string; uploadUrl: string; headers?: Record<string, string> }[];
        masterUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.uploads || !data.masterUrl) {
        throw new Error(data.error || "upload init failed");
      }
      const urlByName = new Map(data.uploads.map((u) => [u.name, u]));

      const totalBytes = entries.reduce((sum, e) => sum + e.file.size, 0);
      const loadedByName = new Map<string, number>();
      const bump = (n: string, loaded: number) => {
        loadedByName.set(n, loaded);
        let sum = 0;
        for (const v of loadedByName.values()) sum += v;
        setProgress(Math.min(100, Math.round((sum / totalBytes) * 100)));
      };

      // Bounded concurrency: a tree is hundreds of small segments.
      const queue = [...entries];
      const workers = Array.from({ length: 4 }, async () => {
        for (;;) {
          const entry = queue.shift();
          if (!entry) return;
          const target = urlByName.get(entry.name);
          if (!target) throw new Error(`no upload url for ${entry.name}`);
          await putFile(
            entry.file,
            target.uploadUrl,
            target.headers,
            entry.name.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp2t",
            (loaded) => bump(entry.name, loaded),
          );
          bump(entry.name, entry.file.size);
        }
      });
      await Promise.all(workers);

      setPath(data.masterUrl);
    } catch (e) {
      setError((e as Error).message);
      setFileName("");
      setDurationSec(null);
    } finally {
      setUploading(false);
      setFormBusy(false);
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={path} required={required} />
      {durationName && durationSec !== null && path ? (
        <input type="hidden" name={durationName} value={durationSec} />
      ) : null}

      {/* Mode switch */}
      {!path && !uploading ? (
        <div className="mb-2 flex gap-1 rounded-11 border border-border bg-muted/40 p-1 text-xs">
          {(["mp4", "hls"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`flex-1 rounded-[8px] px-3 py-1.5 font-medium transition-colors ${
                mode === m
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "mp4" ? t("uploadModeMp4") : t("uploadModeHls")}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className={`rounded-11 border border-dashed p-5 transition-colors ${
          path ? "border-primary bg-primary/10" : "border-border bg-muted/40"
        }`}
      >
        {path ? (
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {fileName}
                {durationSec !== null ? (
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    {formatDuration(durationSec)}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                {path}
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
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
          <div className="flex flex-wrap items-center gap-4">
            {currentUrl ? (
              <div className="w-40 shrink-0">
                <video
                  src={currentUrl}
                  className="aspect-video w-full rounded-11 border border-border bg-black object-cover"
                  controls
                  muted
                  preload="metadata"
                />
                <p className="mt-1 text-center text-[11px] text-muted-foreground">
                  {t("currentVideo")}
                </p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() =>
                (mode === "mp4" ? fileRef : folderRef).current?.click()
              }
              className="flex min-w-0 flex-1 items-center justify-center gap-2 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <UploadIcon />
              {mode === "mp4" ? t("uploadSelect") : t("hlsSelectFolder")}
            </button>
          </div>
        )}
      </div>

      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : mode === "mp4" ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {t("uploadHint")} {t("mp4SingleQualityNote")}
        </p>
      ) : null}

      {/* HLS how-to: encode locally with the downloadable tool, upload folder */}
      {mode === "hls" && !path && !uploading ? (
        <div className="mt-2 rounded-11 border border-border/60 bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">{t("hlsHowTitle")}</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-4">
            <li>
              {t("hlsStep1")}{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">
                brew install ffmpeg
              </code>{" "}
              /{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">
                winget install ffmpeg
              </code>
            </li>
            <li>
              <a
                href="/tools/busyflix-hls-encode.mjs"
                download
                className="font-medium text-foreground underline underline-offset-2"
              >
                {t("hlsDownloadTool")}
              </a>{" "}
              — {t("hlsStep2")}
            </li>
            <li>
              {t("hlsStep3")}{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">
                node busyflix-hls-encode.mjs video.mp4
              </code>
            </li>
            <li>{t("hlsStep4")}</li>
          </ol>
        </div>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <input
        ref={folderRef}
        type="file"
        // Non-standard folder-picker attribute; supported by all evergreen browsers.
        {...({ webkitdirectory: "" } as Record<string, string>)}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFolder(e.target.files);
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
