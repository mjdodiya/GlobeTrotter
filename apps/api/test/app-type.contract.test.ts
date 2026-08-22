import { hc } from "hono/client"

import type { AppType } from "../src/app.ts"

const apiClient = hc<AppType>("http://localhost")

void apiClient.api.v1.countries.$get
void apiClient.api.v1.dashboard.$get
void apiClient.api.v1.me.$get
void apiClient.api.v1.me["saved-cities"].$get
void apiClient.api.v1.me.export.$get
void apiClient.api.v1.me["calendar.ics"].$get
void apiClient.api.v1.trips.$get
void apiClient.api.v1.trips[":tripId"].itinerary.$get
void apiClient.api.v1.trips[":tripId"].budget.$get
void apiClient.api.v1.trips[":tripId"].copy.$post
void apiClient.api.v1.trips[":tripId"].stops.$post
void apiClient.api.v1.trips[":tripId"].stops[":stopId"].items.$post
void apiClient.api.v1.trips[":tripId"].legs.$get
void apiClient.api.v1.trips[":tripId"].rates.preview.$post
void apiClient.api.v1.trips[":tripId"].members.$get
void apiClient.api.v1.trips[":tripId"]["share-links"].$get
void apiClient.api.v1["link-shared-trips"][":token"].$get
void apiClient.api.v1["link-shared-trips"][":token"].copy.$post
void apiClient.api.v1.public.trips.$get
