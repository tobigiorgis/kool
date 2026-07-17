# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev           # Start dev server (localhost:3000)
npm run build         # Generate Prisma client + Next.js build
npm run lint          # ESLint
npm run lint:fix      # ESLint with auto-fix
npm run typecheck     # TypeScript check (no emit)
npm run format        # Prettier
npm run test          # Vitest (single pass)
npm run test:watch    # Vitest watch

# Database
npm run db:push       # Sync schema to DB (no migrations)
npm run db:studio     # Prisma Studio UI
npm run db:generate   # Regenerate Prisma client
```

## What This Is

Kool is a creator affiliate platform for LATAM. Brands create campaigns, invite creators, who share short tracking links. Clicks are captured → redirected to store with UTM + coupon → Tiendanube webhook fires on purchase → conversion attributed + commission calculated.

## Architecture

### Multi-Host Routing

Three domains served from one Next.js app, controlled by `src/middleware.ts`:

- `app.joinkool.co` → `/dashboard/*` (brand workspace)
- `creator.joinkool.co` → rewrites to `/creator/*` internally
- `refer.joinkool.co` / `kool.link` → rewrites to `/api/r/[slug]` (shortlinks)

**Critical:** Shortlink rewrites happen *before* Clerk auth in middleware — they must not be gated behind login. The middleware order matters: shortlink check → asset passthrough → Clerk auth.

In dev (single domain), everything runs on `localhost:3000` with path prefixes. `creatorPath()` in `src/lib/host.ts` returns `/creator/X` in dev, `/X` in prod — always use this helper for creator nav links.

### Auth & Multi-Tenancy

Clerk handles auth. Two roles: workspace members (brands) and creators.

- `requireWorkspace()` in `src/lib/api/workspace.ts` — use this in all dashboard API routes. Extracts `workspaceId` from Clerk userId via WorkspaceMember.
- Creator routes check `prisma.creator.findFirst({ where: { userId } })` directly.
- One workspace per user assumed in current data model.

### Click → Conversion Flow

```
/api/r/[slug] → capture click (ipHash, country, device, source) → store in Postgres
             → async ingest to Tinybird (via Next.js after())
             → 302 redirect to destination + ?utm_campaign=X&ref=COUPON&utm_content=slug

Tiendanube webhook (order/paid) → match utm_content/ref to link/creator
                                → store Conversion + calculate Commission
```

### Key Helpers

- `src/lib/api/response.ts` — `ok()`, `fail()`, `badRequest()`, `handleError()`. All API routes use these. `handleError` catches ZodError → 400, others → 500.
- `src/lib/env.ts` — validated env vars via `t3-oss/env-nextjs`. Throws at startup if required vars missing. Use this instead of `process.env` directly.
- `src/lib/tiendanube/index.ts` — OAuth flow, API client, webhook verification. Access tokens stored encrypted (see `src/lib/utils/crypto.ts`).
- `src/lib/tinybird/index.ts` — click ingestion + analytics queries. If `TINYBIRD_API_KEY` is missing, all calls are silent no-ops.

### UI Components

Shared components live in `src/components/ui/` (Button, Card, Input, Modal, Sheet, Skeleton, Avatar, etc.). New UI should use these before creating new ones.

Emil Kowalski design skills are installed in `.agents/skills/` — invoke `/apple-design`, `/emil-design-eng`, `/improve-animations` etc. for design guidance.

## Environment Variables

Required (app crashes without these): `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `ENCRYPTION_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `TIENDANUBE_CLIENT_ID`, `TIENDANUBE_CLIENT_SECRET`, `TIENDANUBE_REDIRECT_URI`, `NEXT_PUBLIC_APP_URL`

Optional (graceful degradation): `TINYBIRD_API_KEY`, `BRIEF_READ_WRITE_TOKEN`, `WEBHOOK_SECRET`

Multi-host (blank = single-domain dev): `NEXT_PUBLIC_APP_DOMAIN`, `NEXT_PUBLIC_CREATOR_DOMAIN`, `NEXT_PUBLIC_ROOT_DOMAIN`, `NEXT_PUBLIC_SHORT_DOMAIN`

## Database

Prisma + PostgreSQL (Neon). Uses `db push` not `db migrate` — no migration files. Key patterns:
- `@map("snake_case")` on all models for table naming
- Encrypted fields: Tiendanube access tokens go through `encrypt()`/`decrypt()` before storage
- Click deduplication via `ipHash` (SHA256 of IP, privacy-preserving)
- `SKIP_ENV_VALIDATION=1` to bypass env validation in CI

## What's Disabled

The **Drops** feature (limited-edition product campaigns) is disabled in the nav/sidebar but all code and DB models remain intact. Don't remove it — it will be re-enabled in another platform that shares this DB.
