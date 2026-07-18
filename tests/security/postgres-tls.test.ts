import assert from "node:assert/strict";
import test from "node:test";

import { resolvePostgresSsl } from "../../lib/security/postgres-tls.mjs";

const supabaseUrl =
  "postgresql://user:password@db.example.supabase.co:5432/postgres";
const testCertificate = [
  "-----BEGIN CERTIFICATE-----",
  "dGVzdC1jZXJ0aWZpY2F0ZQ==",
  "-----END CERTIFICATE-----",
].join("\n");

test("leaves non-Supabase connection TLS to the connection string", () => {
  assert.equal(
    resolvePostgresSsl({
      connectionString: "postgresql://localhost:5432/postgres",
    }),
    undefined,
  );
});

test("enables certificate verification with a supplied Supabase CA", () => {
  assert.deepEqual(
    resolvePostgresSsl({
      connectionString: supabaseUrl,
      mode: "verify-full",
      caBase64: Buffer.from(testCertificate).toString("base64"),
    }),
    { rejectUnauthorized: true, ca: testCertificate },
  );
});

test("verify-full fails clearly without a Supabase CA", () => {
  assert.throws(
    () => resolvePostgresSsl({
      connectionString: supabaseUrl,
      mode: "verify-full",
    }),
    /DATABASE_CA_CERT_BASE64/,
  );
});

test("require mode keeps encrypted compatibility and emits a warning", () => {
  const warnings: string[] = [];
  assert.deepEqual(
    resolvePostgresSsl({
      connectionString: supabaseUrl,
      mode: "require",
      onWarning: (message) => warnings.push(message),
    }),
    { rejectUnauthorized: false },
  );
  assert.equal(warnings.length, 1);
});
