import { createFileRoute } from "@tanstack/react-router"

import { TripDetails } from "@/features/trips/TripDetails"

export const Route = createFileRoute("/trips/$tripId")({
  component: TripDetails,
})
