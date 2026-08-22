# GlobeTrotter

Full-stack personalized travel-planning application with a PostgreSQL-backed REST API.

## Stack

- Node.js 24, pnpm workspaces, and strict TypeScript
- React, Vite, TanStack Router, TanStack Query, Tailwind CSS, and shadcn/ui
- Hono with a typed client contract
- Better Auth with email/password support
- Drizzle ORM and PostgreSQL
- Oxlint and Oxfmt

## Workspace

```text
apps/
  api/       Hono REST API, authentication boundary, and integration tests
  web/       React application and typed API/auth clients
  admin/     Separate administration application
packages/
  auth/      Better Auth configuration
  db/        PostgreSQL client, Drizzle travel/auth schemas, and migrations
  domain/    Framework-independent rules and errors
```

Dependency direction:

```text
web --type-only--> api
                    |--> auth --> db
                    |--> db
                    `--> domain
```

The backend contract is documented in [docs/api.md](./docs/api.md), and its hard and soft rules are recorded in [docs/backend-invariants.md](./docs/backend-invariants.md). See [ARCHITECTURE.md](./ARCHITECTURE.md) for module boundaries and intentionally deferred work.

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The API runs on `http://localhost:3000`. Local verification, password-reset, email-change, and account-deletion messages are captured by Mailpit at `http://localhost:8025`.

## Commands

```bash
pnpm dev
pnpm dev:web
pnpm dev:api
pnpm build
pnpm typecheck
pnpm lint
pnpm fmt
pnpm fmt:check
pnpm test:api

pnpm db:up
pnpm db:down
pnpm db:logs
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:studio
```

Add shadcn/ui components to the web workspace from the repository root:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

Application endpoints live under `/api/v1`; Better Auth remains mounted separately under `/api/auth`. The API implements trip, Stop, Travel Leg, Stay, budget, catalog, membership, sharing, copying, saved-city, profile, account export, calendar export, explicit rate refresh, public-feed, and dashboard workflows. Upload presigning remains deferred until an object-storage provider is configured.
