import { Hono } from "hono"

import type { ApiDependencies, ApiEnvironment } from "../context.ts"
import { requireSession } from "../middleware/authentication.ts"
import { createCatalogRoutes } from "./catalog.ts"
import { createDashboardRoutes } from "./dashboard.ts"
import { createItemRoutes } from "./items.ts"
import { createLegRoutes } from "./legs.ts"
import { createMeRoutes } from "./me.ts"
import { createMemberRoutes } from "./members.ts"
import { createPublicTripRoutes } from "./public-trips.ts"
import { createRateRoutes } from "./rates.ts"
import { createLinkSharedTripRoutes, createShareLinkRoutes } from "./sharing.ts"
import { createStopRoutes } from "./stops.ts"
import { createTripRoutes } from "./trips.ts"

export function createV1Routes(dependencies: ApiDependencies) {
  const tripRoutes = new Hono<ApiEnvironment>()
    .use("*", requireSession(dependencies))
    .route("/", createTripRoutes(dependencies))
    .route("/", createStopRoutes(dependencies))
    .route("/", createItemRoutes(dependencies))
    .route("/", createLegRoutes(dependencies))
    .route("/", createRateRoutes(dependencies))
    .route("/", createMemberRoutes(dependencies))
    .route("/", createShareLinkRoutes(dependencies))

  return new Hono<ApiEnvironment>()
    .route("/", createCatalogRoutes(dependencies))
    .route("/me", createMeRoutes(dependencies))
    .route("/dashboard", createDashboardRoutes(dependencies))
    .route("/trips", tripRoutes)
    .route("/link-shared-trips", createLinkSharedTripRoutes(dependencies))
    .route("/public/trips", createPublicTripRoutes(dependencies))
}
