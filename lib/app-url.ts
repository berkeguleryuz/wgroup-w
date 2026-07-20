export type AppUrlEnvironment = {
  BETTER_AUTH_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
};

const LOCAL_APP_URL = "http://localhost:3000";

function normalizeHttpUrl(value: string, variableName: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variableName} must be an absolute URL`);
  }

  
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${variableName} must use http or https`);
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(`${variableName} must not contain credentials, query, or hash`);
  }

  return url.toString().replace(/\/+$/, "");
}

function firstValue(
  candidates: Array<[keyof AppUrlEnvironment, string | undefined]>,
) {
  for (const [name, rawValue] of candidates) {
    const value = rawValue?.trim();
    if (value) return normalizeHttpUrl(value, name);
  }
  return LOCAL_APP_URL;
}

export function resolveAuthBaseUrl(
  env: AppUrlEnvironment = {
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
): string {
  return firstValue([
    ["BETTER_AUTH_URL", env.BETTER_AUTH_URL],
    ["NEXT_PUBLIC_APP_URL", env.NEXT_PUBLIC_APP_URL],
  ]);
}

export function resolvePublicAppUrl(
  env: AppUrlEnvironment = {
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
): string {
  return firstValue([
    ["NEXT_PUBLIC_APP_URL", env.NEXT_PUBLIC_APP_URL],
    ["BETTER_AUTH_URL", env.BETTER_AUTH_URL],
  ]);
}
