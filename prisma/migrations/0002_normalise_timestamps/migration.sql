-- Rewrite timestamps written by the v0.1.0 schema into the format Prisma expects.
--
-- Background: the old column default was `datetime('now')`, producing values like
-- `2026-10-09 08:55:10`. SQLite stores that UTC, but JavaScript parses the space-separated
-- form as *local* time — on a UTC+8 machine `new Date('2026-10-09 08:55:10')` yields
-- 00:55:10Z, silently off by eight hours. Prisma 7's better-sqlite3 adapter writes
-- `2026-10-09T08:55:10.000+00:00` instead, which is unambiguous.
--
-- Leaving old rows in the legacy format would give one column two different parse rules
-- depending on when the row was created, so every existing row is normalised here.
--
-- Idempotent: the WHERE clause skips anything already in ISO shape, so this is a no-op on
-- freshly migrated databases and safe to re-run.
UPDATE "records"
SET
    "created_at" = strftime('%Y-%m-%dT%H:%M:%S.000+00:00', "created_at"),
    "updated_at" = strftime('%Y-%m-%dT%H:%M:%S.000+00:00', "updated_at")
WHERE "created_at" NOT LIKE '____-__-__T%';
