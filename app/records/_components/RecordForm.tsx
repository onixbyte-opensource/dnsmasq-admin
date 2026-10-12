"use client"

import Link from "next/link"
import { useActionState, useEffect } from "react"
import type { ActionState } from "@/lib/action-state"
import type { DnsRecord } from "@/lib/db"
import { notifyFailure } from "@/lib/notify"

const fieldClass =
  "w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-white/15 dark:bg-white/5 dark:text-zinc-100"

const labelClass = "block text-sm font-medium text-zinc-700 dark:text-zinc-300"

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-600 dark:text-red-400">{message}</p>
}

export interface RecordFormProps {
  /** Server Action to run on submit: either create or update, both bound to this form. */
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
  record?: DnsRecord
  submitLabel: string
  cancelHref: string
}

export function RecordForm({ action, record, submitLabel, cancelHref }: RecordFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, { ok: false })
  const errors = state.fieldErrors ?? {}

  // Form-level failures (e.g. the record was deleted before the save landed) go out as
  // toasts; per-field errors stay inline next to the input they describe.
  useEffect(() => {
    if (state.message) notifyFailure(state.message)
  }, [state])

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {record ? <input type="hidden" name="id" value={record.id} /> : null}

      <div>
        <label className={labelClass} htmlFor="domain">
          域名
        </label>
        <input
          id="domain"
          name="domain"
          className={fieldClass}
          defaultValue={record?.domain}
          placeholder="nas.home"
          autoComplete="off"
          spellCheck={false}
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          无需通配符：dnsmasq 的 <code>address=/域名/</code> 已自动覆盖其所有子域名。
        </p>
        <FieldError message={errors.domain} />
      </div>

      <div>
        <label className={labelClass} htmlFor="type">
          记录类型
        </label>
        <select id="type" name="type" className={fieldClass} defaultValue={record?.type ?? "A"}>
          <option value="A">A（域名 → IPv4）</option>
          <option value="CNAME">CNAME（别名 → 域名）</option>
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="value">
          目标值
        </label>
        <input
          id="value"
          name="value"
          className={fieldClass}
          defaultValue={record?.value}
          placeholder="192.168.1.10"
          autoComplete="off"
          spellCheck={false}
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          A 记录填 IPv4 地址，CNAME 记录填目标域名。
        </p>
        <FieldError message={errors.value} />
      </div>

      <div>
        <label className={labelClass} htmlFor="comment">
          备注
        </label>
        <input
          id="comment"
          name="comment"
          className={fieldClass}
          defaultValue={record?.comment}
          placeholder="选填"
        />
        <FieldError message={errors.comment} />
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={record ? record.enabled : true}
          className="size-4 accent-zinc-900 dark:accent-zinc-100"
        />
        启用（取消勾选则不会写入配置文件）
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white">
          {pending ? "保存中…" : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="rounded-md border border-black/10 px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-black/5 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/5">
          取消
        </Link>
      </div>
    </form>
  )
}
