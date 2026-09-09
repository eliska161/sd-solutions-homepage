# SD Solutions Repair — Architecture (Phase 0–1)

**Target:** `https://repair.sd-solutions.org`  
**Marketing site:** `www.sd-solutions.org` (this repo root — untouched as public site)  
**Database:** Neon (PostgreSQL) — **not** Supabase  

---

## 1. Existing repo analysis

| Area | Finding |
|------|---------|
| Stack | Next.js 15.5 / React 19 / Tailwind 4 / TypeScript / Resend |
| Auth | None |
| Database | None |
| Domain | Public `/reparasjon` + static `repair-prices.ts` + lead form → email |
| Design tokens | Dark UI (`#0a0a0a`, `#111`, `#8e8e93`, accent `#00a3c4`) |

**Conclusion:** Root app is a marketing/lead funnel. The repair management system must be a **separate Next.js application** under `apps/repair`, deployable independently to `repair.sd-solutions.org`.

**Reuse (copy/share later):** company constants, service IDs/labels, NOK formatting, visual tokens.  
**Do not merge into marketing routes:** tickets, inventory, auth, flips, etc.

---

## 2. Architecture plan

```
┌─────────────────────────────────────────────┐
│  repair.sd-solutions.org  (apps/repair)     │
│  Next.js App Router · Server Actions/API    │
│  Better Auth · Drizzle ORM · Zod            │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Neon PostgreSQL                            │
│  Single source of truth for money & stock   │
└─────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Object storage (Vercel Blob / R2)          │
│  Photos: before/during/after/damage/serial  │
└─────────────────────────────────────────────┘

Marketing site (repo root) ──Resend──► inbox
        optional later: create ticket from lead
```

### Principles

1. **Two workflows, one core:** Customer repair vs Refurbish/Flip share parts, inventory, diagnostics, costs — separate ticket/project types and ownership.
2. **Server is source of truth:** Estimates vs actuals never overwrite each other; profit/ROI computed from persisted lines, validated server-side.
3. **No iFixit scraping:** Manual / CSV / official API only; mark unverified Pro prices.
4. **Audit everything material:** status, stock, money, role changes.
5. **Desktop-first internal tool**, fully responsive for intake/photos/diagnostics.

### Auth & roles (without Supabase)

| Need | Choice |
|------|--------|
| Auth | **Better Auth** + Neon/Drizzle adapter |
| Roles | `ADMIN` · `TECHNICIAN` · `VIEWER` |
| Authorization | Server-side checks + DB constraints (Neon has no RLS like Supabase — enforce in app layer + Postgres policies where useful) |

### Access control on Neon

Neon does not ship Supabase-style RLS UI. We use:

- Application-level role checks on every mutation
- Optional Postgres RLS later if multiple DB roles
- Service credentials only on server (`DATABASE_URL`, never in client)

---

## 3. Database architecture (Neon)

### ID conventions

- Repair tickets: `REP-2026-000123`
- Flips: `FLIP-2026-0012`
- POs: `PO-2026-00045`
- Internal PKs: UUID

### Core domains

**Identity:** `users`, `sessions`, `accounts` (Better Auth tables) + `profiles.role`

**CRM:** `customers`, `devices` (`ownership_type`: CUSTOMER | SD_SOLUTIONS | UNKNOWN)

**Repairs:** `repair_tickets`, `repair_ticket_status_history`, `diagnostics`, `diagnostic_results`, `repair_notes`, `communications`, `attachments`

**Catalog:** `services`, `parts`, `part_model_compat`

**Inventory:** `inventory_transactions` (never overwrite stock silently — derive or update with ledger), `suppliers`, `supplier_parts`, `supplier_prices`, `purchase_orders`, `purchase_order_items`

**Commercial:** `quotes`, `quote_items`, `payments`, `warranty_claims`

**Refurbish:** `flip_candidates`, `refurbishments`, `refurbishment_acquisitions`, `refurbishment_costs`, `refurbishment_repairs`, `refurbishment_parts`, `resale_listings`, `resales`

