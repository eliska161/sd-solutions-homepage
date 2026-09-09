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

## Deploy

1. Create Neon database
2. Set env vars on Vercel (root directory: `apps/repair`)
3. `npm run db:push` (or migrations) against Neon
4. `npm run db:seed` once for first admin (or create user manually)
5. Point `repair.sd-solutions.org` to the Vercel project

## Docs

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [IMPLEMENTATION.md](./docs/IMPLEMENTATION.md)
