// Shared button styling for the records table actions.
//
// These live in one module because the same look is used by the server-rendered edit link and
// toggle button in app/records/page.tsx and by the client DeleteButton component; keeping two
// copies would drift the moment one is restyled.

const base =
  "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50"

/** Default action: edit, enable/disable. Bordered so it reads as clickable without shouting. */
export const secondaryButtonClass = `${base} border border-black/10 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10`

/**
 * Toggle actions, tinted rather than outlined.
 *
 * The label flips with the record state, so colour follows what the click will *do* rather
 * than what the row currently is: putting a record into service reads green, taking one out
 * reads amber. Using the same white as `secondaryButtonClass` here made the two actions look
 * like one row of identical buttons.
 */
export const enableButtonClass = `${base} border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20`
export const disableButtonClass = `${base} border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20`

/**
 * Destructive action. Deliberately outlined rather than filled: deletion is confirmed in a
 * dialog first, and a solid red block would imply it is the primary action.
 */
export const dangerButtonClass = `${base} border border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-500/10`
