"use client"

import { useActionState, useEffect } from "react"
import type { ActionState } from "@/lib/action-state"
import { notifyFailure, notifySuccess, notifyWarning } from "@/lib/notify"

export interface ApplyButtonProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
}

// Result messages now arrive as toasts instead of text under the button, so the card never
// grows and nothing has to be dismissed by hand.
const INITIAL: ActionState = { ok: false }

export function ApplyButton({ action }: ApplyButtonProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, INITIAL)

  // Every run of the action returns a fresh object, so this fires exactly once per
  // submission — and stays quiet on mount, where `state` carries no message yet.
  useEffect(() => {
    if (!state.message) return

    // A success that also carries `detail` means the config was written but the restart was
    // skipped (see applyConfigAction) — that deserves a warning, not a green tick. When the
    // restart failed outright, the detail is the reason, so it joins the message.
    if (state.ok) {
      if (state.detail) notifyWarning(`${state.message}（${state.detail}）`)
      else notifySuccess(state.message)
      return
    }
    notifyFailure(state.detail ? `${state.message}：${state.detail}` : state.message)
  }, [state])

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white">
        {pending ? "应用中…" : "应用并重启 dnsmasq"}
      </button>
    </form>
  )
}
