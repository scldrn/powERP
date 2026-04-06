<div align="center">

# ruteria

**Field operations platform for consignment retail networks**

Coordinates the full visit workflow across **200+ retail locations**: routes, inventory counts, collections, replenishment, incidents, and admin oversight, replacing a fully manual operation.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth%20%2B%20Storage-3ECF8E?style=flat-square&logo=supabase&logoColor=black)](https://supabase.com/)
[![Playwright](https://img.shields.io/badge/Tested%20with-Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev/)

</div>

---

## Overview

`ruteria` is a production-grade vertical operations platform for a consignment business that places electronic accessory display cases in third-party retail stores. The system is centered on route execution and store visits: field workers visit each location to count inventory, infer sales from stock differences, collect payments, restock display cases, and report incidents.

The platform provides:

- **Route planning** — assign and reorder daily store visits per collaborator
- **Visit execution** — inventory counting with automatic sales inference (`units_sold = prev_stock - current_stock`)
- **Payment capture** — amount registration with discrepancy detection and mandatory notes
- **Replenishment** — central stock to field staff to display case, tracked via immutable movements
- **Admin panel** — dashboards, exportable reports, purchase management, incident tracking

## System Category

`ruteria` is best understood as a visit-driven field operations system with distributed inventory and route accounting.

- **Primary** — field operations and route execution
- **Secondary** — distributed inventory control across central stock, collaborator stock, and display cases
- **Supporting** — lightweight ERP capabilities for purchases, suppliers, catalog, users, dashboards, and exports
- **Not** — a traditional CRM or a full general-purpose ERP

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui |
| State | TanStack React Query v5 (server cache) + local React state |
| Backend | Supabase (PostgreSQL + PostgREST + Edge Functions on Deno) |
| Auth | Supabase Auth with JWT + Row Level Security per role |
| Storage | Supabase Storage (private bucket for visit photos) |
| Realtime | Supabase Realtime websockets (live dashboard updates) |
| Validation | Zod + React Hook Form |
| Testing | Playwright (e2e) + Vitest (unit) |
| Hosting | Vercel + Supabase Cloud |

## Roles

| Role | Access |
|---|---|
| `admin` | Full admin panel — all entities and configuration |
| `colaboradora` | Mobile field view — her assigned route only |
| `supervisor` | Admin panel — routes, visits, incidents, partial reports |
| `analista` | Admin panel — read-only dashboards and exports |
| `compras` | Admin panel — suppliers, purchases, central inventory |

## Features

**Field (mobile-first)**
- Route of the day with ordered store list and visit status
- Start visit: shows previous inventory per product
- Inventory count with automatic units-sold calculation
- Payment capture with discrepancy handling and photo attachment
- Offline execution with background sync queue and image compression

**Admin (desktop)**
- Dashboard: monthly collections, low-stock alerts, open incidents
- Visit overview: planned vs. completed per route
- Temporary route reassignment with reason and date
- Supplier and purchase management with reception flow
- Exportable reports: sales, ranking, inventory, visits, incidents

**Infrastructure**
- SQL triggers for transactional inventory integrity (no negative stock)
- Immutable inventory movement log; stock denormalized via triggers
- Server-side Excel export via `exceljs`
- Manual quality workflow with `type-check`, `lint`, `test`, and `build`

## Local Setup

**Prerequisites:** Node.js 20+, Supabase CLI, Docker

```bash
git clone https://github.com/scldrn/Ruteria.git
cd ruteria/ruteria

npm install
supabase start
cp .env.example .env.local   # fill in values from `npm run db:status:env`
npm run db:reset
npm run seed:auth             # creates auth users via API
npm run dev
```

App runs at `http://localhost:3000`

**Test credentials:**

| Email | Password | Role |
|---|---|---|
| `admin@erp.local` | `Admin1234!` | admin |
| `colaboradora@erp.local` | `Colab1234!` | colaboradora |

## Quality Checks

```bash
npm run lint
npm test
npm run build
```

For sensitive changes, also run `npm run type-check`, `npm run test:e2e`, and `npm run audit:prod`.

This repository keeps automation intentionally lightweight. The only built-in
GitHub workflow is a manual quality run in
[`/.github/workflows/ci.yml`](.github/workflows/ci.yml). Repo policy lives in
[`docs/ESTANDAR_REPO_LIGERO.md`](docs/ESTANDAR_REPO_LIGERO.md).

## Repository Structure

```
ruteria/                        # repo root
├── .github/workflows/ci.yml    # manual quality workflow
├── docs/
│   ├── CONTRIBUTING.md         # contributing guide
│   └── ESTANDAR_REPO_LIGERO.md # repo operating standard
├── ruteria/                    # Next.js application workspace
│   ├── app/                    # routes — (admin)/* and (campo)/*
│   ├── components/             # feature and UI components
│   ├── lib/                    # hooks, helpers, validations, Supabase clients
│   ├── supabase/               # migrations and Edge Functions
│   └── tests/                  # Playwright e2e specs
```

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for the full guide. Quick reference:

**Default flow:** use `main` as the default branch, keep changes small, and open
PRs when they add review context or traceability.

**Recommended validation:** `lint` + `test` + `build` by default; add
`type-check`, `test:e2e`, and `audit:prod` for higher-risk changes.

**Automation rule:** keep repo automation minimal unless it solves a concrete,
repeated problem.

## License

MIT
