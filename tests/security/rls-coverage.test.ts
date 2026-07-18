import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

function prismaTableNames(schema: string) {
  return [...schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)].map(
    ([, modelName, body]) => {
      const mappedName = body.match(/@@map\("([^"]+)"\)/)?.[1];
      return mappedName ?? modelName;
    },
  );
}

function rlsTableNames(sql: string) {
  return [
    ...sql.matchAll(
      /alter\s+table\s+(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))\s+enable\s+row\s+level\s+security/gi,
    ),
  ].map((match) => match[1] ?? match[2]);
}

test("the RLS manifest covers every Prisma model", () => {
  const models = prismaTableNames(readFileSync("prisma/schema.prisma", "utf8"));
  const protectedTables = new Set(
    rlsTableNames(readFileSync("prisma/rls.sql", "utf8")),
  );

  assert.deepEqual(
    models.filter((table) => !protectedTables.has(table)),
    [],
  );
});

test("the RLS manifest protects migration and rate-limit metadata", () => {
  const protectedTables = new Set(
    rlsTableNames(readFileSync("prisma/rls.sql", "utf8")),
  );

  for (const table of ["_prisma_migrations", "rateLimit", "PublicRateLimit"]) {
    assert.equal(protectedTables.has(table), true, table);
  }
});

test("the live RLS audit derives its table list from the manifest", () => {
  const source = readFileSync("scripts/db-rls-audit.mjs", "utf8");

  assert.match(source, /prisma\/rls\.sql/);
  assert.doesNotMatch(source, /const protectedTables\s*=\s*\[/);
});

test("the migration history reproduces the RLS manifest and seat guard", () => {
  const manifestTables = rlsTableNames(
    readFileSync("prisma/rls.sql", "utf8"),
  );
  const migrationSql = readdirSync("prisma/migrations", {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) =>
      readFileSync(
        `prisma/migrations/${entry.name}/migration.sql`,
        "utf8",
      ),
    )
    .join("\n");
  const migratedTables = new Set(rlsTableNames(migrationSql));

  assert.deepEqual(
    manifestTables.filter((table) => !migratedTables.has(table)),
    [],
  );
  assert.match(migrationSql, /create\s+trigger\s+member_seat_limit/i);
});
