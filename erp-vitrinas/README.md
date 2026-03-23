# erp-vitrinas

Application workspace for **powERP**, a field operations and consignment inventory platform built for multi-location retail execution.

If you are landing here directly, the portfolio-facing overview lives in the root [README](../README.md).

## What This App Contains

This package holds the full product implementation:

- Next.js 16 App Router application
- admin back office
- mobile-first field workflow
- Supabase schema migrations and Edge Functions
- automated end-to-end and unit tests

## Main Areas

- `app/(admin)/admin/*`: admin routes
- `app/(campo)/campo/*`: field routes
- `app/login`: public login page
- `components/`: UI and feature components
- `lib/hooks/`: data access and mutations
- `lib/validations/`: Zod schemas
- `supabase/migrations/`: SQL schema and business rules
- `supabase/functions/`: Edge Functions
- `tests/`: Playwright coverage

## Local Development

Run everything from this directory:

```bash
npm install
cp .env.example .env.local

supabase start
supabase db reset
npm run seed:auth

npm run dev
```

## Common Commands

```bash
npm run dev
npm run build
npm run lint
npm run type-check
npm test
npm run test:e2e
```

## Environment

Expected local variables:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
STORAGE_BUCKET_FOTOS=fotos-visita
```

## Testing Notes

- `Vitest` is used for unit and utility-level coverage.
- `Playwright` covers the main operational workflows.
- e2e runs are configured to use a single worker because the suite mutates a shared local database state.

## Project References

- [CLAUDE.md](../CLAUDE.md): repo rules and conventions
- [CODEX_CONTEXT.md](../CODEX_CONTEXT.md): operating context
- [SPRINTS.md](../SPRINTS.md): delivery history and roadmap
