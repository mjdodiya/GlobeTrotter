# Backend API contract

The application API is mounted at `/api/v1`. Better Auth owns `/api/auth` for signup, login, logout, email verification, password reset, email change, and verified account deletion.

## Protocol

Authenticated endpoints use the Better Auth session cookie. Mutating requests must also have an `Origin` in the configured trusted-origin set. Request bodies are JSON and limited to 1 MiB.

Successful JSON responses use `{ "data": ... }`; paginated collections also include `meta.nextCursor`. Errors use a problem-details shape:

```json
{
  "type": "STALE_TRIP_VERSION",
  "title": "Trip version is stale",
  "status": 412,
  "detail": "The trip has changed. Its current version is 7.",
  "requestId": "..."
}
```

Validation failures may add `errors`, keyed by field. Resource identifiers are UUID strings except numeric catalog identifiers, which are serialized as decimal strings. Dates use `YYYY-MM-DD`, local times use `HH:mm:ss`, instants use ISO 8601, currencies use uppercase ISO-style three-letter codes, and money is a non-negative decimal string with up to four fractional digits.

### Trip ETags

Protected Trip reads return `ETag: "<version>"`. Every Trip mutation requires that exact value in `If-Match`; a successful mutation returns the new ETag. Reordering and rate refresh provide read-only preview endpoints so a client can explain consequences before sending a versioned commit.

## Endpoint inventory

All routes below are relative to `/api/v1`.

| Area                | Methods and paths                                                                                                           | Access                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Catalog             | `GET /countries`, `/cities`, `/cities/:cityId`, `/activity-categories`, `/activities`, `/activities/:activityId`            | Public                                                      |
| Dashboard           | `GET /dashboard`                                                                                                            | Session                                                     |
| Profile             | `GET/PATCH /me`                                                                                                             | Session                                                     |
| Account portability | `GET /me/deletion-impact`, `/me/export`, `/me/calendar.ics`                                                                 | Session                                                     |
| Saved Cities        | `GET /me/saved-cities`, `PUT/DELETE /me/saved-cities/:cityId`                                                               | Session                                                     |
| Trips               | `GET/POST /trips`, `GET/PATCH/DELETE /trips/:tripId`                                                                        | Participant; owner-only settings are enforced per operation |
| Planning reads      | `GET /trips/:tripId/itinerary`, `/trips/:tripId/budget`                                                                     | Participant                                                 |
| Stops               | `POST /trips/:tripId/stops`, `PATCH/DELETE /trips/:tripId/stops/:stopId`                                                    | Owner/editor                                                |
| Stop order          | `POST /trips/:tripId/stops/order/preview`, `PUT /trips/:tripId/stops/order`                                                 | Owner/editor                                                |
| Itinerary Items     | `POST /trips/:tripId/stops/:stopId/items`, `PATCH/DELETE /trips/:tripId/stops/:stopId/items/:itemId`, `PUT .../items/order` | Owner/editor                                                |
| Travel Legs         | `GET/POST /trips/:tripId/legs`, `PATCH/DELETE /trips/:tripId/legs/:legId`                                                   | Read: participant; write: owner/editor                      |
| Rates               | `POST /trips/:tripId/rates/preview`, `/trips/:tripId/rates/refresh`                                                         | Owner/editor; refresh requires `If-Match`                   |
| Membership          | `GET/POST /trips/:tripId/members`, `PATCH/DELETE /trips/:tripId/members/:userId`                                            | Owner; listed users must be verified                        |
| Leave Trip          | `DELETE /trips/:tripId/members/me`                                                                                          | Member; intentionally no ETag                               |
| Share Links         | `GET/POST /trips/:tripId/share-links`, `DELETE /trips/:tripId/share-links/:shareLinkId`                                     | Owner                                                       |
| Trip Copy           | `POST /trips/:tripId/copy`                                                                                                  | Session with readable source                                |
| Link sharing        | `GET /link-shared-trips/:token`, `POST /link-shared-trips/:token/copy`                                                      | Read: token; copy: token plus session                       |
| Public discovery    | `GET /public/trips`, `/public/trips/:tripId`                                                                                | Public                                                      |

Catalog and collection queries use validated filters and cursor pagination where applicable. See the route schemas in `apps/api/src/routes` for request-field details and [backend-invariants.md](./backend-invariants.md) for rules that span endpoints.

## Planning projections

`GET /trips/:tripId/itinerary` returns ordered Stops with nested Itinerary Items, ordered Travel Legs, and Completeness Warnings. It is the canonical editor/read model. `GET /trips/:tripId/budget` returns the exact total, category breakdown, average per day, day allocations, and over-average flags in the Trip Base Currency.

Public and link-shared reads are intentionally smaller privacy projections. They omit the Budget Limit and all planning notes. A client must not derive a public response by serializing an authenticated Trip object.

## External adapters

Production dependency composition provides SMTP email delivery and an exchange-rate provider through interfaces in `apps/api/src/context.ts` and `packages/auth`. Tests inject deterministic adapters. Exchange-provider failure aborts preview/refresh without changing the Trip.
