-- Baseline: the `records` table as Prisma itself generates it from prisma/schema.prisma.
--
-- This SQL is kept byte-identical to the output of
--   `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`
-- on purpose. The alternative — adding `COLLATE NOCASE` on `domain` and a
-- `CHECK (type IN ('A','CNAME'))` by hand — makes Prisma see permanent drift and propose a
-- DROP TABLE + rebuild migration the next time anyone runs `migrate dev`, which would silently
-- drop those very constraints. A clean diff is worth more here than the extra constraints,
-- because both properties are enforced elsewhere:
--
--   - case-insensitive uniqueness: lib/validate.ts lowercases every domain before it reaches
--     the database, so `FOO.com` and `foo.com` can never both be inserted;
--   - case-insensitive ordering: lib/records.ts sorts with localeCompare after fetching,
--     since SQLite would otherwise order by binary collation ('Zoo' before 'apple');
--   - the type whitelist: again lib/validate.ts, plus the generated union in lib/db.ts.
--
-- Existing databases installed before this migration already ran the earlier hand-written
-- version and keep their column-level COLLATE NOCASE; nothing about them changes.
CREATE TABLE "records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "domain" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "comment" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "records_domain_key" ON "records"("domain");
