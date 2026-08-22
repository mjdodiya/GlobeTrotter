# GlobeTrotter

Bare TypeScript monorepo boilerplate based on `mock-odoo`. It contains only empty React and Hono application entry points; no product features, domain model, authentication, database, routes, UI system, or tests are implemented.

## Requirements

- Node.js 24
- pnpm 11

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
pnpm fmt:check
```

The web development server runs on `http://localhost:5173`. The empty API server listens on `http://localhost:3000` and returns Hono's default 404 response until routes are added.
