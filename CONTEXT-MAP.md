# Context Map

## Contexts

- [Travel Planning](./CONTEXT.md): constructs, collaborates on, publishes, and reuses multi-city travel plans

## Relationships

- **Travel Planning → Authentication**: Travel Planning references authenticated users by identifier; Authentication owns credentials, verification, and sessions.
- **Travel Planning → Catalog**: Trips snapshot selected Catalog City and Catalog Activity details so later catalog changes do not rewrite an existing plan.
