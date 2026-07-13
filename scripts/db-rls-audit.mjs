import "dotenv/config";

import pg from "pg";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const protectedTables = [
  "TitleDepartment",
  "OrganizationHiddenTitle",
  "AgentQuota",
  "TranscodeJob",
];

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required");
}

const client = new pg.Client({
  connectionString,
  ssl: connectionString.includes("supabase.co")
    ? { rejectUnauthorized: false }
    : undefined,
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
