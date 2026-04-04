# Disclosure DAG demo

A monorepo prototype for issuer-side ETF-style disclosure operations. The system models versioned fund documents, DAG-based approval workflows, append-only audit events, a per-version filing QA workspace, and a role-aware review queue.

It is designed to demonstrate auditability, controlled state transitions, and review workflows in regulated environments. Seed data and validation checks are illustrative only.



## Features

- **Funds & documents** — Browse funds, documents, and paginated **document versions** (`draft` / `in_review` / `approved`) with optional **parent version** lineage.
- **Workflow runs** — Each run is tied to a **document version**. Steps are stored in `step_executions` and visualized with **React Flow** (template nodes + edges).
- **Rules engine** — Shared TypeScript module validates transitions against the DAG (upstream steps must be `completed` or `skipped` before downstream advances). Enforced on the **server**; the UI disables invalid actions.
- **Manual & auto-advance** — Per-step status buttons; optional **auto-run** applies waves of `pending → running` then `running → completed` under the same rules. **Approval** steps require an **evidence note** when completing manually; auto-run injects a demo-only comment for approvals.
- **Audit trail** — `/audit` lists append-only `audit_events` (filters by run, document version id, entity type). Workflow, checklist, and content updates emit events.
- **Filing QA workspace** — `/documents/[documentId]/versions/[versionId]`: edit body (**reviewer/admin**, non-approved versions), **line diff vs parent / previous revision**, **QA checklist**, **iXBRL fact drafts** (demo validator), **EDGAR-style HTML** download via `/api/edgar/[versionId]` (reviewer/admin). **Admin** may record formal **document approval**; **reviewer/admin** may **reject** / reopen.
- **Compliance hub** — `/compliance` shows seeded **compliance policies** and sets a **demo role** cookie: `viewer` (read-only), `reviewer` / `admin` (mutations + export; admin-only formal sign-off).
- **Review queue** — `/reviews` lists versions in `draft`, `in_review`, or `rejected` and counts open **required** checklist items.

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

## Architecture boundaries

This section is the **single place** to answer: “Where is it OK to put logic?” The stack is intentionally thin (no separate domain package yet); these rules keep the demo maintainable and safe.

### System diagram

```mermaid
flowchart TB
  subgraph browser ["Browser"]
    C["Client components\n(*-client.tsx)"]
  end
  subgraph next ["Next.js server"]
    P["Server Components\n(app/**/page.tsx, layout)"]
    A["Server Actions\n(app/actions/*.ts)"]
    R["Route handlers\n(app/api/**/route.ts)"]
    L["Shared libs\n(apps/web/lib/*.ts)"]
  end
  subgraph pkg ["Workspace package"]
    DB["@repo/db\nschema · migrations · seed · db client"]
  end
  PG[(PostgreSQL)]

  C -->|"calls"| A
  C -->|"GET /api/…"| R
  P -->|"read model"| DB
  A --> L
  A --> DB
  R --> L
  R --> DB
  DB --> PG
```

**Data flow shorthand:** UI triggers **Server Actions** or **route handlers** for anything that must be trusted; **RSC pages** may query `@repo/db` directly for **reads**. **Append-only audit** and **state mutations** always go through server-side code, never from the client alone.

### Where logic is allowed

| Kind of logic | Put it here | Notes |
|---------------|-------------|--------|
| **Presentation** (tabs, optimistic UI, formatting) | `*-client.tsx`, small helpers next to UI | No security or authority decisions. |
| **Demo RBAC** (“can this cookie role do X?”) | `lib/demo-role-constants.ts` | Capability map; **enforce again** in Server Actions / routes. |
| **Resolve current demo role** | `lib/demo-role-server.ts` | Server-only; reads cookie. |
| **DAG step transition rules** (pure) | `lib/workflow-rules-engine.ts` | No I/O. Same rules used by UI previews and `actions/workflow.ts`. |
| **QA / sign-off readiness** (aggregated read model) | `lib/version-approval-readiness.ts` | DB reads composed for gates; keep **mutations** in actions. |
| **iXBRL HTML export** (string build) | `lib/inline-ixbrl-html.ts` | Called from route handler; no DB rules beyond supplied rows. |
| **Orchestration: mutations, audits, revalidate** | `app/actions/workflow.ts`, `app/actions/compliance-workspace.ts` | **Source of truth** for “what happened”; call libs for pure checks. |
| **Binary / attachment-style HTTP** | `app/api/**/route.ts` | e.g. EDGAR-style download; still check role here. |
| **Table shapes, migrations, seed** | `packages/db` | Schema + data definition; avoid embedding **business policy** in column defaults beyond obvious constraints. |
| **Direct DB reads in pages** | `page.tsx` (server) | Fine for lists/detail when no shared helper exists yet; prefer extracting repeated queries into `lib/` or a future `packages/domain`. |

### Explicit non-goals (still shallow on purpose)

- No standalone **BFF** or public **REST/GraphQL API** layer — Next Actions + a few routes are the API.
- No **event bus** or outbox — audit rows approximate compliance logging.
- **Production IAM** (SSO, ABAC, delegations) is not modeled; the cookie is a stand-in.

When the project grows, the first structural deepening step is usually: **extract pure policy from actions into `packages/domain` (or `lib/domain`)** without changing behavior — this README’s table then gains an extra column for that layer.

## Disclaimer

Demo exports, iXBRL checks, and policies are for **illustration only**. Real regulatory filings require certified processes, correct taxonomies, and firm-specific controls.

## Turborepo

This repo uses [Turborepo](https://turborepo.dev). To build all packages:

```sh
npx turbo build
```

See [Turborepo docs](https://turborepo.dev/docs) for caching, filters, and remote cache.
