import { mkdirSync } from "node:fs"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"
import { env } from "./env"

export type RecordType = "A" | "CNAME"

export interface DnsRecord {
  id: number
  domain: string
  type: RecordType
  value: string
  enabled: boolean
  comment: string
  createdAt: string
  updatedAt: string
}

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS records (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  domain     TEXT NOT NULL COLLATE NOCASE UNIQUE,
  type       TEXT NOT NULL CHECK (type IN ('A','CNAME')),
  value      TEXT NOT NULL,
  enabled    INTEGER NOT NULL DEFAULT 1,
  comment    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`

function openDatabase(): DatabaseSync {
  mkdirSync(path.dirname(env.dbPath), { recursive: true })
  const db = new DatabaseSync(env.dbPath)
  // WAL keeps reads from blocking writes; busy_timeout lets concurrent connections wait
  // instead of failing immediately with SQLITE_BUSY.
  db.exec("PRAGMA journal_mode = WAL")
  db.exec("PRAGMA busy_timeout = 5000")
  db.exec(CREATE_TABLE)
  return db
}

// Cached on globalThis so Next.js dev HMR does not leak a new handle per reload.
const globalForDb = globalThis as typeof globalThis & {
  __dnsmasqAdminDb?: DatabaseSync
}

export function getDb(): DatabaseSync {
  globalForDb.__dnsmasqAdminDb ??= openDatabase()
  return globalForDb.__dnsmasqAdminDb
}

type Row = Record<string, unknown>

/** Normalise whatever the driver hands back into a well-typed record. */
function rowsOf(result: unknown): Row[] {
  return Array.isArray(result) ? (result as Row[]) : []
}

export function rowToRecord(row: Row): DnsRecord {
  return {
    id: Number(row.id),
    domain: String(row.domain),
    type: row.type === "CNAME" ? "CNAME" : "A",
    value: String(row.value),
    enabled: Number(row.enabled) === 1,
    comment: String(row.comment ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function queryRows(sql: string, ...params: unknown[]): Row[] {
  return rowsOf(getDb().prepare(sql).all(...params))
}

export function queryRow(sql: string, ...params: unknown[]): Row | null {
  const row = getDb().prepare(sql).get(...params)
  return row && typeof row === "object" ? (row as Row) : null
}

export function execute(sql: string, ...params: unknown[]): void {
  getDb().prepare(sql).run(...params)
}
