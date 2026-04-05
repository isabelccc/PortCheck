import Link from "next/link";
import {
  db,
  documentVersions,
  documents,
  funds,
  workflowRuns,
  workflowTemplates,
} from "@repo/db";
import { desc, eq } from "drizzle-orm";
import styles from "../disclosure.module.css";

export const dynamic = "force-dynamic";

export default async function RunsIndexPage() {
  const rows = await db
    .select({
      run: workflowRuns,
      template: workflowTemplates,
      version: documentVersions,
      document: documents,
      fund: funds,
    })
    .from(workflowRuns)
    .innerJoin(
      workflowTemplates,
      eq(workflowRuns.templateId, workflowTemplates.id),
    )
    .innerJoin(
      documentVersions,
      eq(workflowRuns.documentVersionId, documentVersions.id),
    )
    .innerJoin(documents, eq(documentVersions.documentId, documents.id))
    .leftJoin(funds, eq(documents.fundId, funds.id))
    .orderBy(desc(workflowRuns.createdAt))
    .limit(100);

  return (
    <div className={styles.shell}>
      <main className={styles.inner}>
        <Link href="/compliance" className={styles.back}>
          ← Compliance
        </Link>
        <h1 className={styles.display}>Workflow runs</h1>
        <p className={styles.subtitle}>
          Each row opens the DAG, progress, and step controls for that run.
        </p>
        {rows.length === 0 ? (
          <div className={styles.empty}>
            No runs yet. Seed the database (<code>packages/db</code>) to create
            the demo run.
          </div>
        ) : (
          <div className={styles.cardList}>
            {rows.map(({ run, template, version, document, fund }) => (
              <Link
                key={run.id}
                href={`/runs/${run.id}`}
                className={styles.card}
              >
                <div className={styles.cardTitle}>{template.name}</div>
                <div className={styles.cardMeta}>
                  {document.title} · v{version.version}
                  {fund?.name ? ` · ${fund.name}` : ""}
                  {fund?.ticker ? ` (${fund.ticker})` : ""}
                </div>
                <div className={styles.cardMeta} style={{ marginTop: "0.35rem" }}>
                  status: {run.status ?? "—"} ·{" "}
                  {new Date(run.createdAt).toLocaleString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
