import Link from "next/link";
import { notFound } from "next/navigation";
import { db, documentVersions, documents, funds } from "@repo/db";
import { asc, eq, sql } from "drizzle-orm";
import {
  DocumentPagination,
  parseListPagination,
} from "../../components/document-pagination";
import styles from "../../disclosure.module.css";

export const dynamic = "force-dynamic";

/** Fewer versions per page than fund lists — each block can be very long. */
const VERSIONS_DEFAULT_PAGE_SIZE = 5;

type PageProps = {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ page?: string; perPage?: string }>;
};

function badgeForStatus(status: string) {
  switch (status) {
    case "approved":
      return `${styles.badge} ${styles.badgeApproved}`;
    case "in_review":
      return `${styles.badge} ${styles.badgeReview}`;
    default:
      return `${styles.badge} ${styles.badgeDraft}`;
  }
}

function formatWhen(d: Date | string) {
  const date = d instanceof Date ? d : new Date(d);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function DocumentDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { documentId } = await params;
  const sp = await searchParams;
  const { page: requestedPage, perPage } = parseListPagination(
    sp,
    VERSIONS_DEFAULT_PAGE_SIZE,
  );

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc) {
    notFound();
  }

  const [fund] = await db
    .select()
    .from(funds)
    .where(eq(funds.id, doc.fundId))
    .limit(1);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId));

  const total = countRow?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * perPage;

  const versions = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(asc(documentVersions.createdAt))
    .limit(perPage)
    .offset(offset);

  return (
    <div className={styles.shell}>
      <main className={styles.inner}>
        <Link
          href={`/funds/${doc.fundId}/documents`}
          className={styles.back}
        >
          ← Documents
        </Link>
        <h1 className={styles.title}>{doc.title}</h1>
        <p className={styles.subtitle}>
          <span className={styles.slug}>{doc.slug}</span>
          {fund ? (
            <>
              {" "}
              <span className={styles.subtitleSep}>·</span>{" "}
              <span>{fund.name}</span>
              {fund.ticker ? (
                <span className={styles.ticker} style={{ marginLeft: "0.35rem" }}>
                  {fund.ticker}
                </span>
              ) : null}
            </>
          ) : null}
        </p>

        <div id="version-history" className={styles.sectionLabel}>
          Version history
        </div>
        {total === 0 ? (
          <div className={styles.empty}>No versions yet.</div>
        ) : (
          <>
            <DocumentPagination
              basePath={`/documents/${documentId}`}
              page={page}
              perPage={perPage}
              total={total}
              defaultPerPage={VERSIONS_DEFAULT_PAGE_SIZE}
              navAriaLabel="Version history pages"
            />
            <div className={styles.versionStack}>
              {versions.map((v) => (
                <article key={v.id} className={styles.versionCard}>
                  <div className={styles.versionHead}>
                    <span
                      className={styles.cardTitle}
                      style={{ marginBottom: 0 }}
                    >
                      {v.version}
                    </span>
                    <span className={badgeForStatus(v.status)}>
                      {v.status.replaceAll("_", " ")}
                    </span>
                    <span className={styles.versionId}>
                      {formatWhen(v.createdAt)}
                    </span>
                  </div>
                  {v.parentVersionId ? (
                    <div className={styles.parentMeta}>
                      Parent version: {v.parentVersionId}
                    </div>
                  ) : null}
                  <pre className={styles.contentBlock}>{v.content}</pre>
                </article>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
