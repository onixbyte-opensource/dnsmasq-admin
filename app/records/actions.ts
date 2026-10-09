"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { ActionState } from "@/lib/action-state"
import { writeManagedConfig } from "@/lib/dnsmasq-config"
import { restartDnsmasqContainer } from "@/lib/docker"
import {
  DuplicateDomainError,
  createRecord,
  listEnabledRecords,
  removeRecord,
  setRecordEnabled,
  updateRecord,
} from "@/lib/records"
import { parseRecordForm } from "@/lib/validate"

const RECORDS_PATH = "/records"

function readId(formData: FormData): number | null {
  const raw = formData.get("id")
  const id = typeof raw === "string" ? Number(raw) : NaN
  return Number.isInteger(id) && id > 0 ? id : null
}

function asDuplicateState(error: unknown): ActionState | null {
  if (error instanceof DuplicateDomainError) {
    return { ok: false, fieldErrors: { domain: `域名 ${error.domain} 已存在` } }
  }
  return null
}

export async function createRecordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseRecordForm(formData)
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors }

  try {
    createRecord(parsed.input)
  } catch (error) {
    const duplicate = asDuplicateState(error)
    if (duplicate) return duplicate
    throw error
  }

  revalidatePath(RECORDS_PATH)
  redirect(RECORDS_PATH)
}

export async function updateRecordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = readId(formData)
  if (id === null) return { ok: false, message: "记录不存在，可能已被删除" }

  const parsed = parseRecordForm(formData)
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors }

  try {
    updateRecord(id, parsed.input)
  } catch (error) {
    const duplicate = asDuplicateState(error)
    if (duplicate) return duplicate
    throw error
  }

  revalidatePath(RECORDS_PATH)
  redirect(RECORDS_PATH)
}

export async function deleteRecordAction(formData: FormData): Promise<void> {
  const id = readId(formData)
  if (id === null) return
  removeRecord(id)
  revalidatePath(RECORDS_PATH)
}

export async function toggleRecordAction(formData: FormData): Promise<void> {
  const id = readId(formData)
  if (id === null) return
  // The hidden field carries the state this record should move *to*.
  setRecordEnabled(id, formData.get("enabled") === "1")
  revalidatePath(RECORDS_PATH)
}

/**
 * Regenerate the managed dnsmasq config from SQLite and restart the container.
 *
 * Deliberately manual rather than automatic, so several edits can be batched into one
 * restart (see the plan: 手动应用并重启).
 */
export async function applyConfigAction(
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const written = await writeManagedConfig(await listEnabledRecords())
  const reload = await restartDnsmasqContainer()

  revalidatePath(RECORDS_PATH)

  const writtenMessage = `已写入 ${written.recordCount} 条记录到 ${written.path}`

  if (reload.status === "restarted") {
    return { ok: true, message: `${writtenMessage}，${reload.detail}` }
  }

  if (reload.status === "skipped") {
    return { ok: true, message: writtenMessage, detail: reload.detail }
  }

  return { ok: false, message: `${writtenMessage}，但重启失败`, detail: reload.detail }
}
