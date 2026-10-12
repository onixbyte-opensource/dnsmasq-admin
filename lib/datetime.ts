import dayjs from "dayjs"

/** Single format used everywhere a timestamp is rendered, so the UI stays consistent. */
const DISPLAY_FORMAT = "YYYY-MM-DD HH:mm:ss"

/**
 * Format a stored timestamp for display.
 *
 * Every timestamp carries an explicit `+00:00` offset (see prisma/migrations/0002), so dayjs
 * always resolves the correct instant; it then renders it in the viewer's local zone. Before
 * that migration the values looked like `2026-10-09 08:55:10`, which JavaScript parses as
 * *local* time even though SQLite stored it UTC — an eight-hour error on a UTC+8 machine.
 *
 * Timestamps travel through the app as ISO strings (see lib/db.ts), so this helper takes a
 * string rather than a `Date`.
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—"
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format(DISPLAY_FORMAT) : value
}
