import Link from "next/link";
import { auditEvents, db } from "@repo/db";
import { and, desc, eq, or, sql } from "drizzle-orm";
import {
  DocumentPagination,
  parseListPagination,
} from "../components/document-pagination";
import styles from "../disclosure.module.css";

export const dynamic = "force-dynamic";

const AUDIT_PAGE_SIZE_DEFAULT = 25;

type PageProps = {
  searchParams: Promise<{
    runId?: string;
    documentVersionId?: string;
    entityType?: string;
    page?: string;
    perPage?: string;
  }>;
};

function formatWhen(d: Date | string) {
  const date = d instanceof Date ? d : new Date(d);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

export default async function AuditPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const runId = sp.runId?.trim() || "";
  const documentVersionId = sp.documentVersionId?.trim() || "";
  const entityType = sp.entityType?.trim() || "";
  const { page: requestedPage, perPage } = parseListPagination(
    sp,
    AUDIT_PAGE_SIZE_DEFAULT,
  );

  const conditions = [];

  if (entityType) {
    conditions.push(eq(auditEvents.entityType, entityType));
  }

  if (runId) {
    conditions.push(
      or(
        eq(auditEvents.entityId, runId),
        sql`${auditEvents.payload}->>'runId' = ${runId}`,
      )!,
    );
  }

  if (documentVersionId) {
    conditions.push(
      or(
        eq(auditEvents.entityId, documentVersionId),
        sql`${auditEvents.payload}->>'documentVersionId' = ${documentVersionId}`,
      )!,
    );
  }

  const where =
    conditions.length > 0 ? and(...conditions) : undefined;

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(auditEvents)
    .where(where);

  const total = countRow?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * perPage;

  const rows = await db
    .select()
    .from(auditEvents)
    .where(where)
    .orderBy(desc(auditEvents.createdAt))
    .limit(perPage)
    .offset(offset);

  const extraQuery: Record<string, string> = {};
  if (runId) extraQuery.runId = runId;
  if (documentVersionId) extraQuery.documentVersionId = documentVersionId;
  if (entityType) extraQuery.entityType = entityType;

  const hasFilters = !!(entityType || runId || documentVersionId);

  return (
    <div className={styles.shell}>
      <main className={styles.inner}>
        <Link href="/runs" className={styles.back}>
          ← Runs
        </Link>
        <h1 className={styles.display}>Audit trail</h1>
        <p className={styles.subtitle}>
          Append-only <code>audit_events</code> (demo). Filter by run, document
          version id, or entity type.
        </p>

        <form className={styles.auditFilters} method="get" action="/audit">
          <label className={styles.auditField}>
            <span>Run ID (UUID)</span>
            <input
              name="runId"
              type="text"
              defaultValue={runId}
              placeholder="f1130001-…"
              className={styles.auditInput}
            />
          </label>
          <label className={styles.auditField}>
            <span>Document version ID</span>
            <input
              name="documentVersionId"
              type="text"
              defaultValue={documentVersionId}
              placeholder="b0000002-…"
              className={styles.auditInput}
            />
          </label>
          <label className={styles.auditField}>
            <span>Entity type</span>
            <input
              name="entityType"
              type="text"
              defaultValue={entityType}
              placeholder="step_execution, checklist_item, …"
              className={styles.auditInput}
            />
          </label>
          <div className={styles.auditFilterActions}>
            <button type="submit" className={styles.auditSubmit}>
              Apply filters
            </button>
            <Link href="/audit" className={styles.auditClear}>
              Clear
            </Link>
          </div>
        </form>

        <DocumentPagination
          basePath="/audit"
          page={page}
          perPage={perPage}
          total={total}
          defaultPerPage={AUDIT_PAGE_SIZE_DEFAULT}
          extraQuery={extraQuery}
          zeroStateMessage={
            hasFilters
              ? "No events match these filters"
              : "No audit events yet"
          }
          navAriaLabel="Audit log pages"
        />
        {hasFilters ? (
          <p className={styles.paginationMeta} style={{ marginTop: "-0.5rem" }}>
            Filters active — pagination keeps run / version / entity type in the URL.
          </p>
        ) : null}

        <div className={styles.auditTableWrap}>
          <table className={styles.auditTable}>
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Payload</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className={styles.auditCellNowrap}>
                    {formatWhen(e.createdAt)}
                  </td>
                  <td>{e.actorId}</td>
                  <td>
                    <code className={styles.auditCode}>{e.action}</code>
                  </td>
                  <td>
                    <div>
                      <code className={styles.auditCode}>{e.entityType}</code>
                    </div>
                    <div className={styles.auditCellMuted}>
                      {e.entityId.slice(0, 8)}…
                    </div>
                  </td>
                  <td className={styles.auditPayload}>
                    <pre>{JSON.stringify(e.payload, null, 0)}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 ? (
          <div className={styles.empty} style={{ marginTop: "1.5rem" }}>
            No events match these filters.
          </div>
        ) : null}
      </main>
    </div>
  );
}
