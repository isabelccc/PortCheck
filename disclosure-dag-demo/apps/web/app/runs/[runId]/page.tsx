import Link from "next/link";
import { notFound } from "next/navigation";
import {
  db,
  documentVersions,
  documents,
  funds,
  workflowEdges,
  workflowNodes,
  workflowRuns,
  workflowTemplates,
  stepExecutions,
} from "@repo/db";
import { asc, eq } from "drizzle-orm";
import { countOpenRequiredChecklist } from "../../../lib/version-approval-readiness";
import type { Edge, Node } from "@xyflow/react";
import { getDemoRole } from "../../../lib/demo-role-server";
import { WorkflowRunClient } from "./workflow-run-client";
import type { WorkflowStepData } from "../../components/workflow-step-node";
import styles from "../../disclosure.module.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ runId: string }>;
};

export default async function WorkflowRunPage({ params }: PageProps) {
  const { runId } = await params;
  const demoRole = await getDemoRole();

  const [row] = await db
    .select({
      run: workflowRuns,
      template: workflowTemplates,
      version: documentVersions,
      document: documents,
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
    .where(eq(workflowRuns.id, runId))
    .limit(1);

  if (!row) {
    notFound();
  }

  const [fund] = await db
    .select()
    .from(funds)
    .where(eq(funds.id, row.document.fundId))
    .limit(1);

  const wfNodes = await db
    .select()
    .from(workflowNodes)
    .where(eq(workflowNodes.templateId, row.run.templateId))
    .orderBy(asc(workflowNodes.nodeKey));

  const wfEdges = await db
    .select()
    .from(workflowEdges)
    .where(eq(workflowEdges.templateId, row.run.templateId));

  const steps = await db
    .select()
    .from(stepExecutions)
    .where(eq(stepExecutions.runId, runId))
    .orderBy(asc(stepExecutions.createdAt));

  const openRequiredChecklist = await countOpenRequiredChecklist(
    row.version.id,
  );

  const statusByNodeId = new Map(steps.map((s) => [s.nodeId, s.status]));

  const baseNodes: Node<WorkflowStepData>[] = wfNodes.map((n) => ({
    id: n.id,
    type: "workflowStep",
    position: { x: n.positionX ?? 0, y: n.positionY ?? 0 },
    data: {
      label: n.label,
      status: statusByNodeId.get(n.id) ?? "pending",
      nodeKey: n.nodeKey,
      nodeId: n.id,
      nodeType: n.nodeType,
    },
  }));

  const baseEdges: Edge[] = wfEdges.map((e) => ({
    id: e.id,
    source: e.fromNodeId,
    target: e.toNodeId,
  }));

  return (
    <div className={styles.shell}>
      <main className={styles.inner}>
        <Link href="/runs" className={styles.back}>
          ← Runs
        </Link>
        <h1 className={styles.title}>Workflow run</h1>
        <p className={styles.contextLine}>
          <strong>{row.template.name}</strong>
          <span className={styles.subtitleSep}>·</span> Run{" "}
          <span className={styles.slug} style={{ fontSize: "0.75rem" }}>
            {runId.slice(0, 8)}…
          </span>
        </p>
        <p className={styles.subtitle} style={{ marginTop: "-0.5rem" }}>
          <Link
            href={`/documents/${row.document.id}`}
            className={styles.inlineLink}
          >
            {row.document.title}
          </Link>
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
          <span className={styles.subtitleSep}>·</span> version{" "}
          {row.version.version}
          <span className={styles.subtitleSep}>·</span>{" "}
          <Link
            href={`/documents/${row.document.id}/versions/${row.version.id}`}
            className={styles.inlineLink}
          >
            Filing QA &amp; redlines workspace
          </Link>
        </p>

        <WorkflowRunClient
          runId={runId}
          baseNodes={baseNodes}
          baseEdges={baseEdges}
          demoRole={demoRole}
          linkedVersionStatus={row.version.status}
          openRequiredChecklist={openRequiredChecklist}
          steps={steps.map((s) => ({
            id: s.id,
            nodeId: s.nodeId,
            status: s.status,
            actorId: s.actorId,
            comment: s.comment,
          }))}
        />

        <p className={styles.workflowFooter}>
          <Link
            href={`/audit?runId=${encodeURIComponent(runId)}`}
            className={styles.inlineLink}
          >
            Filter audit log for this run →
          </Link>
        </p>
      </main>
    </div>
  );
}
