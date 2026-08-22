import { createFileRoute } from "@tanstack/react-router"

import { CreateTrip } from "@/features/trips/CreateTrip"

export const Route = createFileRoute("/trips/new")({
  component: CreateTrip,
})
