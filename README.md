# Off Grid Platform

Commerce, CRM and lifecycle-marketing platform for [offgridrace.com](https://offgridrace.com) —
F1 trackside hospitality. Replaces the marketing-only site with one application that sells
hospitality packages, holds inventory, invoices, manages guests, syncs to Salesforce Sales Cloud,
pays partners through Wise, and issues tickets through Speakeasy.

## Stack

- Next.js 15 (App Router, server actions) + React 19 + Tailwind 4
- PostgreSQL + Prisma 6
- Vitest for unit tests
- Integrations: Salesforce Sales Cloud, Wise Business API, Speakeasy, Resend

## Architecture

```
src/app/(site)         public marketing, catalog, cart, checkout, order pages
src/app/admin          operations console (auth, RBAC-gated)
src/app/actions        server actions (leads, marketing, commerce, admin)
src/app/api            attribution, webhooks, job runner, health
src/lib/commerce       cart, inventory holds, checkout, invoices, payments
src/lib/crm            lead capture and qualification
src/lib/marketing      subscribers, segments, campaigns, attribution
src/lib/integrations   salesforce/ wise/ speakeasy/ adapters
src/lib/jobs           outbox worker
```

Design rules that the code depends on:

- **Money is integer minor units** everywhere (`src/lib/money.ts`); majors only at the UI edge and
  when talking to Salesforce.
- **Inventory is derived**, never decremented: `available = totalUnits - heldUnits - active allocations`.
  Holds are taken in a serializable transaction and expire after 30 minutes.
- **Every external write goes through the transactional outbox** (`OutboxEvent`), drained by
  `src/lib/jobs/worker.ts` with exponential backoff. Domain writes never call a third party inline.
- **Everything external is idempotent**: Salesforce upserts on the `OffGrid_Id__c` external id,
  Wise payments dedupe on `(method, externalId)`, webhooks dedupe on `(system, deliveryId)`,
  ticket issuance skips guests that already hold a `ticketRef`.

## Local setup

```bash
docker run -d --name ogr-pg -e POSTGRES_PASSWORD=postgres -p 5433:5432 postgres:16
cp .env.example .env      # then fill SESSION_SECRET and JOB_TOKEN
npm install
npm run db:migrate
npm run db:seed           # 6 race editions, packages, partners, segments, admin user
npm run dev
```

Seed admin: `admin@offgridrace.com` / `offgrid-dev-password` (override with `SEED_ADMIN_EMAIL`,
`SEED_ADMIN_PASSWORD`). Console is at `/admin`.

All three integrations are **off by default** (`*_ENABLED=false`); the app runs end to end without
them — Speakeasy falls back to a mock provider, and Salesforce/Wise outbox events are skipped.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm test` | Vitest unit tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:migrate` / `db:deploy` / `db:seed` | Prisma migrations and seed |

## Background jobs

`POST /api/jobs/run` with `Authorization: Bearer $JOB_TOKEN` does one pass: sweep expired holds,
drain the outbox, pull Salesforce opportunity updates, sync Speakeasy check-ins for live editions.
Run it on a schedule (every minute is fine — it is idempotent).

`GET /api/health` checks database reachability.

## Integrations

See [docs/salesforce.md](docs/salesforce.md), [docs/wise.md](docs/wise.md) and
[docs/speakeasy.md](docs/speakeasy.md) for the setup each one needs and the assumptions that must be
confirmed before it is enabled in production.
