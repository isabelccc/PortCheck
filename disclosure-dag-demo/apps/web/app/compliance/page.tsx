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
          Demo policies codify how this sample app models{" "}
          <strong>change control</strong>, <strong>evidence</strong>, and{" "}
          <strong>review queues</strong>. Role cookie simulates permissioned
          workflows (not production IAM).
        </p>

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
            <option value="reviewer">reviewer — checklist, workflow, export</option>
            <option value="admin">admin — + edit version body</option>
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

        <p className={styles.workflowFooter}>
          <Link href="/reviews" className={styles.inlineLink}>
            Review queue →
          </Link>
          <span className={styles.subtitleSep}> · </span>
          <Link href="/audit" className={styles.inlineLink}>
            Audit trail →
          </Link>
        </p>
      </main>
    </div>
  );
}
