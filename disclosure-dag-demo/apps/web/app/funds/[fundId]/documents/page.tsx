import Link from "next/link";
import { notFound } from "next/navigation";
import { db, companies, documents, funds } from "@repo/db";
import { eq } from "drizzle-orm";
import styles from "../../../disclosure.module.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ fundId: string }>;
};

export default async function FundDocumentsPage({ params }: PageProps) {
  const { fundId } = await params;

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

  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.fundId, fundId));

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
                <div className={styles.slugRow}>
                  <span className={styles.slug}>{d.slug}</span>
                </div>
                <div className={styles.cardTitle}>{d.title}</div>
              
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
