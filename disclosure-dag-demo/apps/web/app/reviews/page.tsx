import Link from "next/link";
import { db, documentVersions, documents, funds, versionChecklistItems } from "@repo/db";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { getDemoRole } from "../../lib/demo-role-server";
import styles from "../disclosure.module.css";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const role = await getDemoRole();

  const versions = await db
    .select({
      v: documentVersions,
      d: documents,
      f: funds,
    })
    .from(documentVersions)
    .innerJoin(documents, eq(documents.id, documentVersions.documentId))
    .innerJoin(funds, eq(funds.id, documents.fundId))
    .where(
      or(
        eq(documentVersions.status, "in_review"),
        eq(documentVersions.status, "draft"),
      ),
    )
    .orderBy(desc(documentVersions.createdAt))
    .limit(50);

  const versionIds = versions.map((r) => r.v.id);
  const openByVersion = new Map<string, number>();

  if (versionIds.length > 0) {
    const openRows = await db
      .select({
        vid: versionChecklistItems.documentVersionId,
        n: sql<number>`count(*)::int`,
      })
      .from(versionChecklistItems)
      .where(
        and(
          inArray(versionChecklistItems.documentVersionId, versionIds),
          eq(versionChecklistItems.required, true),
          isNull(versionChecklistItems.completedAt),
        ),
      )
      .groupBy(versionChecklistItems.documentVersionId);

    for (const r of openRows) {
      openByVersion.set(r.vid, r.n);
    }
  }

  return (
    <div className={styles.shell}>
      <main className={styles.inner}>
        <Link href="/compliance" className={styles.back}>
          ← Compliance
        </Link>
        <h1 className={styles.title}>Review queue</h1>
        <p className={styles.subtitle}>
          Document versions in <strong>draft</strong> or{" "}
          <strong>in_review</strong> (demo). Open required checklist items are
          counted per version. Aligns with a simple SEC-style &ldquo;work in
          progress&rdquo; queue — not a production filing calendar.
        </p>
        <p className={styles.workflowPanelHint}>
          Your role: <strong>{role}</strong> · set on{" "}
          <Link href="/compliance" className={styles.inlineLink}>
            Compliance
          </Link>
        </p>

        {versions.length === 0 ? (
          <p className={styles.empty}>No versions in draft or in_review.</p>
        ) : (
          <table className={styles.reviewQueueTable}>
            <thead>
              <tr>
                <th>Document</th>
                <th>Version</th>
                <th>Status</th>
                <th>Fund</th>
                <th>Open required QA</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {versions.map(({ v, d, f }) => (
                <tr key={v.id}>
                  <td>{d.title}</td>
                  <td>{v.version}</td>
                  <td>{v.status.replaceAll("_", " ")}</td>
                  <td>
                    {f.name}
                    {f.ticker ? ` (${f.ticker})` : ""}
                  </td>
                  <td>{openByVersion.get(v.id) ?? 0}</td>
                  <td>
                    <Link
                      href={`/documents/${d.id}/versions/${v.id}`}
                      className={styles.inlineLink}
                    >
                      QA workspace
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
