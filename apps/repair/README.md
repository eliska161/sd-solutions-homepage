# SD Solutions Repair Ops — First Launch

Internal system for **repair.sd-solutions.org**.

## Start locally

```bash
# Postgres must be running (Neon URL also works)
cd apps/repair
cp .env.example .env.local   # set DATABASE_URL, BETTER_AUTH_* 

npm install
npm run db:push
npm run db:seed
npm run dev                  # http://localhost:3001
```

### Demo login

- Email: `admin@sd-solutions.org`
- Password: `RepairAdmin123!`

## What is included

- Auth (Better Auth) + roles ADMIN / TECHNICIAN / VIEWER
- Dashboard with live counts
- Customers, devices, repair tickets (REP-YYYY-######)
- Status workflow + history + activity timeline
- Secure customer status page (`/s/<token>`)
- Technician assignment + estimated completion date
- Mottakskontroll (intake inspection, checklist, damage notes, photos)
- Customer-visible vs internal photos/notes
- Diagnostics checklist
- Notes (internal/customer)
- Photo/file uploads (local `public/uploads` — swap to Blob/R2 later)
- Services, parts, inventory ledger, suppliers
- Quotes (no payment)
- Flipping: candidates → convert → costs → listing → sale → profit
- Warranty tracking
- Global search, audit log hooks, settings
- Seeded [DEMO] data

## Explicitly NOT in this launch

- Stripe / online payment
- SMS / transactional email
- Auto ordering / iFixit scrape
- Public booking / FINN publish automation

## Deploy on Fly.io + Neon (recommended)

### Fly UI fields

| Field | Value |
|---|---|
| Branch | `main` (or this PR branch) |
| Internal port | `3001` |
| Working directory | `apps/repair` |
| Config path | `apps/repair/fly.toml` |

### What happens on deploy

1. Docker build uses placeholder env (no real DB needed at build time)
2. Fly `release_command` runs `scripts/fly-release.sh` → **`drizzle-kit push --force`** against `DATABASE_URL` secret
3. App machines start with the new image

No manual SQL paste / demo seed required for schema. Create the first admin after deploy (sign-up API + `UPDATE users SET role = 'ADMIN'`).

### 1. Neon database

1. Create a project in [Neon](https://neon.tech)
2. Copy the pooled `DATABASE_URL` (sslmode=require)

### 2. Fly app

From Fly dashboard (or CLI):

- App: `sd-solutions-repair`
- Volume: `repair_uploads` → `/app/public/uploads`
- Secrets: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`

### 3. Custom domain

Add `repair.sd-solutions.org` under Certificates and point DNS as Fly shows.


## Docs

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [IMPLEMENTATION.md](./docs/IMPLEMENTATION.md)
