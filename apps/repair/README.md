# SD Solutions Repair Ops

Internal repair & refurbishment system for **repair.sd-solutions.org**.

This app is separate from the public marketing site in the repository root.

## Docs

- [Architecture](./docs/ARCHITECTURE.md)
- [Implementation plan](./docs/IMPLEMENTATION.md)

## Stack

- Next.js 15 + React 19 + TypeScript
- Tailwind CSS 4 (dark ops UI)
- Neon PostgreSQL + Drizzle ORM
- Better Auth (staff login)
- Zod

## Setup

```bash
cd apps/repair
cp .env.example .env.local
# fill DATABASE_URL + BETTER_AUTH_SECRET

npm install
npm run db:generate
npm run db:migrate
npm run dev -- --port 3001
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply migrations to Neon |
| `npm run db:studio` | Drizzle Studio |

## Phase 1 status

Scaffold + architecture + schema + app shell. Connect Neon and complete auth in Phase 2.
