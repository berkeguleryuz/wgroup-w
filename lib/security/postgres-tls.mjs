const SUPABASE_HOST_SUFFIX = ".supabase.co";

function isSupabaseConnection(connectionString) {
  if (!connectionString) return false;

  try {
    return new URL(connectionString).hostname.endsWith(SUPABASE_HOST_SUFFIX);
  } catch {
    throw new Error("PostgreSQL connection string is invalid");
  }
}

function decodeCertificate(caBase64) {
  if (!caBase64?.trim()) {
    throw new Error(
      "DATABASE_CA_CERT_BASE64 is required when DATABASE_SSL_MODE=verify-full",
    );
  }

  const certificate = Buffer.from(caBase64, "base64").toString("utf8").trim();
  if (
    !certificate.includes("-----BEGIN CERTIFICATE-----") ||
    !certificate.includes("-----END CERTIFICATE-----")
  ) {
    throw new Error("DATABASE_CA_CERT_BASE64 must contain a base64 encoded PEM certificate");
  }

  return certificate;
}

export function resolvePostgresSsl({
  connectionString,
  mode = "require",
  caBase64,
  onWarning = console.warn,
}) {
  if (!isSupabaseConnection(connectionString)) return undefined;

  const normalizedMode = mode?.trim().toLowerCase() || "require";
  if (normalizedMode === "verify-full") {
    return {
      rejectUnauthorized: true,
      ca: decodeCertificate(caBase64),
    };
  }

  if (normalizedMode === "require") {
    onWarning(
      "Supabase PostgreSQL TLS is encrypted but the server certificate is not verified. Set DATABASE_SSL_MODE=verify-full and DATABASE_CA_CERT_BASE64.",
    );
    return { rejectUnauthorized: false };
  }

  throw new Error("DATABASE_SSL_MODE must be require or verify-full");
}
