import type { FieldErrors } from "./validate"

/**
 * Shared shape returned by every Server Action that a form consumes via `useActionState`.
 * Kept in its own module because a `'use server'` file may only export async functions.
 */
export interface ActionState {
  ok: boolean
  message?: string
  detail?: string
  fieldErrors?: FieldErrors
}
