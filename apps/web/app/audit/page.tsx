import type { CSSProperties } from "react";
import Link from "next/link";
import { auditEvents, db, verifyAuditIntegrityChain } from "@repo/db";
import { and, desc, ilike, or, sql } from "drizzle-orm";
import {
  DocumentPagination,
  parseListPagination,
} from "../components/document-pagination";
import {
  auditActionLabel,
  auditEntityLabel,
  auditRunIdFromRow,
  getAuditBodyDiffPayload,
} from "../../lib/audit-display";
import { AuditBodyTextDiff } from "./audit-body-text-diff";
import styles from "../disclosure.module.css";

export const dynamic = "force-dynamic";

const AUDIT_PAGE_SIZE_DEFAULT = 8;

type PageProps = {
  searchParams: Promise<{
    q?: string;
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

/** Stable custom ident for CSS anchor-name / position-anchor (UUID → hex only). */
function auditBodyDiffAnchorName(eventId: string) {
  return `--adb${eventId.replace(/-/g, "")}`;
}

/** ILIKE pattern: %query% with % and _ escaped for PostgreSQL LIKE. */
function auditSearchIlikePattern(raw: string): string {
  const t = raw.trim();
  if (!t) return "%";
  return `%${t.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
}

function auditSearchWhere(q: string) {
  const trimmed = q.trim();
  if (!trimmed) return undefined;
  const pat = auditSearchIlikePattern(trimmed);
  return or(
    sql`${auditEvents.entityId}::text ILIKE ${pat}`,
    sql`coalesce(${auditEvents.payload}->>'runId','') ILIKE ${pat}`,
    sql`coalesce(${auditEvents.payload}->>'documentVersionId','') ILIKE ${pat}`,
    ilike(auditEvents.entityType, pat),
    ilike(auditEvents.actorId, pat),
    ilike(auditEvents.action, pat),
  )!;
}

export default async function AuditPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = sp.q?.trim() ? sp.q.trim() : "";
  const { page: requestedPage, perPage } = parseListPagination(
    sp,
    AUDIT_PAGE_SIZE_DEFAULT,
  );

  const where = auditSearchWhere(q);

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
  if (q) extraQuery.q = q;

  const hasFilters = q.length > 0;

  const chainCheck =
    total > 0 ? await verifyAuditIntegrityChain() : ({ ok: true as const });

  return (
    <div className={styles.shell}>
      <main className={styles.inner}>
        <Link href="/" className={styles.back}>
          ← Home
        </Link>
        <h1 className={styles.display}>Audit</h1>
        <p className={styles.subtitleTight}>
          Append-only event log with hash chain verification.
        </p>
        {chainCheck.ok ? (
          <p className={styles.subtitleTight} style={{ marginTop: "-1rem", marginBottom: "1rem" }}>
            Hash chain verified.
          </p>
        ) : (
          <p className={styles.workflowError} role="alert" style={{ marginTop: "0.35rem" }}>
            Integrity check failed: {chainCheck.reason}
            {chainCheck.eventId ? ` (event ${chainCheck.eventId.slice(0, 8)}…)` : ""}. Run{" "}
            <code className={styles.auditCode}>npm run db:backfill-audit-chain</code> in{" "}
            <code className={styles.auditCode}>packages/db</code> after migrating.
          </p>
        )}

        <form
          className={styles.auditFilters}
          method="get"
          action="/audit"
          role="search"
        >
          <label className={styles.auditSearchWrap}>
            <span className={styles.auditSearchLabel}>Search</span>
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Run ID, version ID, entity type, action, actor…"
              className={styles.auditInput}
              autoComplete="off"
              enterKeyHint="search"
            />
          </label>
          <div className={styles.auditFilterActions}>
            <button type="submit" className={styles.auditSubmit}>
              Search
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
            Search active — pagination keeps <code className={styles.auditCode}>q</code>{" "}
            in the URL.
          </p>
        ) : null}

        <div
          className={`${styles.innerTableBleed} ${styles.auditTableWrap}`}
        >
          <table className={styles.auditTable}>
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>What happened</th>
                <th>Record</th>
                <th>Chain</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const runLinkId = auditRunIdFromRow(
                  e.action,
                  e.entityType,
                  e.entityId,
                  e.payload,
                );
                const bodyDiff = getAuditBodyDiffPayload(e.payload);

                return (
                  <tr key={e.id}>
                    <td className={styles.auditCellNowrap}>
                      {formatWhen(e.createdAt)}
                    </td>
                    <td>{e.actorId}</td>
                    <td className={styles.auditColWhat}>
                      <div className={styles.auditWhatPrimary}>
                        <span>{auditActionLabel(e.action)}</span>
                        {runLinkId ? (
                          <>
                            {" · "}
                            <Link
                              href={`/runs/${runLinkId}`}
                              className={styles.inlineLink}
                            >
                              Open run (DAG)
                            </Link>
                          </>
                        ) : null}
                      </div>
                      {bodyDiff ? (
                        <div
                          className={styles.auditWhatRedline}
                          style={{ marginTop: "0.35rem" }}
                        >
                          <div
                            className={styles.auditDiffHover}
                            style={
                              {
                                anchorName: auditBodyDiffAnchorName(e.id),
                              } as CSSProperties
                            }
                          >
                            <button
                              type="button"
                              className={styles.auditDiffHoverTrigger}
                              aria-describedby={`audit-body-tooltip-${e.id}`}
                            >
                              Text redline (− / +)
                            </button>
                            <div
                              id={`audit-body-tooltip-${e.id}`}
                              className={styles.auditDiffTooltip}
                              role="tooltip"
                              style={
                                {
                                  positionAnchor: auditBodyDiffAnchorName(e.id),
                                } as CSSProperties
                              }
                            >
                              {bodyDiff.truncatedNote ? (
                                <p className={styles.auditDiffTooltipNote}>
                                  {bodyDiff.truncatedNote}
                                </p>
                              ) : null}
                              <div className={styles.auditDiffTooltipScroll}>
                                <AuditBodyTextDiff
                                  prior={bodyDiff.prior}
                                  next={bodyDiff.next}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </td>
                    <td className={styles.auditColRecord}>
                      <div>{auditEntityLabel(e.entityType)}</div>
                      <div className={styles.auditCellMuted}>
                        ID {e.entityId.slice(0, 8)}…
                      </div>
                    </td>
                    <td className={styles.auditChainCell}>
                      {e.integrityRecordHash ? (
                        <>
                          <div>
                            <span className={styles.auditChainLabel}>Hash</span>
                            <code
                              className={styles.auditCode}
                              title={e.integrityRecordHash}
                            >
                              {e.integrityRecordHash.slice(0, 6)}…
                            </code>
                          </div>
                          <div style={{ marginTop: "0.2rem" }}>
                            <span className={styles.auditChainLabel}>Prev</span>
                            {e.integrityPrevHash ? (
                              <code
                                className={styles.auditCode}
                                title={e.integrityPrevHash}
                              >
                                {e.integrityPrevHash.slice(0, 6)}…
                              </code>
                            ) : (
                              <span className={styles.auditCellMuted}>genesis</span>
                            )}
                          </div>
                        </>
                      ) : (
                        <span className={styles.auditCellMuted}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
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
