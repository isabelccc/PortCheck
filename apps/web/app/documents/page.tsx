import Link from "next/link";
import { db, documents, funds } from "@repo/db";
import { asc, eq, ilike, or, sql } from "drizzle-orm";
import { listSearchIlikePattern } from "../../lib/search/list-search";
import {
  DEFAULT_DOCUMENT_PAGE_SIZE,
  DocumentPagination,
  parseDocumentPagination,
} from "../components/document-pagination";
import styles from "../disclosure.module.css";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ page?: string; perPage?: string; q?: string }>;
};

export default async function DocumentsIndexPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = sp.q?.trim() ? sp.q.trim() : "";
  const { page: requestedPage, perPage } = parseDocumentPagination(sp);
  const pat = listSearchIlikePattern(q);
  const searchWhere = pat
    ? or(
        ilike(documents.title, pat),
        ilike(documents.slug, pat),
        ilike(funds.name, pat),
        ilike(funds.ticker, pat),
      )
    : undefined;

  const countBase = db
    .select({ n: sql<number>`count(*)::int` })
    .from(documents)
    .innerJoin(funds, eq(documents.fundId, funds.id));
  const [countRow] = await (searchWhere
    ? countBase.where(searchWhere)
    : countBase);

  const total = countRow?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * perPage;

  const rowsBase = db
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
  const rows = await (searchWhere ? rowsBase.where(searchWhere) : rowsBase);

  const extraQuery: Record<string, string> = {};
  if (q) extraQuery.q = q;
  const hasSearch = q.length > 0;

  return (
    <div className={styles.shell}>
      <main className={styles.inner}>
        <Link href="/funds" className={styles.back}>
          ← Funds
        </Link>
        <h1 className={styles.display}>Documents</h1>
        <p className={styles.subtitleTight}>All documents across funds.</p>

        <form
          className={styles.auditFilters}
          method="get"
          action="/documents"
          role="search"
        >
          <label className={styles.auditSearchWrap}>
           
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Title, slug, fund name, ticker…"
              className={styles.auditInput}
              autoComplete="off"
              enterKeyHint="search"
            />
          </label>
          {perPage !== DEFAULT_DOCUMENT_PAGE_SIZE ? (
            <input type="hidden" name="perPage" value={perPage} />
          ) : null}
          <div className={styles.auditFilterActions}>
            <button type="submit" className={styles.auditSubmit}>
              Search
            </button>
            <Link href="/documents" className={styles.auditClear}>
              Clear
            </Link>
          </div>
        </form>

        <DocumentPagination
          basePath="/documents"
          page={page}
          perPage={perPage}
          total={total}
          extraQuery={Object.keys(extraQuery).length ? extraQuery : undefined}
          zeroStateMessage={
            hasSearch ? "No documents match your search" : "No documents"
          }
          navAriaLabel="Document list pages"
        />
        {hasSearch ? (
          <p className={styles.paginationMeta} style={{ marginTop: "-0.5rem" }}>
            Search filters the list; page links keep{" "}
            <code className={styles.auditCode}>q</code> in the URL.
          </p>
        ) : null}
        {rows.length === 0 ? (
          <div className={styles.empty}>
            {hasSearch ? (
              <>No documents match &ldquo;{q}&rdquo;. Try different keywords.</>
            ) : (
              <>
                No documents yet. Run <code>npm run db:seed</code> in{" "}
                <code>packages/db</code>.
              </>
            )}
          </div>
        ) : (
          <div className={styles.cardList}>
            {rows.map(({ document: d, fundName, fundTicker }) => (
              <Link
                key={d.id}
                href={`/documents/${d.id}`}
                className={styles.card}
              >
                <div className={styles.cardTitle}>{d.title}</div>
                <p className={styles.cardMetaLine}>
                  <span className={styles.cardMetaSlug}>{d.slug}</span>
                  {" · "}
                  {fundName}
                  {fundTicker ? ` · ${fundTicker}` : ""}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
