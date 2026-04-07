import Link from "next/link";
import { compliancePolicies, db } from "@repo/db";
import { asc } from "drizzle-orm";
import { submitDemoRoleForm } from "../actions/compliance-workspace";
import { getDemoRole } from "../../lib/roles/demo-role-server";
import styles from "../disclosure.module.css";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  const role = await getDemoRole();
  const policies = await db
    .select()
    .from(compliancePolicies)
    .orderBy(asc(compliancePolicies.code));

  return (
    <div className={styles.shell}>
      <main className={styles.inner}>
        <Link href="/" className={styles.back}>
          ← Home
        </Link>
        <h1 className={styles.display}>Compliance</h1>
        <p className={styles.subtitleTight}>
          Control owners: set a <strong>demo role</strong> to simulate who may view, prepare
          reviews, or sign off. Policies below anchor the narrative; use{" "}
          <Link href="/reviews" className={styles.inlineLink}>
            Workflow &amp; review
          </Link>{" "}
          for the live queue and DAG runs.
        </p>

        <section className={styles.complianceOpsSection} aria-labelledby="ops-heading">
          <h2 id="ops-heading" className={styles.complianceOpsHeading}>
            Shortcuts
          </h2>
          <nav className={styles.complianceOpsGrid} aria-label="Shortcuts">
            <Link href="/reviews" className={styles.complianceOpsCard}>
              <p className={styles.complianceOpsCardKicker}>Queue + DAG</p>
              <p className={styles.complianceOpsCardTitle}>Workflow &amp; review</p>
              <p className={styles.complianceOpsCardDesc}>
                Review queue and workflow runs in one place.
              </p>
            </Link>
            <Link href="/audit" className={styles.complianceOpsCard}>
              <p className={styles.complianceOpsCardKicker}>Log</p>
              <p className={styles.complianceOpsCardTitle}>Audit trail</p>
              <p className={styles.complianceOpsCardDesc}>
                Search and filter audit events.
              </p>
            </Link>
          </nav>
        </section>

        <form action={submitDemoRoleForm} className={styles.complianceRoleForm}>
          <label htmlFor="demo-role" style={{ fontWeight: 600 }}>
            Demo role
          </label>
          <select
            id="demo-role"
            name="role"
            defaultValue={role}
            className={styles.workflowEvidenceTextarea}
            style={{ maxWidth: "12rem", minHeight: "unset", padding: "0.4rem" }}
          >
            <option value="viewer">Viewer</option>
            <option value="reviewer">Reviewer</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className={styles.workflowAutoRunBtn}>
            Save role
          </button>
          <span className={styles.workflowPanelHint} style={{ margin: 0 }}>
            Current: <strong>{role}</strong>
          </span>
        </form>

        <div className={styles.sectionLabel}>Policy library</div>
        {policies.length === 0 ? (
          <p className={styles.empty}>
            No policies — run <code>npm run db:migrate</code> and{" "}
            <code>npm run db:seed</code> in <code>packages/db</code>.
          </p>
        ) : (
          <ul className={styles.policyList}>
            {policies.map((p) => (
              <li key={p.id} className={styles.policyCard}>
                <div className={styles.policyCode}>{p.code}</div>
                <h2 className={styles.cardTitle} style={{ margin: "0.35rem 0" }}>
                  {p.title}
                </h2>
                <p className={styles.workflowPanelHint} style={{ margin: 0 }}>
                  <strong>{p.controlCategory.replaceAll("_", " ")}</strong>
                </p>
                <p
                  className={styles.workflowPanelHint}
                  style={{ marginTop: "0.65rem", marginBottom: 0, maxWidth: "none" }}
                >
                  {p.summary}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
