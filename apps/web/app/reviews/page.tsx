import Link from "next/link";
import {
  db,
  documentVersions,
  documents,
  funds,
  versionChecklistItems,
  workflowRuns,
  workflowTemplates,
} from "@repo/db";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import {
  DocumentPagination,
  parseListPagination,
} from "../components/document-pagination";
import { getDemoRole } from "../../lib/demo-role-server";
import styles from "../disclosure.module.css";

export const dynamic = "force-dynamic";

const REVIEW_QUEUE_PAGE_SIZE = 8;

type PageProps = {
  searchParams: Promise<{ page?: string; perPage?: string }>;
};

const reviewQueueWhere = or(
  eq(documentVersions.status, "in_review"),
  eq(documentVersions.status, "draft"),
  eq(documentVersions.status, "rejected"),
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

  const runRows = await db
    .select({
      run: workflowRuns,
      template: workflowTemplates,
      version: documentVersions,
      document: documents,
      fund: funds,
    })
    .from(workflowRuns)
    .innerJoin(
      workflowTemplates,
      eq(workflowRuns.templateId, workflowTemplates.id),
    )
    .innerJoin(
      documentVersions,
      eq(workflowRuns.documentVersionId, documentVersions.id),
    )
    .innerJoin(documents, eq(documentVersions.documentId, documents.id))
    .leftJoin(funds, eq(documents.fundId, funds.id))
    .orderBy(desc(workflowRuns.createdAt))
    .limit(50);

  return (
    <div className={styles.shell}>
      <main className={styles.inner}>
        <Link href="/" className={styles.back}>
          ← Home
        </Link>
        <h1 className={styles.display}>Workflow &amp; review</h1>
        <p className={styles.subtitleTight}>
          Role: <strong>{role}</strong>
          {" · "}
          <Link href="/compliance" className={styles.inlineLink}>
            Change role
          </Link>
        </p>

        <h2 id="review-queue" className={styles.pageSectionHeading}>
          Review queue
        </h2>

        <DocumentPagination
          basePath="/reviews"
          page={page}
          perPage={perPage}
          total={total}
          defaultPerPage={REVIEW_QUEUE_PAGE_SIZE}
          zeroStateMessage="No versions in queue."
          navAriaLabel="Review queue pages"
        />

        {versions.length === 0 ? (
          <p className={styles.empty}>No versions in draft, in review, or rejected.</p>
        ) : (
          <div className={styles.innerTableBleed}>
            <table
              className={styles.reviewQueueTable}
              aria-label="Review queue"
            >
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Fund</th>
                  <th>Open QA</th>
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
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2
          id="workflow-runs"
          className={`${styles.pageSectionHeading} ${styles.pageSectionHeadingSpaced}`}
        >
          Workflow runs
        </h2>

        {runRows.length === 0 ? (
          <p className={styles.empty}>No workflow runs yet.</p>
        ) : (
          <div className={styles.cardList}>
            {runRows.map(({ run, template, version, document, fund }) => (
              <Link
                key={run.id}
                href={`/runs/${run.id}`}
                className={styles.card}
              >
                <div className={styles.cardTitle}>{template.name}</div>
                <div className={styles.cardMeta}>
                  {document.title} · v{version.version}
                  {fund?.name ? ` · ${fund.name}` : ""}
                  {fund?.ticker ? ` (${fund.ticker})` : ""}
                </div>
                <div className={styles.cardMeta} style={{ marginTop: "0.35rem" }}>
                  {run.status ?? "—"} · {new Date(run.createdAt).toLocaleString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
