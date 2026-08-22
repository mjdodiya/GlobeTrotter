import { createFileRoute } from "@tanstack/react-router"

import { BuildItinerary } from "@/features/itinerary/BuildItinerary"

export const Route = createFileRoute("/trips/new/build")({
  component: BuildItinerary,
})
