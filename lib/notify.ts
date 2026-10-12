"use client"

import { Notify } from "notiflix/build/notiflix-notify-aio"

// The Notify AIO build ships its styles inline and injects them on first use, so unlike a
// React toaster there is no element to mount: configuring the module once here is the whole
// integration. Components call the notify* helpers below instead of touching notiflix, so
// placement, colouring and timing all live in this one module.

/** Failures carry detail worth reading, so they outlive the routine 3s default. */
const FAILURE_TIMEOUT_MS = 6000

// Notify has no dark-mode option of its own, so toasts are coloured with the same tinted
// palette the app already uses for status tags and buttons, switching on the same
// prefers-colour-scheme query globals.css does.
const toastTheme = {
  light: {
    success: { background: "#ecfdf5", textColor: "#047857" }, // emerald-50 / emerald-700
    warning: { background: "#fffbeb", textColor: "#b45309" }, // amber-50 / amber-700
    failure: { background: "#fef2f2", textColor: "#dc2626" }, // red-50 / red-600
  },
  dark: {
    success: { background: "rgba(16, 185, 129, 0.1)", textColor: "#34d399" }, // emerald-500/10 / emerald-400
    warning: { background: "rgba(245, 158, 11, 0.1)", textColor: "#fbbf24" }, // amber-500/10 / amber-400
    failure: { background: "rgba(239, 68, 68, 0.1)", textColor: "#f87171" }, // red-500/10 / red-400
  },
}

// Module bodies also run on the server during SSR, so guard the setup. The import itself is
// safe on the server — Notiflix only touches the DOM when a toast is actually shown.
if (typeof window !== "undefined") {
  const dark = window.matchMedia("(prefers-color-scheme: dark)")

  const applyTheme = () => {
    const theme = dark.matches ? toastTheme.dark : toastTheme.light
    Notify.init({
      position: "right-top",
      // The 280px default squeezes the file paths in apply messages onto too many lines.
      width: "400px",
      // Messages wrap rather than widen the toast, and file paths show up in them, so allow
      // well past the 110-character default before Notiflix starts truncating.
      messageMaxLength: 500,
      success: theme.success,
      warning: theme.warning,
      failure: theme.failure,
    })
  }

  applyTheme()
  // Track the OS theme if it changes while the page is open.
  dark.addEventListener("change", applyTheme)
}

export function notifySuccess(message: string) {
  Notify.success(message)
}

export function notifyWarning(message: string) {
  Notify.warning(message)
}

export function notifyFailure(message: string) {
  // Per-type options cannot carry a timeout (it is read from the common settings only), so
  // the longer delay is applied per call.
  Notify.failure(message, { timeout: FAILURE_TIMEOUT_MS })
}
