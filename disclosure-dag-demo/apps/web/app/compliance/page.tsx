import Link from "next/link";
import { compliancePolicies, db } from "@repo/db";
import { asc } from "drizzle-orm";
import { submitDemoRoleForm } from "../actions/compliance-workspace";
import { getDemoRole } from "../../lib/demo-role-server";
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
        <h1 className={styles.title}>Compliance &amp; controls</h1>
        <p className={styles.subtitle}>
          Demo role + policies. The main screens are the three tiles below.
        </p>

        <section className={styles.complianceOpsSection} aria-labelledby="ops-heading">
          <h2 id="ops-heading" className={styles.complianceOpsHeading}>
            Operational views
          </h2>
          <nav className={styles.complianceOpsGrid} aria-label="Operational views">
            <Link href="/runs" className={styles.complianceOpsCard}>
              <p className={styles.complianceOpsCardKicker}>DAG + steps</p>
              <p className={styles.complianceOpsCardTitle}>Workflow runs</p>
              <p className={styles.complianceOpsCardDesc}>
                React Flow DAG, step execution, final approval vs the linked version.
              </p>
            </Link>
            <Link href="/reviews" className={styles.complianceOpsCard}>
              <p className={styles.complianceOpsCardKicker}>In review</p>
              <p className={styles.complianceOpsCardTitle}>Review queue</p>
              <p className={styles.complianceOpsCardDesc}>
                Drafts and in-review versions with QA blockers and decisions.
              </p>
            </Link>
            <Link href="/audit" className={styles.complianceOpsCard}>
              <p className={styles.complianceOpsCardKicker}>Append-only</p>
              <p className={styles.complianceOpsCardTitle}>Audit trail</p>
              <p className={styles.complianceOpsCardDesc}>
                Search events, diffs, and evidence — nothing is deleted.
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
            <option value="viewer">viewer — read-only</option>
            <option value="reviewer">reviewer — checklist, workflow, export, reject</option>
            <option value="admin">admin — + formal document approve (sign-off)</option>
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
