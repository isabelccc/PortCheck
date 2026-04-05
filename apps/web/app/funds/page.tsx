import Link from "next/link";
import { db, companies, funds } from "@repo/db";
import { asc, eq, sql } from "drizzle-orm";
import {
  DocumentPagination,
  parseListPagination,
} from "../components/document-pagination";
import styles from "../disclosure.module.css";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ page?: string; perPage?: string }>;
};

export default async function FundsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const { page: requestedPage, perPage } = parseListPagination(sp);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(funds);

  const total = countRow?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * perPage;

  const rows = await db
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

  return (
    <div className={styles.shell}>
      <main className={styles.inner}>
        <Link href="/" className={styles.back}>
          ← Home
        </Link>
        <h1 className={styles.display}>Funds</h1>
        <p className={styles.subtitleTight}>Open a fund to see its documents.</p>
        <DocumentPagination
          basePath="/funds"
          page={page}
          perPage={perPage}
          total={total}
          zeroStateMessage="No funds"
          navAriaLabel="Fund list pages"
        />
        {rows.length === 0 ? (
          <div className={styles.empty}>
            No funds yet. Run <code>npm run db:seed</code> in{" "}
            <code>packages/db</code> or insert rows manually.
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
                  <p
                    className={styles.subtitle}
                    style={{ marginTop: "0.35rem", marginBottom: 0 }}
                  >
                    {f.companyName}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
