import Link from "next/link";
import { db, documents, funds } from "@repo/db";
import { asc, eq, sql } from "drizzle-orm";
import {
  DocumentPagination,
  parseDocumentPagination,
} from "../components/document-pagination";
import styles from "../disclosure.module.css";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ page?: string; perPage?: string }>;
};

export default async function DocumentsIndexPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const { page: requestedPage, perPage } = parseDocumentPagination(sp);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(documents);

  const total = countRow?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * perPage;

  const rows = await db
    .select({
      document: documents,
      fundName: funds.name,
      fundTicker: funds.ticker,
    })
    .from(documents)
    .innerJoin(funds, eq(documents.fundId, funds.id))
    .orderBy(asc(funds.name), asc(documents.slug))
    .limit(perPage)
    .offset(offset);

  return (
    <div className={styles.shell}>
      <main className={styles.inner}>
        <Link href="/funds" className={styles.back}>
          ← Funds
        </Link>
        <h1 className={styles.display}>Documents</h1>
        <p className={styles.subtitleTight}>All documents across funds.</p>
        <DocumentPagination
          basePath="/documents"
          page={page}
          perPage={perPage}
          total={total}
          zeroStateMessage="No documents"
          navAriaLabel="Document list pages"
        />
        {rows.length === 0 ? (
          <div className={styles.empty}>
            No documents yet. Run <code>npm run db:seed</code> in{" "}
            <code>packages/db</code>.
          </div>
        ) : (
          <div className={styles.cardList}>
            {rows.map(({ document: d, fundName, fundTicker }) => (
              <Link
                key={d.id}
                href={`/documents/${d.id}`}
                className={styles.card}
              >
                <div className={styles.slugRow}>
                  <span className={styles.slug}>{d.slug}</span>
                </div>
                <div className={styles.cardTitle}>{d.title}</div>
                <div className={styles.cardMeta}>
                  {fundName}
                  {fundTicker ? ` · ${fundTicker}` : ""}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
