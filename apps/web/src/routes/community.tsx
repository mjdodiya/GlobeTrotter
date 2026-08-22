import { createFileRoute } from "@tanstack/react-router"

import { Community } from "@/features/community/Community"

export const Route = createFileRoute("/community")({ component: Community })
