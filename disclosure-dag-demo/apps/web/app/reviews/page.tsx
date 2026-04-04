import Link from "next/link";
import { db, documentVersions, documents, funds, versionChecklistItems } from "@repo/db";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import {
  DocumentPagination,
  parseListPagination,
} from "../components/document-pagination";
import { getDemoRole } from "../../lib/demo-role-server";
import styles from "../disclosure.module.css";

export const dynamic = "force-dynamic";

const REVIEW_QUEUE_PAGE_SIZE = 15;

type PageProps = {
  searchParams: Promise<{ page?: string; perPage?: string }>;
};

const reviewQueueWhere = or(
  eq(documentVersions.status, "in_review"),
  eq(documentVersions.status, "draft"),
);

export default async function ReviewsPage({ searchParams }: PageProps) {
  const role = await getDemoRole();
  const sp = await searchParams;
  const { page: requestedPage, perPage } = parseListPagination(
    sp,
    REVIEW_QUEUE_PAGE_SIZE,
  );

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(documentVersions)
    .innerJoin(documents, eq(documents.id, documentVersions.documentId))
    .innerJoin(funds, eq(funds.id, documents.fundId))
    .where(reviewQueueWhere);

  const total = countRow?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * perPage;

  const versions = await db
    .select({
      v: documentVersions,
      d: documents,
      f: funds,
    })
    .from(documentVersions)
    .innerJoin(documents, eq(documents.id, documentVersions.documentId))
    .innerJoin(funds, eq(funds.id, documents.fundId))
    .where(reviewQueueWhere)
    .orderBy(desc(documentVersions.createdAt))
    .limit(perPage)
    .offset(offset);

  const versionIds = versions.map((r) => r.v.id);
  const openByVersion = new Map<string, number>();

  if (versionIds.length > 0) {
    const openRows = await db
      .select({
        vid: versionChecklistItems.documentVersionId,
        n: sql<number>`count(*)::int`,
      })
      .from(versionChecklistItems)
      .where(
        and(
          inArray(versionChecklistItems.documentVersionId, versionIds),
          eq(versionChecklistItems.required, true),
          isNull(versionChecklistItems.completedAt),
        ),
      )
      .groupBy(versionChecklistItems.documentVersionId);

    for (const r of openRows) {
      openByVersion.set(r.vid, r.n);
    }
  }

  return (
    <div className={styles.shell}>
      <main className={styles.inner}>
        <Link href="/compliance" className={styles.back}>
          ← Compliance
        </Link>
        <h1 className={styles.title}>Review queue</h1>
        <p className={styles.subtitle}>
          Document versions in <strong>draft</strong> or{" "}
          <strong>in_review</strong> (demo). Open required checklist items are
          counted per version. Aligns with a simple SEC-style &ldquo;work in
          progress&rdquo; queue — not a production filing calendar.
        </p>
        <p className={styles.workflowPanelHint}>
          Your role: <strong>{role}</strong> · set on{" "}
          <Link href="/compliance" className={styles.inlineLink}>
            Compliance
          </Link>
        </p>

        <DocumentPagination
          basePath="/reviews"
          page={page}
          perPage={perPage}
          total={total}
          defaultPerPage={REVIEW_QUEUE_PAGE_SIZE}
          zeroStateMessage="No versions in draft or in_review."
          navAriaLabel="Review queue pages"
        />

        {versions.length === 0 ? (
          <p className={styles.empty}>No versions in draft or in_review.</p>
        ) : (
          <>
            <div
              className={styles.sectionLabel}
              style={{ marginTop: "1.25rem", marginBottom: "0.65rem" }}
            >
              Queue listing
            </div>
            <table
              className={styles.reviewQueueTable}
              aria-label="Queue listing"
            >
            <thead>
              <tr>
                <th>Document</th>
                <th>Version</th>
                <th>Status</th>
                <th>Fund</th>
                <th>Open required QA</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {versions.map(({ v, d, f }) => (
                <tr key={v.id}>
                  <td>{d.title}</td>
                  <td>{v.version}</td>
                  <td>{v.status.replaceAll("_", " ")}</td>
                  <td>
                    {f.name}
                    {f.ticker ? ` (${f.ticker})` : ""}
                  </td>
                  <td>{openByVersion.get(v.id) ?? 0}</td>
                  <td>
                    <Link
                      href={`/documents/${d.id}/versions/${v.id}`}
                      className={styles.inlineLink}
                    >
                      QA workspace
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </main>
    </div>
  );
}
