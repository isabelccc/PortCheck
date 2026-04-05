import Link from "next/link";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const missingDatabaseUrl = !process.env.DATABASE_URL?.trim();

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.kicker}>Demo</p>
        <h1 className={styles.headline}>
          Disclosure
          <br />
          workflow
        </h1>
        <p className={styles.lede}>
          Versioned documents, review queue, and DAG workflow — backed by Postgres.
        </p>

        {missingDatabaseUrl ? (
          <p className={styles.deployWarn} role="status">
            Set <code>DATABASE_URL</code> for this environment (e.g. in Vercel env vars),
            then redeploy. Run <code>packages/db</code> migrate and seed against the same
            database.
          </p>
        ) : null}

        <div className={styles.ctas}>
          <Link className={styles.primary} href="/funds">
            Funds
          </Link>
          <Link className={styles.secondary} href="/reviews">
            Workflow &amp; review
          </Link>
          <Link className={styles.secondary} href="/compliance">
            Compliance
          </Link>
        </div>

        <section
          className={styles.projectFlow}
          aria-labelledby="project-flow-heading"
        >
          <h2 id="project-flow-heading" className={styles.projectFlowHeadline}>
            Overview
          </h2>
          <div className={styles.projectFlowTrack}>
            <Link href="/funds" className={styles.projectFlowCard}>
              <span className={styles.projectFlowNum}>01</span>
              <p className={styles.projectFlowStepTitle}>Funds &amp; documents</p>
            </Link>
            <Link href="/documents" className={styles.projectFlowCard}>
              <span className={styles.projectFlowNum}>02</span>
              <p className={styles.projectFlowStepTitle}>Documents</p>
            </Link>
            <Link href="/reviews" className={styles.projectFlowCard}>
              <span className={styles.projectFlowNum}>03</span>
              <p className={styles.projectFlowStepTitle}>Workflow &amp; review</p>
            </Link>
            <Link href="/audit" className={styles.projectFlowCard}>
              <span className={styles.projectFlowNum}>04</span>
              <p className={styles.projectFlowStepTitle}>Audit</p>
            </Link>
          </div>
        </section>

        <p className={styles.disclaimer}>
          Prototype only — not for production filing.
        </p>
      </main>

      <footer className={styles.footer}>
        <Link href="/funds">Funds</Link>
        <span className={styles.footerSep}>·</span>
        <Link href="/documents">Documents</Link>
        <span className={styles.footerSep}>·</span>
        <Link href="/reviews">Workflow</Link>
        <span className={styles.footerSep}>·</span>
        <Link href="/audit">Audit</Link>
        <span className={styles.footerSep}>·</span>
        <span className={styles.footerMeta}>PortCheck</span>
      </footer>
    </div>
  );
}
