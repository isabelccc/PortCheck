import { diffLines } from "diff";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  db,
  documentVersions,
  documents,
  funds,
  ixbrlFactDrafts,
  versionChecklistItems,
  workflowRuns,
} from "@repo/db";
import { asc, eq } from "drizzle-orm";

type RedlineBaselineMode = "parent" | "previous" | "none";

async function resolveRedlineBaseline(
  documentIdForSiblings: string,
  versionId: string,
  explicitParentId: string | null,
): Promise<{
  baselineContent: string;
  mode: RedlineBaselineMode;
  baselineVersionLabel: string | null;
}> {
  if (explicitParentId) {
    const [p] = await db
      .select({
        content: documentVersions.content,
        version: documentVersions.version,
      })
      .from(documentVersions)
      .where(eq(documentVersions.id, explicitParentId))
      .limit(1);
    return {
      baselineContent: p?.content ?? "",
      mode: p ? "parent" : "none",
      baselineVersionLabel: p?.version ?? null,
    };
  }

  const siblings = await db
    .select({
      id: documentVersions.id,
      content: documentVersions.content,
      version: documentVersions.version,
      createdAt: documentVersions.createdAt,
    })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentIdForSiblings))
    .orderBy(asc(documentVersions.createdAt), asc(documentVersions.version));

  const idx = siblings.findIndex((v) => v.id === versionId);
  if (idx <= 0) {
    return { baselineContent: "", mode: "none", baselineVersionLabel: null };
  }
  const prev = siblings[idx - 1]!;
  return {
    baselineContent: prev.content,
    mode: "previous",
    baselineVersionLabel: prev.version,
  };
}
import { getDemoRole } from "../../../../../lib/demo-role-server";
import { getVersionApprovalReadiness } from "../../../../../lib/version-approval-readiness";
import styles from "../../../../disclosure.module.css";
import { VersionWorkspaceClient } from "./version-workspace-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ documentId: string; versionId: string }>;
};

export default async function VersionWorkspacePage({ params }: PageProps) {
  const { documentId, versionId } = await params;
  const demoRole = await getDemoRole();

  const [row] = await db
    .select({
      version: documentVersions,
      document: documents,
    })
    .from(documentVersions)
    .innerJoin(documents, eq(documents.id, documentVersions.documentId))
    .where(eq(documentVersions.id, versionId))
    .limit(1);

  if (!row || row.document.id !== documentId) {
    notFound();
  }

  const [fund] = await db
    .select()
    .from(funds)
    .where(eq(funds.id, row.document.fundId))
    .limit(1);

  const { baselineContent, mode: redlineBaselineMode, baselineVersionLabel } =
    await resolveRedlineBaseline(
      row.document.id,
      versionId,
      row.version.parentVersionId,
    );

  const redlineParts = diffLines(baselineContent, row.version.content, {
    newlineIsToken: true,
  }).map((p) => ({
    type: p.added ? ("add" as const) : p.removed ? ("remove" as const) : ("same" as const),
    value: p.value,
  }));

  const checklistRows = await db
    .select()
    .from(versionChecklistItems)
    .where(eq(versionChecklistItems.documentVersionId, versionId))
    .orderBy(asc(versionChecklistItems.sortOrder));

  const factRows = await db
    .select()
    .from(ixbrlFactDrafts)
    .where(eq(ixbrlFactDrafts.documentVersionId, versionId))
    .orderBy(asc(ixbrlFactDrafts.createdAt));

  const [run] = await db
    .select({ id: workflowRuns.id })
    .from(workflowRuns)
    .where(eq(workflowRuns.documentVersionId, versionId))
    .limit(1);

  const approvalReadiness = await getVersionApprovalReadiness(versionId);

  return (
    <div className={styles.shell}>
      <main className={styles.inner}>
        <Link href={`/documents/${documentId}`} className={styles.back}>
          ← Document versions
        </Link>
        <h1 className={styles.title}>Filing QA workspace</h1>
        <p className={styles.subtitle}>
          {row.document.title}
          {fund ? (
            <>
              <span className={styles.subtitleSep}>·</span> {fund.name}
              {fund.ticker ? (
                <span className={styles.ticker} style={{ marginLeft: "0.35rem" }}>
                  {fund.ticker}
                </span>
              ) : null}
            </>
          ) : null}
          <span className={styles.subtitleSep}>·</span> {row.version.version}
        </p>

        <VersionWorkspaceClient
          documentId={documentId}
          versionId={versionId}
          docTitle={row.document.title}
          versionLabel={row.version.version}
          status={row.version.status}
          initialContent={row.version.content}
          demoRole={demoRole}
          runId={run?.id ?? null}
          checklist={checklistRows.map((c) => ({
            id: c.id,
            code: c.code,
            label: c.label,
            category: c.category,
            required: c.required,
            completedAt: c.completedAt
              ? new Intl.DateTimeFormat("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(c.completedAt)
              : null,
            completedBy: c.completedBy,
            evidenceNote: c.evidenceNote,
          }))}
          facts={factRows.map((f) => ({
            id: f.id,
            conceptQname: f.conceptQname,
            contextRef: f.contextRef,
            factValue: f.factValue,
            validatedOk: f.validatedOk,
            validationMessage: f.validationMessage,
          }))}
          redline={redlineParts}
          redlineBaselineMode={redlineBaselineMode}
          redlineBaselineVersionLabel={baselineVersionLabel}
          approvalReadiness={approvalReadiness}
        />
      </main>
    </div>
  );
}
