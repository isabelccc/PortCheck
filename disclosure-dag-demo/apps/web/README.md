# Web app (`apps/web`)

Next.js **Disclosure DAG demo** UI: funds, documents, workflow runs, audit, compliance, review queue, and per-version Filing QA workspace.

## Run locally

From the **monorepo root** (recommended):

```sh
npm run dev:web
```

Or from this directory:

```sh
npm install
npm run dev
```

Ensure `DATABASE_URL` is set and `packages/db` migrations + seed have been applied (see root [README.md](../../README.md)).

## Build

```sh
npm run build
```
