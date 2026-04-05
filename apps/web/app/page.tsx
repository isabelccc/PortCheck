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
          <Link className={styles.secondary} href="/compliance">
            Compliance hub
          </Link>
          <Link className={styles.secondary} href="/reviews">
            Review queue
          </Link>
        </div>

        <section
          className={styles.projectFlow}
          aria-labelledby="project-flow-heading"
        >
          <p className={styles.projectFlowTitle}>End-to-end</p>
          <h2 id="project-flow-heading" className={styles.projectFlowHeadline}>
            How the demo runs
          </h2>
          <div className={styles.projectFlowTrack}>
            <Link href="/funds" className={styles.projectFlowCard}>
              <span className={styles.projectFlowNum}>01</span>
              <p className={styles.projectFlowStepTitle}>Funds &amp; documents</p>
              <p className={styles.projectFlowStepBlurb}>
                Pick a fund, open a document, browse version history.
              </p>
            </Link>
            <Link href="/documents" className={styles.projectFlowCard}>
              <span className={styles.projectFlowNum}>02</span>
              <p className={styles.projectFlowStepTitle}>Version workspace</p>
              <p className={styles.projectFlowStepBlurb}>
                Edit body, redlines, checklist, iXBRL stub, export — then submit for
                review.
              </p>
            </Link>
            <Link href="/runs" className={styles.projectFlowCard}>
              <span className={styles.projectFlowNum}>03</span>
              <p className={styles.projectFlowStepTitle}>Workflow DAG</p>
              <p className={styles.projectFlowStepBlurb}>
                Parallel steps on a template; rules engine + audit on each transition.
              </p>
            </Link>
            <Link href="/reviews" className={styles.projectFlowCard}>
              <span className={styles.projectFlowNum}>04</span>
              <p className={styles.projectFlowStepTitle}>Review &amp; sign-off</p>
              <p className={styles.projectFlowStepBlurb}>
                Queue for in-review versions; admin approval when gates clear.
              </p>
            </Link>
            <Link href="/audit" className={styles.projectFlowCard}>
              <span className={styles.projectFlowNum}>05</span>
              <p className={styles.projectFlowStepTitle}>Audit trail</p>
              <p className={styles.projectFlowStepBlurb}>
                Immutable log: search, filters, and text diffs for evidence.
              </p>
            </Link>
          </div>
        </section>

        <ul className={styles.bullets} aria-label="What ships today">
          <li>
            <strong>Data</strong> —{" "}
            <code>document_versions</code> with optional parent lineage; roles in a
            cookie.
          </li>
          <li>
            <strong>Workflow</strong> — React Flow +{" "}
            <code>step_executions</code>; append-only <code>audit_events</code>.
          </li>
          <li>
            <strong>QA workspace</strong> — redlines, checklist gates, demo iXBRL
            validation, HTML export stub (not EDGAR Live).
          </li>
          <li>
            <strong>Stack</strong> — Next.js 16, Turborepo, Drizzle, Postgres via{" "}
            <code>@repo/db</code>.
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
        <Link href="/compliance">Compliance</Link>
        <span className={styles.footerSep}>·</span>
        <span className={styles.footerMeta}>PortCheck</span>
      </footer>
    </div>
  );
}
