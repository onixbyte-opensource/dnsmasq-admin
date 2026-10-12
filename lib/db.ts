import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaClient } from "./generated/prisma/client"
import type { DnsRecordModel } from "./generated/prisma/models"
import { env } from "./env"

export type RecordType = "A" | "CNAME"

/**
 * The row Prisma hands back, with `type` narrowed to the union this app actually allows.
 *
 * SQLite has no enum support, so the generated field is a plain string even though every
 * path that writes it goes through lib/validate.ts. Narrowing here keeps the rest of the app
 * type-safe without pretending the database enforces it.
 */
export type DnsRecord = Omit<DnsRecordModel, "type" | "createdAt" | "updatedAt"> & {
  type: RecordType
  createdAt: string
  updatedAt: string
}

/** Narrow a database string into RecordType, defaulting to `A` like the old mapper did. */
export function toRecordType(value: string): RecordType {
  return value === "CNAME" ? "CNAME" : "A"
}

/**
 * Timestamps travel through the app as ISO strings rather than `Date`.
 *
 * They are stored UTC with an explicit `+00:00` offset (see prisma/migrations/0002), so an
 * ISO string round-trips unambiguously, whereas a `Date` crossing the Server Component /
 * Client Component boundary invites accidental local-time formatting in the wrong place.
 * Use lib/datetime.ts to render one.
 */
export function toTimestamp(value: Date): string {
  return value.toISOString()
}

export function toDnsRecord(row: DnsRecordModel): DnsRecord {
  return {
    id: row.id,
    domain: row.domain,
    type: toRecordType(row.type),
    value: row.value,
    enabled: row.enabled,
    comment: row.comment,
    createdAt: toTimestamp(row.createdAt),
    updatedAt: toTimestamp(row.updatedAt),
  }
}

function createClient(): PrismaClient {
  // The adapter strips the `file:` prefix before handing the path to better-sqlite3.
  // `timeout` maps to busy_timeout and already defaults to 5000, which is what this app used
  // before; listed explicitly so the behaviour survives a driver default change.
  const adapter = new PrismaBetterSqlite3({ url: env.databaseUrl, timeout: 5000 })
  return new PrismaClient({ adapter })
}

// Cached on globalThis so Next.js dev HMR does not open a new handle per reload; see the
// journal_mode migration note below for why one long-lived handle matters here.
const globalForDb = globalThis as typeof globalThis & {
  __dnsmasqAdminPrisma?: PrismaClient
}

export function getDb(): PrismaClient {
  globalForDb.__dnsmasqAdminPrisma ??= createClient()
  return globalForDb.__dnsmasqAdminPrisma
}
