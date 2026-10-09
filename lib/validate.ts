import type { RecordType } from "./db"

export type FieldErrors = Record<string, string>

export interface RecordInput {
  domain: string
  type: RecordType
  value: string
  enabled: boolean
  comment: string
}

export type ParseResult =
  | { ok: true; input: RecordInput }
  | { ok: false; fieldErrors: FieldErrors }

const LABEL = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

/** Lowercase, trim surrounding space and drop a trailing dot (`nas.home.` -> `nas.home`). */
export function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\.+$/, "")
}

export function isValidDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false
  const labels = domain.split(".")
  if (labels.length === 0) return false
  return labels.every((label) => label.length > 0 && label.length <= 63 && LABEL.test(label))
}

export function isValidIPv4(value: string): boolean {
  const parts = value.trim().split(".")
  if (parts.length !== 4) return false
  return parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

/**
 * Validate a submitted record form. Used by both the create/update Server Actions and the
 * resolve page, so every user-supplied domain goes through the same rules.
 */
export function parseRecordForm(formData: FormData): ParseResult {
  const fieldErrors: FieldErrors = {}

  const domain = normalizeDomain(readText(formData, "domain"))
  if (!domain) {
    fieldErrors.domain = "请填写域名"
  } else if (!isValidDomain(domain)) {
    fieldErrors.domain = "域名格式不正确，例如 nas.home"
  }

  const rawType = readText(formData, "type")
  const type: RecordType = rawType === "CNAME" ? "CNAME" : "A"

  const value = normalizeDomain(readText(formData, "value"))
  if (!value) {
    fieldErrors.value = "请填写目标值"
  } else if (type === "A") {
    if (!isValidIPv4(value)) fieldErrors.value = "A 记录的目标必须是 IPv4 地址"
  } else if (!isValidDomain(value)) {
    fieldErrors.value = "CNAME 的目标必须是域名"
  } else if (value === domain) {
    fieldErrors.value = "CNAME 的目标不能指向自己"
  }

  const comment = readText(formData, "comment")
  if (comment.length > 200) fieldErrors.comment = "备注请控制在 200 字以内"

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors }

  return {
    ok: true,
    input: {
      domain,
      type,
      value,
      enabled: formData.get("enabled") !== null,
      comment,
    },
  }
}
