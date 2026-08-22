import { Copy } from "lucide-react"

import { Button } from "@/components/ui/button"

export function PublicTripCopySeam({ tripId }: { tripId: string }) {
  return (
    <section
      aria-labelledby="copy-trip-heading"
      className="rounded-2xl border bg-muted/30 p-5"
      data-copy-source-trip-id={tripId}
    >
      <h2 id="copy-trip-heading" className="font-semibold">
        Make this route your own
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Trip Copy will create an independent private plan without memberships or sharing settings.
      </p>
      <Button className="mt-4" disabled type="button" variant="outline">
        <Copy aria-hidden="true" /> Copy this Trip — coming soon
      </Button>
    </section>
  )
}
