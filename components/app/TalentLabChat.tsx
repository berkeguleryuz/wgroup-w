"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Props = {
  conversationId: string | null;
  initialMessages: ChatMessage[];
};

export function TalentLabChat({ conversationId, initialMessages }: Props) {
  const t = useTranslations("talentLab");
  const router = useRouter();
  const [convId, setConvId] = useState(conversationId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    setInput("");
    const userMsg: ChatMessage = {
      id: `local-${messages.length}-u`,
      role: "user",
      content: text,
    };
    const assistantMsg: ChatMessage = {
      id: `local-${messages.length}-a`,
      role: "assistant",
      content: "",
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const res = await fetch("/api/talent-lab/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, message: text }),
      });

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          data?.error === "not_configured" ? t("notConfigured") : t("genericError"),
        );
      }

      const newId = res.headers.get("X-Conversation-Id");
      if (newId && !convId) {
        setConvId(newId);
        // Keep the URL shareable without remounting mid-stream.
        window.history.replaceState(null, "", `?c=${newId}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: last.content + chunk };
          return next;
        });
      }
      // Refresh the server-rendered sidebar (conversation list / titles).
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setMessages((prev) =>
        prev.filter((m) => m.id !== assistantMsg.id || m.content),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[420px] flex-col rounded-11 border border-border/60 bg-background">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="font-accent text-2xl text-muted-foreground">
              {t("emptyKicker")}
            </span>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {t("emptyBody")}
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-11 px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-surface-dark text-surface-dark-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.content || (
                  <span className="inline-flex gap-1">
                    <Dot delay="0ms" />
                    <Dot delay="150ms" />
                    <Dot delay="300ms" />
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <p className="border-t border-border/60 px-5 py-2 text-xs text-red-600">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex items-end gap-3 border-t border-border/60 p-4"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          placeholder={t("inputPlaceholder")}
          className="flex-1 resize-none rounded-11 border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-11 bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
        >
          {busy ? t("sending") : t("send")}
        </button>
      </form>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
      style={{ animationDelay: delay }}
    />
  );
}
