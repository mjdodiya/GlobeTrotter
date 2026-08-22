# GlobeTrotter architecture

## Scope of this scaffold

This scaffold copies the package boundaries and infrastructure style of `mock-odoo` without copying its demo domain or Git history. It includes working composition points for authentication, PostgreSQL, domain code, HTTP APIs, and the React client.

It does not implement login screens, dashboards, trip creation, itineraries, city or activity search, budgets, calendars, sharing, profiles, or admin analytics.

## Boundaries

- `apps/web` owns browser routing, server-state caching, authentication clients, and future feature UI. It communicates with `apps/api` over HTTP and imports only the API type contract.
- `apps/api` owns HTTP concerns and composes application dependencies. Future routes should remain thin and delegate business decisions away from Hono handlers.
- `packages/auth` owns Better Auth configuration and depends on the database adapter.
- `packages/db` owns PostgreSQL connectivity, Drizzle schemas, migrations, and transactions. It must not depend on Hono or browser code.
- `packages/domain` owns framework-independent rules and errors. Future trip, itinerary, budget, discovery, and sharing logic belongs here when those features are implemented.

## Planned feature areas

The problem statement suggests the following future vertical slices, but no source modules or schemas are created for them yet:

- trips and ownership
- itinerary stops and ordering
- destinations and cities
- activities and scheduling
- budgets and expense estimates
- itinerary sharing and copying
- user preferences and saved destinations
- optional administration and analytics

Before implementing a slice, define its relational entities, ownership rules, constraints, indexes, authorization policy, and transaction boundary. Then add its Drizzle schema and migration, domain rules, API use cases/routes, query hooks, and UI in that order.

## State ownership

```text
PostgreSQL      persistent source of truth
TanStack Query cached server state
TanStack Router URL and navigation state
React          ephemeral interface state
```

Add another state manager only when a concrete feature cannot be represented by these owners.
