import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.kicker}>Disclosure control demo</p>
        <h1 className={styles.headline}>
          Fund disclosures,
          <br />
          versioned in Postgres
        </h1>
        <p className={styles.lede}>
          Walk through mock ETFs → documents → revision history. Built as a
          portfolio slice for issuer-style disclosure ops—not production filing
          software.
        </p>

        <div className={styles.ctas}>
          <Link className={styles.primary} href="/funds">
            View funds &amp; documents
          </Link>
          <Link className={styles.secondary} href="/documents">
            Documents hub
          </Link>
        </div>

        <ul className={styles.bullets} aria-label="What ships today">
          <li>
            <strong>Data model</strong> — funds, documents, and{" "}
            <code>document_versions</code> with optional parent lineage.
          </li>
          <li>
            <strong>Stack</strong> — Next.js App Router, Turborepo, Drizzle ORM,
            shared <code>@repo/db</code> workspace package.
          </li>
          <li>
            <strong>Next</strong> — DAG-shaped review workflow, append-only
            audit trail, and richer QA views.
          </li>
        </ul>

        <div className={styles.chips} aria-label="Tech stack">
          <span className={styles.chip}>TypeScript</span>
          <span className={styles.chip}>Next.js 16</span>
          <span className={styles.chip}>Drizzle</span>
          <span className={styles.chip}>Postgres</span>
          <span className={styles.chip}>Turborepo</span>
        </div>

        <p className={styles.disclaimer}>
          Prototype for learning and interviews. Does not submit to EDGAR or
          replace legal/compliance review.
        </p>

        <section className={styles.howto} id="run" aria-labelledby="run-heading">
          <h2 id="run-heading" className={styles.howtoTitle}>
            Run locally
          </h2>
          <ol className={styles.howtoSteps}>
            <li>
              Set <code>DATABASE_URL</code> in the monorepo root{" "}
              <code>.env</code>.
            </li>
            <li>
              <code>cd packages/db</code> → <code>npx drizzle-kit migrate</code>{" "}
              → <code>npm run db:seed</code>
            </li>
            <li>
              From repo root: <code>npm run dev:web</code> → open{" "}
              <code>localhost:3000</code>
            </li>
          </ol>
        </section>
      </main>

      <footer className={styles.footer}>
        <Link href="/funds">Funds</Link>
        <span className={styles.footerSep}>·</span>
        <Link href="/documents">Documents</Link>
        <span className={styles.footerSep}>·</span>
        <span className={styles.footerMeta}>disclosure-dag-demo</span>
      </footer>
    </div>
  );
}
