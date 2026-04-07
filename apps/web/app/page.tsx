import Link from "next/link";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const missingDatabaseUrl = !process.env.DATABASE_URL?.trim();

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.kicker}>Operating model</p>
        <h1 className={styles.headline}>
          Disclosure
          <br />
          control
        </h1>
        <p className={styles.lede}>
          Govern the lifecycle of fund disclosure content: QA evidence, parallel approvals,
          and an append-only audit trail — with rules enforced on the server, not just in
          the UI.
        </p>

        <ul className={styles.businessOutcomes} aria-label="Business outcomes">
          <li>
            <strong>Controlled lifecycle</strong> — Draft, review, and formal approve with
            checklist and workflow gates.
          </li>
          <li>
            <strong>Segregation of duties (demo)</strong> — Viewer, reviewer, and admin
            roles; authority re-checked on every mutation.
          </li>
          <li>
            <strong>Defensible history</strong> — Searchable audit log with integrity
            chaining for tamper-evidence (prototype scope).
          </li>
        </ul>

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
          className={styles.flowSection}
          aria-labelledby="flow-chart-heading"
        >
          <h2 id="flow-chart-heading" className={styles.flowSectionTitle}>
            End-to-end control flow
          </h2>
          <p className={styles.flowSectionIntro}>
            Each step is something you can walk through with a stakeholder: where content
            lives, how readiness is proven, and how approvals and audit evidence are
            recorded. Highlighted steps are enforced on the server.
          </p>

          <ol className={styles.flowChart} aria-label="Disclosure control flow">
            <li className={styles.flowStep}>
              <span className={styles.flowStepNum} aria-hidden>
                1
              </span>
              <div className={styles.flowStepBody}>
                <div className={styles.flowStepTitleRow}>
                  <strong className={styles.flowStepTitle}>Model in Postgres</strong>
                  <span className={styles.flowTechTag}>Drizzle</span>
                </div>
                <p className={styles.flowStepDesc}>
                  Funds → documents → version rows with lineage (
                  <code>parent_version_id</code>).
                </p>
                <Link href="/funds" className={styles.flowStepLink}>
                  Open funds →
                </Link>
              </div>
            </li>

            <li className={styles.flowConnector} aria-hidden>
              <span className={styles.flowConnectorLine} />
            </li>

            <li className={styles.flowStep}>
              <span className={styles.flowStepNum} aria-hidden>
                2
              </span>
              <div className={styles.flowStepBody}>
                <div className={styles.flowStepTitleRow}>
                  <strong className={styles.flowStepTitle}>QA workspace</strong>
                  <span className={styles.flowTechTag}>RSC</span>
                  <span className={styles.flowTechTag}>App Router</span>
                </div>
                <p className={styles.flowStepDesc}>
                  Edit body, redline vs parent, checklist, demo iXBRL validation, EDGAR-style
                  HTML export stub.
                </p>
                <Link href="/funds" className={styles.flowStepLink}>
                  Browse funds →
                </Link>
              </div>
            </li>

            <li className={styles.flowConnector} aria-hidden>
              <span className={styles.flowConnectorLine} />
            </li>

            <li className={`${styles.flowStep} ${styles.flowStepHighlight}`}>
              <span className={styles.flowStepNum} aria-hidden>
                3
              </span>
              <div className={styles.flowStepBody}>
                <div className={styles.flowStepTitleRow}>
                  <strong className={styles.flowStepTitle}>Server-enforced gates</strong>
                  <span className={styles.flowTechTag}>Server Actions</span>
                </div>
                <p className={styles.flowStepDesc}>
                  Cannot submit for review until required checklist items close. Formal
                  approve requires workflow final step + closed QA.
                </p>
                <Link href="/compliance" className={styles.flowStepLink}>
                  Set role on Compliance →
                </Link>
              </div>
            </li>

            <li className={styles.flowConnector} aria-hidden>
              <span className={styles.flowConnectorLine} />
            </li>

            <li className={styles.flowStep}>
              <span className={styles.flowStepNum} aria-hidden>
                4
              </span>
              <div className={styles.flowStepBody}>
                <div className={styles.flowStepTitleRow}>
                  <strong className={styles.flowStepTitle}>Parallel DAG workflow</strong>
                  <span className={styles.flowTechTag}>React Flow</span>
                </div>
                <p className={styles.flowStepDesc}>
                  Template nodes/edges, <code>step_executions</code>, shared rules engine in
                  TypeScript; merged with review queue in one screen.
                </p>
                <Link href="/reviews" className={styles.flowStepLink}>
                  Workflow &amp; review →
                </Link>
              </div>
            </li>

            <li className={styles.flowConnector} aria-hidden>
              <span className={styles.flowConnectorLine} />
            </li>

            <li className={styles.flowStep}>
              <span className={styles.flowStepNum} aria-hidden>
                5
              </span>
              <div className={styles.flowStepBody}>
                <div className={styles.flowStepTitleRow}>
                  <strong className={styles.flowStepTitle}>Append-only audit</strong>
                  <span className={styles.flowTechTag}>SHA-256 chain</span>
                </div>
                <p className={styles.flowStepDesc}>
                  Every mutation can emit <code>audit_events</code> with chained record
                  hashes for tamper-evidence (demo scope).
                </p>
                <Link href="/audit" className={styles.flowStepLink}>
                  Audit log →
                </Link>
              </div>
            </li>
          </ol>

          <div className={styles.flowTechStrip} aria-label="Key technologies">
            <span className={styles.flowTechPill}>Next.js 16</span>
            <span className={styles.flowTechPill}>React 19</span>
            <span className={styles.flowTechPill}>TypeScript</span>
            <span className={styles.flowTechPill}>PostgreSQL</span>
            <span className={styles.flowTechPill}>Drizzle ORM</span>
            <span className={styles.flowTechPill}>Turborepo</span>
            <span className={styles.flowTechPill}>Server Actions</span>
            <span className={styles.flowTechPill}>React Flow</span>
            <span className={styles.flowTechPill}>iXBRL demo</span>
          </div>
        </section>

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
          Reference prototype — not a certified control or production filing system.
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
