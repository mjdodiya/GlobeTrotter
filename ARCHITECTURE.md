# GlobeTrotter architecture

## Current scope

The project includes Better Auth, the PostgreSQL travel domain, and a versioned Hono REST API. PostgreSQL remains the source of truth for persistence, search, constraints, transactions, and derived read models.

The API implements profiles, account export and deletion impact, dashboard projections, Trips, Stops, Travel Legs, multi-day Stays, itinerary items, budgets, catalog search, membership, public and link-shared itineraries, Trip Copy, calendar export, explicit exchange-rate refresh, and Saved Cities. Product UI and object-storage upload presigning remain separate work.

## Boundaries

- `apps/web` owns browser routing, server-state caching, authentication clients, and future feature UI. It communicates with `apps/api` over HTTP and imports only the API type contract.
- `apps/api` owns HTTP semantics, validation, authorization workflows, transaction coordination, query projections, and application dependency composition.
- `packages/auth` owns Better Auth configuration and depends on the database adapter.
- `packages/db` owns PostgreSQL connectivity, Drizzle schemas, migrations, and transactions. It must not depend on Hono or browser code.
- `packages/domain` owns framework-independent rules and stable domain errors.

The deep backend seams are intentionally small:

- `packages/domain/src/travel` decides schedule validity, completeness warnings, Stop reordering, fixed-precision money conversion, and daily cost allocation without HTTP or database dependencies.
- `apps/api/src/services/trip-access.ts` is the single Trip authorization and optimistic-concurrency boundary.
- `apps/api/src/services/trip-read.ts` owns authenticated and public planning projections.
- `apps/api/src/services/account-export.ts` owns portable JSON and RFC 5545 calendar representations.
- `apps/api/src/adapters` contains production integrations such as exchange-rate lookup; routes depend only on the interface in `context.ts`.

## Implemented backend areas

- trips and ownership
- itinerary stops and ordering
- Travel Legs, Stays, completeness warnings, and scheduling
- destinations, cities, and curated catalog activities
- Base Currency budgets, snapshot conversions, and daily expense estimates
- itinerary sharing and copying
- verified collaboration and publication boundaries
- user preferences, Saved Cities, data export, deletion impact, and calendar export

Trip is the aggregate concurrency boundary. All aggregate mutations lock the trip, verify `If-Match`, apply changes and invariants transactionally, and increment `trips.version` before commit. Public and link-shared reads use a public projection constructed independently from authenticated participant projections.

The database repeats critical integrity rules with foreign keys, checks, unique indexes, cascading ownership, and non-overlap constraints. Application rules remain necessary for cross-row decisions and for useful domain errors. See [docs/backend-invariants.md](./docs/backend-invariants.md) for the complete contract.

## State ownership

```text
PostgreSQL persistent source of truth
HTTP ETags optimistic client/server coordination
```

Exchange rates are external observations, not live state: every conversion stores its source amount, rate, provider, and effective time. A rate preview performs no write; a refresh is a normal versioned Trip mutation.
