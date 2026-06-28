"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/** Copies the absolute invite URL ({origin}{path}) to the clipboard. */
export function CopyInviteLink({ path }: { path: string }) {
  const t = useTranslations("organization");
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for non-secure contexts.
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="text-xs font-medium text-foreground underline-offset-4 hover:underline"
    >
      {copied ? t("copied") : t("copyLink")}
    </button>
  );
}
