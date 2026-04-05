# Disclosure workflow & audit trail (portfolio)

**Versioned disclosure documents · DAG-based approvals · append-only audit · QA gating enforced on the server**

The application lives in **`disclosure-dag-demo/`**. This file is the GitHub landing README for the parent folder (historically named `port-check` on some remotes). If your repo is still called something like “PortCheck”, consider **renaming it** (e.g. `disclosure-dag-demo`, `filing-workflow-demo`) and updating the **GitHub About** description and **Vercel** project name so they match this project—not a port scanner.

---

## What this is (for hiring managers)

A **Next.js + Postgres** slice of **issuer-style disclosure operations**: funds and documents, **immutable-style version history**, a **parallel review DAG** (React Flow), and a **Filing QA workspace** with checklist, redlines, and export stubs. Mutations and approvals go through **Server Actions**; sensitive rules are **not** UI-only.

**Resume-ready one-liner:**

> Built a disclosure QA workspace with **server-enforced** checklist gates, **DAG workflow** transitions, **admin document sign-off** (`in_review` → `approved`) with **reject / reopen**, and an **append-only audit log**—Next.js 16, Drizzle, PostgreSQL.

---

## First-class approve flow (server-side)

These are enforced in **`apps/web/app/actions/`** (not just disabled buttons):

| Gate | Behavior |
|------|----------|
| **Submit for review** | Blocked until all **required** checklist rows are complete (with evidence note length enforced for required items). |
| **Workflow final approval** | Cannot mark **final approval** step `completed` unless the linked version is **`in_review`** and required checklist is still clear. |
| **Approve version** | **Admin-only**; blocked if required QA open or (when a run exists) workflow **final approval** is not completed; requires attestation text; sets `approved`; writes **`version_approved`** audit event. |
| **Reject / reopen** | Reviewer+admin **reject** (`in_review` → `rejected`, rationale + audit); **reopen** to `draft` for revision. |

Full detail, stack, setup, and **architecture boundaries** (where logic is allowed to live): see **[disclosure-dag-demo/README.md](./disclosure-dag-demo/README.md)**.

---

## Repo layout

| Path | Role |
|------|------|
| **`disclosure-dag-demo/`** | Turborepo monorepo (`apps/web`, `packages/db`, …) |
| **`disclosure-dag-demo/apps/web`** | Next.js app |
| **`disclosure-dag-demo/packages/db`** | Drizzle schema, migrations, seed |

There is **no** `package.json` at this parent-folder root; install and scripts run from **`disclosure-dag-demo`**.

---

## Quick start

```sh
cd disclosure-dag-demo
npm install

# Postgres — set DATABASE_URL in disclosure-dag-demo/.env (or env)
cd packages/db
npm run db:migrate
npm run db:seed

cd ../..
npm run dev:web
```

Open **http://localhost:3000**. Set **reviewer** / **admin** on **Compliance** to exercise mutations and sign-off.

---

## Deploy (Vercel)

- **Root Directory**: **`disclosure-dag-demo/apps/web`** (not the monorepo root and not `apps/` alone).
- Set **`DATABASE_URL`** for Production (and Preview if needed). See `apps/web/vercel.json` for install/build commands.

If the live URL still looks like `port-check.vercel.app`, rename the Vercel project or add a domain that matches the product name when you can.

---

## Disclaimer

EDGAR / iXBRL / policy text in seed data are **illustrative**. Production filings need firm processes, certified tooling, and correct taxonomies.
