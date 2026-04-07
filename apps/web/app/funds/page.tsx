import Link from "next/link";
import { db, companies, funds } from "@repo/db";
import { asc, eq, ilike, or, sql } from "drizzle-orm";
import { listSearchIlikePattern } from "../../lib/search/list-search";
import {
  DEFAULT_DOCUMENT_PAGE_SIZE,
  DocumentPagination,
  parseListPagination,
} from "../components/document-pagination";
import styles from "../disclosure.module.css";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ page?: string; perPage?: string; q?: string }>;
};

export default async function FundsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = sp.q?.trim() ? sp.q.trim() : "";
  const { page: requestedPage, perPage } = parseListPagination(sp);
  const pat = listSearchIlikePattern(q);
  const searchWhere = pat
    ? or(
        ilike(funds.name, pat),
        ilike(funds.ticker, pat),
        ilike(companies.name, pat),
      )
    : undefined;

  const countBase = db
    .select({ n: sql<number>`count(*)::int` })
    .from(funds)
    .leftJoin(companies, eq(funds.companyId, companies.id));
  const [countRow] = await (searchWhere
    ? countBase.where(searchWhere)
    : countBase);

  const total = countRow?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * perPage;

  const rowsBase = db
    .select({
      id: funds.id,
      name: funds.name,
      ticker: funds.ticker,
      companyName: companies.name,
    })
    .from(funds)
    .leftJoin(companies, eq(funds.companyId, companies.id))
    .orderBy(asc(funds.name), asc(funds.ticker))
    .limit(perPage)
    .offset(offset);
  const rows = await (searchWhere ? rowsBase.where(searchWhere) : rowsBase);

  const extraQuery: Record<string, string> = {};
  if (q) extraQuery.q = q;
  const hasSearch = q.length > 0;

  return (
    <div className={styles.shell}>
      <main className={styles.inner}>
        <Link href="/" className={styles.back}>
          ← Home
        </Link>
        <h1 className={styles.display}>Funds</h1>
        <p className={styles.subtitleTight}>Open a fund to see its documents.</p>

        <form
          className={styles.auditFilters}
          method="get"
          action="/funds"
          role="search"
        >
          <label className={styles.auditSearchWrap}>
            <span className={styles.auditSearchLabel}>Search</span>
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Fund name, ticker, company…"
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
            <Link href="/funds" className={styles.auditClear}>
              Clear
            </Link>
          </div>
        </form>

        <DocumentPagination
          basePath="/funds"
          page={page}
          perPage={perPage}
          total={total}
          extraQuery={Object.keys(extraQuery).length ? extraQuery : undefined}
          zeroStateMessage={
            hasSearch ? "No funds match your search" : "No funds"
          }
          navAriaLabel="Fund list pages"
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
              <>No funds match &ldquo;{q}&rdquo;. Try different keywords.</>
            ) : (
              <>
                No funds yet. Run <code>npm run db:seed</code> in{" "}
                <code>packages/db</code> or insert rows manually.
              </>
            )}
          </div>
        ) : (
          <div className={styles.cardList}>
            {rows.map((f) => (
              <Link
                key={f.id}
                href={`/funds/${f.id}/documents`}
                className={styles.card}
              >
                <div className={styles.fundHeader}>
                  <span className={styles.cardTitle}>{f.name}</span>
                  {f.ticker ? (
                    <span className={styles.ticker}>{f.ticker}</span>
                  ) : null}
                </div>
                {f.companyName ? (
                  <p className={styles.cardSubline}>{f.companyName}</p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
