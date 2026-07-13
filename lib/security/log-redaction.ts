const URL_RE = /https?:\/\/[^\s)\]}]+/gi;
const BEARER_RE = /Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi;
const SECRET_FIELD_RE = /\b(token|secret|code|key|authorization)\b\s*[:=]\s*[^\s,;]+/gi;

export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return `${local.length > 1 ? local[0] : ""}***@${domain}`;
}

export function safeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "unknown error");
  return raw
    .replace(URL_RE, "[url redacted]")
    .replace(BEARER_RE, "Bearer [redacted]")
    .replace(SECRET_FIELD_RE, "$1=[redacted]")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 200);
}
