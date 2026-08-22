import { useEffect, useRef, type ReactNode } from "react"

import { cn } from "@/lib/utils"

export type AuthActionResult<TField extends string = string> =
  | { ok: true }
  | { field?: TField; message: string; ok: false }

export function describedBy(...identifiers: Array<string | false | undefined>): string | undefined {
  const value = identifiers.filter(Boolean).join(" ")
  return value || undefined
}

export function emailValidationMessage(email: string): string | undefined {
  if (!email) return "Enter your email address."
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address."
  return undefined
}

export function focusFormField(form: HTMLFormElement, name: string): void {
  const field = form.elements.namedItem(name)
  if (field instanceof HTMLElement) field.focus()
}

export function FocusedStatus({
  children,
  className,
  role = "status",
}: {
  children: ReactNode
  className?: string
  role?: "alert" | "status"
}) {
  const status = useRef<HTMLDivElement>(null)

  useEffect(() => {
    status.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div
      ref={status}
      role={role}
      tabIndex={-1}
      className={cn(
        "rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm outline-none",
        className,
      )}
    >
      {children}
    </div>
  )
}
