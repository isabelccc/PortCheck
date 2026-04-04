import Link from "next/link";
import { db, companies, funds } from "@repo/db";
import { eq } from "drizzle-orm";
import styles from "../disclosure.module.css";

export const dynamic = "force-dynamic";

export default async function FundsPage() {
  const rows = await db
    .select({
      id: funds.id,
      name: funds.name,
      ticker: funds.ticker,
      companyName: companies.name,
    })
    .from(funds)
    .leftJoin(companies, eq(funds.companyId, companies.id));

  return (
    <div className={styles.shell}>
      <main className={styles.inner}>
        <Link href="/" className={styles.back}>
          ← Home
        </Link>
        <h1 className={styles.display}>Funds</h1>
        <p className={styles.subtitle}>
          Select a fund to view disclosure documents linked in Postgres.
        </p>
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
                  <p className={styles.subtitle} style={{ marginTop: "0.35rem" }}>
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
