import { MailCheck } from "lucide-react"

import { Button } from "@/components/ui/button"

export function VerificationBanner({ email }: { email: string }) {
  const href = `/verify-email?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(
    window.location.pathname + window.location.search + window.location.hash,
  )}`

  return (
    <aside className="mb-6 flex min-w-0 flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <MailCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-medium">Verify your email</p>
          <p className="text-sm text-pretty break-all text-muted-foreground">
            Verify {email} before you publish a Trip or invite a direct collaborator.
          </p>
        </div>
      </div>
      <Button asChild variant="outline" className="shrink-0">
        <a href={href}>Verify email</a>
      </Button>
    </aside>
  )
}
