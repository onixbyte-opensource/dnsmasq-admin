import { io } from "next/cache"
import { Prisma } from "./generated/prisma/client"
import { getDb, toDnsRecord, type DnsRecord } from "./db"
import type { RecordInput } from "./validate"

export class DuplicateDomainError extends Error {
  constructor(readonly domain: string) {
    super(`domain already exists: ${domain}`)
    this.name = "DuplicateDomainError"
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2002"
  }
  // Raw driver errors can still surface from statements outside the query builder.
  const { code, message } = (error ?? {}) as { code?: string; message?: string }
  return (
    code === "SQLITE_CONSTRAINT_UNIQUE" ||
    code === "SQLITE_CONSTRAINT_PRIMARYKEY" ||
    String(message ?? "").includes("UNIQUE constraint failed")
  )
}

/**
 * Case-insensitive domain ordering.
 *
 * `domain` no longer carries COLLATE NOCASE (see prisma/migrations/0001_baseline), so SQLite
 * would order by binary collation and put "Zoo.local" before "apple.local". Sorting here also
 * keeps results identical between databases created before that change and after it.
 */
const byDomain = (a: DnsRecord, b: DnsRecord): number =>
  a.domain.localeCompare(b.domain, undefined, { sensitivity: "base" })

/**
 * Reads must still call `await io()` even though Prisma is asynchronous.
 *
 * Next only bails out of prerendering for *sources it recognises* — `fetch`, the request-time
 * APIs like `cookies()`, or an explicit `io()`. Prisma over better-sqlite3 is a bespoke async
 * driver, so during a build its queries simply resolve and get baked into the static shell:
 * verified by grepping the built `.next/server/app/records.html`, which contained real rows
 * until this guard was restored. The symptom is a page that renders build-time data forever.
 *
 * Worth knowing before "tidying" this away simply because the driver is async: the docs'
 * exemption covers an awaited *fetch*, not every awaited promise.
 * See node_modules/next/dist/docs/01-app/03-api-reference/04-functions/io.md.
 *
 * Callers wrap these in `<Suspense>`, so the shell ships the fallback and rows stream in per
 * request.
 */
export async function listRecords(): Promise<DnsRecord[]> {
  await io()
  const rows = await getDb().dnsRecord.findMany({ orderBy: { domain: "asc" } })
  return rows.map(toDnsRecord).sort(byDomain)
}

export async function getRecord(id: number): Promise<DnsRecord | null> {
  await io()
  const row = await getDb().dnsRecord.findUnique({ where: { id } })
  return row ? toDnsRecord(row) : null
}

export async function listEnabledRecords(): Promise<DnsRecord[]> {
  await io()
  const rows = await getDb().dnsRecord.findMany({
    where: { enabled: true },
    orderBy: { domain: "asc" },
  })
  return rows.map(toDnsRecord).sort(byDomain)
}

// Writes below run inside Server Actions, which always execute at request time.
//
// They use `updateMany`/`deleteMany` rather than `update`/`delete` deliberately: those raise
// P2025 when the row is gone, which would turn "someone deleted this in another tab" into a
// crashed action. The pre-Prisma code was a plain UPDATE/DELETE that quietly matched zero
// rows, so this keeps that behaviour. @updatedAt is still applied by both.

export async function createRecord(input: RecordInput): Promise<void> {
  try {
    await getDb().dnsRecord.create({
      data: {
        domain: input.domain,
        type: input.type,
        value: input.value,
        enabled: input.enabled,
        comment: input.comment,
      },
    })
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateDomainError(input.domain)
    throw error
  }
}

export async function updateRecord(id: number, input: RecordInput): Promise<void> {
  try {
    await getDb().dnsRecord.updateMany({
      where: { id },
      data: {
        domain: input.domain,
        type: input.type,
        value: input.value,
        enabled: input.enabled,
        comment: input.comment,
      },
    })
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateDomainError(input.domain)
    throw error
  }
}

export async function removeRecord(id: number): Promise<void> {
  await getDb().dnsRecord.deleteMany({ where: { id } })
}

export async function setRecordEnabled(id: number, enabled: boolean): Promise<void> {
  await getDb().dnsRecord.updateMany({ where: { id }, data: { enabled } })
}
