const MANAGED_PREFIXES = ["uploads/", "hls/", "images/"] as const;
const LOCAL_PREFIXES = ["/hls/", "/subtitles/", "/images/"] as const;
const SEEDED_MEDIA_ORIGINS = [
  "https://commondatastorage.googleapis.com",
  "https://images.unsplash.com",
] as const;

export type MediaReferenceResult =
  | {
      ok: true;
      kind: "managed-key" | "local-path" | "remote-url";
      value: string;
    }
  | { ok: false; reason: string };

function fail(reason: string): MediaReferenceResult {
  return { ok: false, reason };
}

function containsTraversal(value: string): boolean {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return true;
  }
  return decoded.split(/[\\/]/).some((segment) => segment === ".." || segment === ".");
}

function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.origin.toLowerCase() : null;
  } catch {
    return null;
  }
}

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) {
    return false;
  }
  const nums = parts.map(Number);
  if (nums.some((part) => part < 0 || part > 255)) return true;
  const [a, b] = nums;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateIpv6(host: string): boolean {
  const normalized = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (!normalized.includes(":")) return false;
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.") ||
    normalized.startsWith("::ffff:169.254.")
  );
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    isPrivateIpv4(host) ||
    isPrivateIpv6(host)
  );
}

export function validateMediaReference(
  rawValue: string,
  allowedOrigins: readonly string[],
): MediaReferenceResult {
  const value = rawValue.trim();
  if (!value || value.length > 2048 || value.includes("\0")) return fail("invalid");
  if (value.startsWith("//") || containsTraversal(value)) return fail("unsafe-path");

  if (value.startsWith("/")) {
    if (!LOCAL_PREFIXES.some((prefix) => value.startsWith(prefix))) {
      return fail("unmanaged-local-path");
    }
    return { ok: true, kind: "local-path", value };
  }

  if (!value.includes("://")) {
    if (!MANAGED_PREFIXES.some((prefix) => value.startsWith(prefix))) {
      return fail("unmanaged-key");
    }
    return { ok: true, kind: "managed-key", value };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return fail("invalid-url");
  }
  if (url.protocol !== "https:") return fail("https-required");
  if (url.username || url.password) return fail("credentials-not-allowed");
  if (isBlockedHostname(url.hostname)) return fail("blocked-host");

  const normalizedAllowed = new Set(
    allowedOrigins.map(normalizeOrigin).filter((origin): origin is string => !!origin),
  );
  if (!normalizedAllowed.has(url.origin.toLowerCase())) return fail("origin-not-allowed");
  return { ok: true, kind: "remote-url", value: url.toString() };
}

export function configuredMediaOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const candidates = [
    ...SEEDED_MEDIA_ORIGINS,
    env.R2_PUBLIC_BASE_URL,
    env.R2_ACCOUNT_ID
      ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : undefined,
    // Signed URLs use the virtual-hosted style (bucket as subdomain), so that
    // origin must be allowed alongside the path-style endpoint above.
    env.R2_ACCOUNT_ID && env.R2_BUCKET
      ? `https://${env.R2_BUCKET}.${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : undefined,
    env.NEXT_PUBLIC_SUPABASE_URL,
    ...(env.MEDIA_ALLOWED_ORIGINS ?? "").split(","),
  ];
  return [
    ...new Set(
      candidates
        .map((candidate) => candidate?.trim())
        .filter((candidate): candidate is string => !!candidate)
        .map(normalizeOrigin)
        .filter((origin): origin is string => !!origin),
    ),
  ];
}

export function requireValidMediaReference(
  value: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const result = validateMediaReference(value, configuredMediaOrigins(env));
  if (!result.ok) throw new Error("invalid media reference");
  return result.value;
}
