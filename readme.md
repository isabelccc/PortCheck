# Disclosure DAG demo

# Disclosure DAG Demo

A monorepo prototype for issuer-side ETF-style disclosure operations. The system models versioned fund documents, DAG-based approval workflows, append-only audit events, a per-version filing QA workspace, and a role-aware review queue.

It is designed to demonstrate auditability, controlled state transitions, and review workflows in regulated environments. Seed data and validation checks are illustrative only.



## Features

- **Funds & documents** — Browse funds, documents, and paginated **document versions** (`draft` / `in_review` / `approved`) with optional **parent version** lineage.
- **Workflow runs** — Each run is tied to a **document version**. Steps are stored in `step_executions` and visualized with **React Flow** (template nodes + edges).
- **Rules engine** — Shared TypeScript module validates transitions against the DAG (upstream steps must be `completed` or `skipped` before downstream advances). Enforced on the **server**; the UI disables invalid actions.
- **Manual & auto-advance** — Per-step status buttons; optional **auto-run** applies waves of `pending → running` then `running → completed` under the same rules. **Approval** steps require an **evidence note** when completing manually; auto-run injects a demo-only comment for approvals.
- **Audit trail** — `/audit` lists append-only `audit_events` (filters by run, document version id, entity type). Workflow, checklist, and content updates emit events.
- **Filing QA workspace** — `/documents/[documentId]/versions/[versionId]`: edit body (**admin** only, non-approved versions), **line diff vs parent**, **QA checklist** (reviewer/admin), **iXBRL fact drafts** with a **demo** validator, download **EDGAR-style HTML** via `/api/edgar/[versionId]` (reviewer/admin).
- **Compliance hub** — `/compliance` shows seeded **compliance policies** and sets a **demo role** cookie: `viewer` (read-only workflow/checklist), `reviewer`, `admin` (+ content edit).
- **Review queue** — `/reviews` lists versions in `draft` or `in_review` and counts open **required** checklist items.

## Stack

- **Next.js 16** (App Router), React 19, **Server Actions**
- **PostgreSQL** + **Drizzle ORM** (`packages/db` workspace package)
- **Turborepo**, TypeScript, ESLint
- **React Flow** (`@xyflow/react`), **diff** (redlines)

## Prerequisites

- Node.js (see repo/tooling; Next 16 compatible)
- PostgreSQL and a `DATABASE_URL` connection string

## Setup

1. **Environment** — At the monorepo root (or where your tooling loads env), set:

   ```sh
   DATABASE_URL=postgres://user:password@localhost:5432/your_db
   ```

2. **Migrate & seed** (from `packages/db`):

   ```sh
   cd packages/db
   npm install
   npm run db:migrate
   npm run db:seed
   ```

3. **Install & run the web app**:

   ```sh
   cd ../..   # repo root
   npm install
   npm run dev:web
   ```

   Or from root with Turborepo: `npx turbo dev --filter=web`

4. Open **http://localhost:3000** (or the port your script uses).

## Useful commands

| Command | Description |
|--------|-------------|
| `npm run dev:web` | Dev server for `apps/web` (see root `package.json`) |
| `npm run build` | Often run per app, e.g. `cd apps/web && npm run build` |
| `cd packages/db && npm run db:studio` | Drizzle Studio (inspect DB) |

## Repository layout

- `apps/web` — Next.js UI and server actions
- `packages/db` — Drizzle schema, migrations, seed script
- `apps/docs` — Stub docs app (original turbo template; optional)

Key app paths:

- `apps/web/app/actions/workflow.ts` — Step updates, auto waves
- `apps/web/lib/workflow-rules-engine.ts` — DAG transition rules
- `apps/web/lib/demo-role-server.ts` / `demo-role-constants.ts` — Demo RBAC
- `packages/db/src/schema.ts`, `workflow.ts`, `compliance.ts` — Tables

## Disclaimer

Demo exports, iXBRL checks, and policies are for **illustration only**. Real regulatory filings require certified processes, correct taxonomies, and firm-specific controls.

## Turborepo

This repo uses [Turborepo](https://turborepo.dev). To build all packages:

```sh
npx turbo build
```

See [Turborepo docs](https://turborepo.dev/docs) for caching, filters, and remote cache.
