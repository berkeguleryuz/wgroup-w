CREATE TABLE IF NOT EXISTS "rateLimit" (
  id TEXT NOT NULL,
  key TEXT NOT NULL,
  count INTEGER NOT NULL,
  "lastRequest" BIGINT NOT NULL,
  CONSTRAINT "rateLimit_pkey" PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS "rateLimit_key_key"
  ON "rateLimit" (key);

CREATE TABLE IF NOT EXISTS "PublicRateLimit" (
  key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicRateLimit_pkey" PRIMARY KEY (key)
);

CREATE INDEX IF NOT EXISTS "PublicRateLimit_windowStart_idx"
  ON "PublicRateLimit" ("windowStart");

ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rateLimit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PublicRateLimit" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "_prisma_migrations" FROM anon, authenticated;
REVOKE ALL ON TABLE "rateLimit" FROM anon, authenticated;
REVOKE ALL ON TABLE "PublicRateLimit" FROM anon, authenticated;
