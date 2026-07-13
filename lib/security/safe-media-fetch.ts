import { validateMediaReference } from "./media-url-policy";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

type SafeMediaFetchOptions = {
  allowedOrigins: readonly string[];
  fetchImpl?: typeof fetch;
  headers?: HeadersInit;
  method?: string;
  maxRedirects?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
};

function validatedRemoteUrl(value: string, allowedOrigins: readonly string[]): string {
  const result = validateMediaReference(value, allowedOrigins);
  if (!result.ok || result.kind !== "remote-url") {
    throw new Error("unsafe media URL");
  }
  return result.value;
}

export async function safeMediaFetch(
  rawUrl: string,
  options: SafeMediaFetchOptions,
): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxRedirects = options.maxRedirects ?? 2;
  const timeoutMs = options.timeoutMs ?? 10_000;
  let currentUrl = validatedRemoteUrl(rawUrl, options.allowedOrigins);

  for (let redirects = 0; ; redirects += 1) {
    const controller = new AbortController();
    const onAbort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetchImpl(currentUrl, {
        method: options.method,
        headers: options.headers,
        redirect: "manual",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
    }

    if (!REDIRECT_STATUSES.has(response.status)) return response;
    if (redirects >= maxRedirects) throw new Error("too many media redirects");

    const location = response.headers.get("location");
    if (!location) throw new Error("invalid media redirect");
    currentUrl = validatedRemoteUrl(new URL(location, currentUrl).toString(), options.allowedOrigins);
  }
}
