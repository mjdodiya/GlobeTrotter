import { createFileRoute } from "@tanstack/react-router"

import { ActivitySearch } from "@/features/activities/ActivitySearch"

export const Route = createFileRoute("/activities")({
  component: ActivitySearch,
})
