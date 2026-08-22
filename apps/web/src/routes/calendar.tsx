import { createFileRoute } from "@tanstack/react-router"

import { Calendar } from "@/features/calendar/Calendar"

export const Route = createFileRoute("/calendar")({ component: Calendar })
