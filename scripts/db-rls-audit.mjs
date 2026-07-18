import "dotenv/config";

import { readFileSync } from "node:fs";
import pg from "pg";
import { resolvePostgresSsl } from "../lib/security/postgres-tls.mjs";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const rlsSql = readFileSync(
  new URL("../prisma/rls.sql", import.meta.url),
  "utf8",
);
const protectedTables = Array.from(
  new Set(
    [...rlsSql.matchAll(
      /alter\s+table\s+(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))\s+enable\s+row\s+level\s+security/gi,
    )].map((match) => match[1] ?? match[2]),
  ),
);

if (protectedTables.length === 0) {
  throw new Error("prisma/rls.sql does not declare any protected tables");
}

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required");
}

const client = new pg.Client({
  connectionString,
  ssl: resolvePostgresSsl({
    connectionString,
    mode: process.env.DATABASE_SSL_MODE,
    caBase64: process.env.DATABASE_CA_CERT_BASE64,
  }),
});

await client.connect();

try {
  await client.query("BEGIN READ ONLY");
  const result = await client.query(
    `SELECT relname AS table, relrowsecurity AS enabled
       FROM pg_class
      WHERE relnamespace = 'public'::regnamespace
        AND relname = ANY($1::text[])
      ORDER BY relname`,
    [protectedTables],
  );
  const states = Object.fromEntries(
    result.rows.map((row) => [row.table, row.enabled]),
  );
  console.log(JSON.stringify(states, null, 2));

  const missing = protectedTables.filter((table) => states[table] !== true);
  if (missing.length > 0) {
    throw new Error(`RLS is not enabled for: ${missing.join(", ")}`);
  }
  await client.query("ROLLBACK");
} finally {
  await client.end();
}
