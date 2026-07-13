import "dotenv/config";

import { createHash } from "node:crypto";
import pg from "pg";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

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
  const counts = {};
  for (const table of ["user", "organization", "Title", "Episode"]) {
    const result = await client.query(`SELECT count(*)::int AS count FROM "${table}"`);
    counts[table] = result.rows[0].count;
  }

  const media = await client.query(`
    SELECT 'episode' AS kind, id, "videoPath" AS ref
      FROM "Episode"
     WHERE "videoPath" <> ''
    UNION ALL
    SELECT 'title-image' AS kind, id, "heroImageUrl" AS ref
      FROM "Title"
     WHERE "heroImageUrl" IS NOT NULL AND "heroImageUrl" <> ''
    UNION ALL
    SELECT 'title-trailer' AS kind, id, "trailerUrl" AS ref
      FROM "Title"
     WHERE "trailerUrl" IS NOT NULL AND "trailerUrl" <> ''
    ORDER BY kind, id, ref
  `);
  const mediaDigest = createHash("sha256")
    .update(JSON.stringify(media.rows))
    .digest("hex");

  console.log(
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        counts,
        mediaReferenceCount: media.rowCount,
        mediaReferenceSha256: mediaDigest,
      },
      null,
      2,
    ),
  );
  await client.query("ROLLBACK");
} finally {
  await client.end();
}
