import Link from "next/link";
import { db, funds } from "@repo/db";
import styles from "../disclosure.module.css";

export const dynamic = "force-dynamic";

export default async function FundsPage() {
  const rows = await db.select().from(funds);

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
                <div className={styles.cardMeta}>{f.id}</div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
