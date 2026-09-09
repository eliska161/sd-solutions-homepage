# SD Solutions Repair Ops

Internal system for **repair.sd-solutions.org** — deploy on **Fly.io** + Fly Postgres.

## Deploy on Fly.io (recommended)

### 1. Install CLI & login

```bash
# macOS
brew install flyctl

# or
curl -L https://fly.io/install.sh | sh

fly auth login
```

### 2. Create app + Postgres (from this folder)

```bash
cd apps/repair

# Creates the app from fly.toml (confirm name/region if prompted)
fly launch --no-deploy --copy-config --name sd-solutions-repair --region arn

# Managed Postgres in the same org/region
fly postgres create --name sd-solutions-repair-db --region arn

# Attach DB → sets DATABASE_URL on the app
fly postgres attach sd-solutions-repair-db -a sd-solutions-repair
```

### 3. Set secrets

```bash
# Generate a secret
openssl rand -base64 32

fly secrets set \
  BETTER_AUTH_SECRET="PASTE_SECRET_HERE" \
  BETTER_AUTH_URL="https://sd-solutions-repair.fly.dev" \
  NEXT_PUBLIC_APP_URL="https://sd-solutions-repair.fly.dev"
```

Use your custom domain URLs once DNS is ready (see step 6).

### 4. Deploy

```bash
fly deploy
```

### 5. Create tables + seed admin (once)

```bash
fly ssh console -C "npx drizzle-kit push --force"
fly ssh console -C "npx tsx scripts/seed.ts"
```

**Demo login**

- Email: `admin@sd-solutions.org`
- Password: `RepairAdmin123!`

Change the password after first login.

### 6. Custom domain `repair.sd-solutions.org`

```bash
fly certs add repair.sd-solutions.org
```

DNS (at your registrar):

| Type | Name | Value |
|------|------|--------|
| CNAME | `repair` | `sd-solutions-repair.fly.dev` |

Then update secrets to the real domain and redeploy:

```bash
fly secrets set \
  BETTER_AUTH_URL="https://repair.sd-solutions.org" \
  NEXT_PUBLIC_APP_URL="https://repair.sd-solutions.org"

fly deploy
```

### Useful commands

```bash
fly status
fly logs
fly open
fly secrets list
```

---

## What is included

Auth, dashboard, customers, devices, repair tickets, diagnostics, notes, photos, services, parts/inventory, suppliers, quotes (no payment), flipping, warranty, search, settings. Seeded `[DEMO]` data.

## Not included

Stripe/payment, SMS/email send, auto-order, scraping, public booking, FINN publish.

## Docs

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [IMPLEMENTATION.md](./docs/IMPLEMENTATION.md)
