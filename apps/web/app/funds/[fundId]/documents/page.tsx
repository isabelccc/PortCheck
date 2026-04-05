import Link from "next/link";
import { notFound } from "next/navigation";
import { db, companies, documents, funds } from "@repo/db";
import { asc, eq, sql } from "drizzle-orm";
import {
  DocumentPagination,
  parseDocumentPagination,
} from "../../../components/document-pagination";
import styles from "../../../disclosure.module.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ fundId: string }>;
  searchParams: Promise<{ page?: string; perPage?: string }>;
};

export default async function FundDocumentsPage({
  params,
  searchParams,
}: PageProps) {
  const { fundId } = await params;
  const sp = await searchParams;
  const { page: requestedPage, perPage } = parseDocumentPagination(sp);

  const [row] = await db
    .select({
      fund: funds,
      companyName: companies.name,
    })
    .from(funds)
    .leftJoin(companies, eq(funds.companyId, companies.id))
    .where(eq(funds.id, fundId))
    .limit(1);

  const fund = row?.fund;

  if (!fund) {
    notFound();
  }

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(documents)
    .where(eq(documents.fundId, fundId));

  const total = countRow?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * perPage;

  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.fundId, fundId))
    .orderBy(asc(documents.createdAt), asc(documents.slug))
    .limit(perPage)
    .offset(offset);

  return (
    <div className={styles.shell}>
      <main className={styles.inner}>
        <Link href="/funds" className={styles.back}>
          ← Funds
        </Link>
        <h1 className={styles.title}>Documents</h1>
        <p className={styles.contextLine}>
          <strong>{fund.name}</strong>
          {fund.ticker ? (
            <span className={styles.ticker} style={{ marginLeft: "0.5rem" }}>
              {fund.ticker}
            </span>
          ) : null}
          {row.companyName ? (
            <>
              <span className={styles.subtitleSep}>·</span> {row.companyName}
            </>
          ) : null}
        </p>
        <DocumentPagination
          basePath={`/funds/${fundId}/documents`}
          page={page}
          perPage={perPage}
          total={total}
          zeroStateMessage="No documents"
          navAriaLabel="Document list pages"
        />
        {rows.length === 0 ? (
          <div className={styles.empty}>No documents for this fund yet.</div>
        ) : (
          <div className={styles.cardList}>
            {rows.map((d) => (
              <Link
                key={d.id}
                href={`/documents/${d.id}`}
                className={styles.card}
              >
                <div className={styles.cardTitle}>{d.title}</div>
                <p className={styles.cardMetaLine}>
                  <span className={styles.cardMetaSlug}>{d.slug}</span>
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
