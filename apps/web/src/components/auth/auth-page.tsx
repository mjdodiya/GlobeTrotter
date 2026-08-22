import type { ReactNode } from "react"

export function AuthPage({
  children,
  description,
  eyebrow,
  footer,
  title,
}: {
  children: ReactNode
  description: string
  eyebrow: string
  footer?: ReactNode
  title: string
}) {
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-2 lg:items-center lg:px-8">
      <div className="min-w-0 space-y-4">
        <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {eyebrow}
        </p>
        <h1
          data-route-heading
          tabIndex={-1}
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          {title}
        </h1>
        <p className="max-w-xl text-pretty text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0 rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
        {children}
        {footer ? (
          <div className="mt-5 border-t pt-5 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </div>
    </section>
  )
}