**System:** `settings`, `audit_logs`, `notifications`

### Money rules

| Concept | Rule |
|---------|------|
| Estimated vs actual | Separate columns/tables; actual never overwrites estimate |
| Stock | Ledger in `inventory_transactions`; reject negative stock |
| Flip ROI | `(profit / investment) * 100`; thresholds in `settings` |
| Customer repair profit | `customer_price - parts_cost - other_costs` |

### Status enums

**Repair:** NEW → DIAGNOSTICS → WAITING_FOR_CUSTOMER | WAITING_FOR_PART → APPROVED → IN_REPAIR → TESTING → READY_FOR_PICKUP → COMPLETED (also CANCELLED, RETURNED)

**Flip:** SEARCHING → CANDIDATE → PURCHASED → RECEIVED → DIAGNOSTICS → WAITING_FOR_PARTS → IN_REPAIR → TESTING → READY_TO_LIST → LISTED → RESERVED → SOLD → ARCHIVED

---

## 4. Folder structure

```
apps/repair/
  docs/
    ARCHITECTURE.md          ← this file
    IMPLEMENTATION.md
  drizzle/
    schema/                  ← modular schema files
    migrations/
  public/
  src/
    app/
      (auth)/login/
      (app)/                 ← authenticated shell
        dashboard/
        repairs/
        customers/
        devices/
        inventory/
        refurbishment/
        sales/
        quotes/
        warranty/
        reports/
        settings/
      api/auth/[...all]/
    components/
      layout/                ← sidebar, topbar
      ui/
      repairs/
      inventory/
      refurbishment/
    lib/
      auth.ts
      db.ts                  ← Neon + Drizzle
      money.ts
      ids.ts                 ← REP-/FLIP- generators
      permissions.ts
      validators/
    server/
      repairs/
      inventory/
      flips/
      audit/
```

Marketing site remains at repo root (`src/`, `public/`) until an optional later move to `apps/website`.

---

## 5. Implementation plan (phased)

| Phase | Scope | Done when |
|-------|--------|-----------|
| **1** | App scaffold, tokens, Neon+Drizzle, auth tables, app shell, env | App builds; login route exists; schema migratable |
| **2** | Auth (login/session/roles) | ADMIN can sign in |
| **3** | Full schema migration on Neon | Migrations apply cleanly |
| **4** | Dashboard shell + attention widgets | Reads real counts (even if 0) |
| **5** | Customers CRUD + history | |
| **6** | Devices | |
| **7** | Repair tickets + status history | REP- IDs |
| **8** | Diagnostics checklist | |
| **9** | Parts + inventory ledger | |
| **10** | Suppliers + manual iFixit Pro prices | |
| **11** | Flip candidates + deal calculator | |
| **12** | Active flips → listing → sale | |
| **13** | Profit analytics | |
| **14** | Warranty | |
| **15** | Audit log UI | |
| **16** | Polish, mobile intake, security pass | |

**MVP gate (production-ready v1):** Phases 1–12 + archive + server-side money validation.

---

## 6. Environment variables

```bash
# Neon
DATABASE_URL=postgresql://...@...neon.tech/neondb?sslmode=require

# Better Auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://repair.sd-solutions.org

# Storage (photos)
BLOB_READ_WRITE_TOKEN=...   # or R2_* later

# Optional integrations
RESEND_API_KEY=...
```

Never commit secrets. Never expose `DATABASE_URL` or service tokens to the browser.

---

## 7. Deploy

| Host | App |
|------|-----|
| Vercel project A | Marketing (root) → `www.sd-solutions.org` |
| Vercel project B | `apps/repair` → `repair.sd-solutions.org` |
| Neon | Shared Postgres for repair app only |

Root directory for repair project: `apps/repair`.

---

## 8. Conflicts / non-goals for Phase 1

- No changes to public `/reparasjon` calculator behavior in this phase
- No Supabase
- No iFixit login/scrape
- No mock production data in business logic
