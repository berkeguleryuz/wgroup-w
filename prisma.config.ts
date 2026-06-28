import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Prisma CLI (migrate / db push / db pull / studio) must use a DIRECT
  // connection. The Supabase transaction pooler (pgbouncer, port 6543) does
  // not support the session-level locks DDL needs, so CLI commands hang on it.
  // Runtime queries still go through the pooler via the PrismaPg adapter in
  // lib/prisma.ts (process.env.DATABASE_URL); this url only affects the CLI.
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
