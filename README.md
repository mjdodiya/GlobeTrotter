# GlobeTrotter

Bare full-stack foundation for a personalized travel-planning application. This repository establishes the architecture and infrastructure only; the product features from the problem statement are intentionally not implemented.

## Stack

- Node.js 24, pnpm workspaces, and strict TypeScript
- React, Vite, TanStack Router, TanStack Query, and Tailwind CSS
- Hono with a typed client contract
- Better Auth with email/password support
- Drizzle ORM and PostgreSQL
- Oxlint and Oxfmt

## Workspace

```text
apps/
  api/       Hono composition root, middleware, auth endpoint, and health checks
  web/       Empty React application shell and typed API/auth clients
packages/
  auth/      Better Auth configuration
  db/        PostgreSQL client, Drizzle configuration, and auth schema
  domain/    Framework-independent domain boundary
```

Dependency direction:

```text
web --type-only--> api
                    |--> auth --> db
                    |--> db
                    `--> domain
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the planned GlobeTrotter boundaries and intentionally deferred feature work.

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm dev
```

The web app runs on `http://localhost:5173`; the API runs on `http://localhost:3000`.

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

pnpm db:up
pnpm db:down
pnpm db:logs
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

The only database tables currently defined are the tables required by Better Auth. Travel-planning tables and application routes must be designed before feature work begins.
