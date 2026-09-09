# SD Solutions

Monorepo-style repository:

| Path | Product | URL |
|------|---------|-----|
| Repository root | Public marketing site | www.sd-solutions.org |
| `apps/repair` | Internal repair & refurbish ops | repair.sd-solutions.org |

## Marketing site

```bash
npm install
npm run dev
```

See root scripts in `package.json`.

## Repair ops (`apps/repair`)

Separate Next.js app on **Neon PostgreSQL** (not Supabase).

```bash
cd apps/repair
cp .env.example .env.local
npm install
npm run dev
```

Architecture and phased plan: [`apps/repair/docs/ARCHITECTURE.md`](apps/repair/docs/ARCHITECTURE.md).
