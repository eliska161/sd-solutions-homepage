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

### 1. Neon database

1. Create a project in [Neon](https://neon.tech)
2. Copy the pooled `DATABASE_URL` (sslmode=require)

### 2. Fly app

From `apps/repair`:

```bash
# One-time
fly auth login
fly apps create sd-solutions-repair   # or keep name in fly.toml
fly volumes create repair_uploads --region arn --size 3

fly secrets set \
  DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" \
  BETTER_AUTH_SECRET="$(openssl rand -hex 32)" \
  BETTER_AUTH_URL="https://repair.sd-solutions.org" \
  NEXT_PUBLIC_APP_URL="https://repair.sd-solutions.org"

fly deploy
```

### 3. Schema + seed (after first deploy)

```bash
fly ssh console -C "node -e \"console.log('shell ok')\""
# Prefer running push/seed from your laptop against Neon:
npm run db:push
npm run db:seed
```

`db:push` / `db:seed` use `DATABASE_URL` from `.env.local` on your machine — point that at the same Neon DB as Fly.

### 4. Custom domain

```bash
fly certs add repair.sd-solutions.org
```

Point DNS (CNAME/A) as Fly instructs. Ensure `BETTER_AUTH_URL` matches the public HTTPS URL.

### Alternative: Fly Postgres instead of Neon

```bash
fly postgres create --name sd-repair-db --region arn
fly postgres attach sd-repair-db -a sd-solutions-repair
# then db:push + db:seed against the attached DATABASE_URL
fly deploy
```

Uploads use the Fly volume mounted at `/app/public/uploads`. For multi-machine scale, move to object storage later.

## Docs

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [IMPLEMENTATION.md](./docs/IMPLEMENTATION.md)
