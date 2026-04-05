# Disclosure DAG demo

**Versioned disclosure documents · DAG-based approvals · append-only audit trail · QA gating**

Monorepo: **Next.js 16** (App Router, Server Actions) + **PostgreSQL** + **Drizzle**. Models fund-level documents, **revision history**, a **parallel review workflow** (DAG with React Flow), a **Filing QA workspace** (checklist, redlines, iXBRL drafts, HTML export stub), and an **append-only** `audit_events` log. **Business rules for submission and sign-off are enforced on the server** (see below)—not button-only UX.

---

## Server-enforced approval & QA gates (what to show in interviews)

| Control | Where it’s enforced |
|--------|----------------------|
| **Required checklist** before **Submit for review** | `submitVersionForApproval` in `compliance-workspace.ts` — rejects if any open required rows. |
| **Required checklist + `in_review`** before completing workflow **final approval** | `workflow.ts` — `assertFinalApprovalQaGates` on step transition to `completed`. |
| **Evidence note length** when completing required checklist items | `toggleChecklistItem` — minimum length for audit trail. |
| **Formal document approve** (`in_review` → `approved`) | `approveDocumentVersion` — **admin** role; requires closed required QA + completed workflow final (if a run exists); attestation text; **`version_approved`** audit row. |
| **Reject / reopen** | `rejectDocumentVersion` / `reopenRejectedVersion` — rationale + audit. |

Role model is a **cookie** (`viewer` / `reviewer` / `admin`) for the demo, but **checks are duplicated server-side** on every mutation.

---

## Features (product map)

- **Funds & documents** — Funds, documents, paginated **document versions** (`draft` / `in_review` / `approved` / `rejected`), optional **parent** or **previous-revision** redlines.
- **Workflow runs** — Run bound to a **document version**; `step_executions` + **React Flow**; DAG rules in **`workflow-rules-engine.ts`** and **`actions/workflow.ts`**.
- **Audit trail** — `/audit` — paginated, filterable `audit_events` (run, document version id, entity type).
- **Filing QA workspace** — Per-version: content, redline, **grouped checklist**, iXBRL drafts (validator), export. **Process control** surfaces gate status vs linked workflow run.
- **Compliance hub** — Policy library + demo role switcher.
- **Review queue** — `draft` / `in_review` / `rejected` with open required-item counts.

## Stack

- **Next.js 16** (App Router), React 19, **Server Actions**
- **PostgreSQL** + **Drizzle ORM** (`packages/db` workspace package)
- **Turborepo**, TypeScript, ESLint
- **React Flow** (`@xyflow/react`), **diff** (redlines)

## Prerequisites

- Node.js (see repo/tooling; Next 16 compatible)
- PostgreSQL and a `DATABASE_URL` connection string

## Setup

From **this monorepo root** (where root `package.json` lives):

1. **Environment** — Set `DATABASE_URL` in `.env` at the repo root (or your shell):

   ```sh
   DATABASE_URL=postgres://user:password@localhost:5432/your_db
   ```

2. **Install & migrate & seed**:

   ```sh
   npm install
   cd packages/db
   npm run db:migrate
   npm run db:seed
   cd ../..
   ```

3. **Run the web app**:

   ```sh
   npm run dev:web
   ```

   Or: `npx turbo dev --filter=web`

4. Open **http://localhost:3000**.

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

Seed policies, HTML/iXBRL export stubs, and validation rules are **not** submission-grade. Real filings require certified processes, correct taxonomies, and firm-specific controls.

## Turborepo

This repo uses [Turborepo](https://turborepo.dev). To build all packages:

```sh
npx turbo build
```

See [Turborepo docs](https://turborepo.dev/docs) for caching, filters, and remote cache.
