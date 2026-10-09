"use client"

import { useActionState } from "react"
import type { ActionState } from "@/lib/action-state"

export interface ApplyButtonProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
}

export function ApplyButton({ action }: ApplyButtonProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, { ok: false })

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white">
          {pending ? "应用中…" : "应用并重启 dnsmasq"}
        </button>
      </form>

      {state.message ? (
        <div className="space-y-1 text-sm">
          <p
            className={state.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
            {state.message}
          </p>
          {state.detail ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{state.detail}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
