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

### Fly UI / GitHub deploy fields

| Field | Value |
|---|---|
| Branch | `cursor/fly-release-domain-d9bc` (this PR) or `main` after merge |
| Internal port | `3001` |
| Working directory | `apps/repair` |
| Config path | `apps/repair/fly.toml` |

### What happens on deploy

1. Docker build uses placeholder env (no real DB needed at build time)
2. Fly `release_command` runs `node /app/scripts/fly-db-migrate.cjs` (SQL migrations)
3. App machines start with the new image

### Auto-deploy from GitHub (Fly)

Ja — i Fly-dashboardet:

1. App → **Settings** → **GitHub** / **Continuous deployment**
2. Connect repo `eliska161/sd-solutions-homepage`
3. Branch: `main` (etter merge)
4. Root / working directory: `apps/repair`
5. Config path: `apps/repair/fly.toml`

Da deployer Fly automatisk ved hver push til valgt branch.

### 1. Neon database

1. Create a project in [Neon](https://neon.tech)
2. Copy the pooled `DATABASE_URL` (`sslmode=require`)
3. Set Fly secrets: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`

### 2. Volume + IPs + domain (CLI — not reliable in Fly UI)

From `apps/repair`:

```bash
chmod +x scripts/fly-setup-infra.sh
./scripts/fly-setup-infra.sh
```

This runs (idempotent):

```bash
fly ips allocate-v4 --shared -a sd-solutions-repair
fly ips allocate-v6 -a sd-solutions-repair
fly volumes create repair_uploads --region arn --size 3 --app sd-solutions-repair --yes
fly certs add repair.sd-solutions.org -a sd-solutions-repair
```

Then add the DNS records `fly certs show repair.sd-solutions.org -a sd-solutions-repair` prints.

### 3. Deploy

```bash
cd apps/repair
fly deploy -a sd-solutions-repair --config fly.toml
```

### 4. First admin (no demo seed)

After the app is up, in browser console on `/login`:

```js
await fetch('/api/auth/sign-up/email', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@sd-solutions.org',
    password: 'DittSterkePassordHer',
    name: 'SD Admin'
  })
}).then(r => r.json())
```

In Neon SQL Editor:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@sd-solutions.org';
```

## Docs

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [IMPLEMENTATION.md](./docs/IMPLEMENTATION.md)
