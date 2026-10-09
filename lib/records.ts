import { io } from "next/cache"
import { execute, queryRow, queryRows, rowToRecord, type DnsRecord } from "./db"
import type { RecordInput } from "./validate"

const SELECT_ALL = "SELECT * FROM records"

export class DuplicateDomainError extends Error {
  constructor(readonly domain: string) {
    super(`domain already exists: ${domain}`)
    this.name = "DuplicateDomainError"
  }
}

function isUniqueViolation(error: unknown): boolean {
  const { code, message } = (error ?? {}) as { code?: string; message?: string }
  return (
    code === "SQLITE_CONSTRAINT_UNIQUE" ||
    code === "SQLITE_CONSTRAINT_PRIMARYKEY" ||
    String(message ?? "").includes("UNIQUE constraint failed")
  )
}

/**
 * Reads go through `await io()`.
 *
 * `node:sqlite` is a synchronous driver, so under `cacheComponents` its results would
 * otherwise be captured into the prerendered static shell at build time and the page would
 * show stale rows forever. `io()` suspends during prerender so the read happens at request
 * time. See node_modules/next/dist/docs/01-app/03-api-reference/04-functions/io.md.
 */
export async function listRecords(): Promise<DnsRecord[]> {
  await io()
  return queryRows(`${SELECT_ALL} ORDER BY domain COLLATE NOCASE`).map(rowToRecord)
}

export async function getRecord(id: number): Promise<DnsRecord | null> {
  await io()
  const row = queryRow(`${SELECT_ALL} WHERE id = ?`, id)
  return row ? rowToRecord(row) : null
}

export async function listEnabledRecords(): Promise<DnsRecord[]> {
  await io()
  return queryRows(`${SELECT_ALL} WHERE enabled = 1 ORDER BY domain COLLATE NOCASE`).map(rowToRecord)
}

// Writes below only ever run inside Server Actions, which always execute at request time,
// so they do not need an `io()` guard.

export function createRecord(input: RecordInput): void {
  try {
    execute(
      "INSERT INTO records (domain, type, value, enabled, comment) VALUES (?, ?, ?, ?, ?)",
      input.domain,
      input.type,
      input.value,
      input.enabled ? 1 : 0,
      input.comment
    )
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateDomainError(input.domain)
    throw error
  }
}

export function updateRecord(id: number, input: RecordInput): void {
  try {
    execute(
      `UPDATE records
         SET domain = ?, type = ?, value = ?, enabled = ?, comment = ?, updated_at = datetime('now')
       WHERE id = ?`,
      input.domain,
      input.type,
      input.value,
      input.enabled ? 1 : 0,
      input.comment,
      id
    )
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateDomainError(input.domain)
    throw error
  }
}

export function removeRecord(id: number): void {
  execute("DELETE FROM records WHERE id = ?", id)
}

export function setRecordEnabled(id: number, enabled: boolean): void {
  execute("UPDATE records SET enabled = ?, updated_at = datetime('now') WHERE id = ?", enabled ? 1 : 0, id)
}
