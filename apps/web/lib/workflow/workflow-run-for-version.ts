import { randomUUID } from "node:crypto";
import {
  db,
  stepExecutions,
  workflowEdges,
  workflowNodes,
  workflowRuns,
  workflowTemplates,
} from "@repo/db";
import { asc, eq } from "drizzle-orm";
import { predecessorsFromEdges } from "./workflow-rules-engine";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Remove all runs (and steps) tied to a document version — e.g. new review cycle after reject. */
export async function purgeWorkflowRunsForVersion(
  tx: Tx,
  versionId: string,
): Promise<void> {
  const oldRuns = await tx
    .select({ id: workflowRuns.id })
    .from(workflowRuns)
    .where(eq(workflowRuns.documentVersionId, versionId));
  for (const r of oldRuns) {
    await tx.delete(stepExecutions).where(eq(stepExecutions.runId, r.id));
  }
  if (oldRuns.length > 0) {
    await tx.delete(workflowRuns).where(eq(workflowRuns.documentVersionId, versionId));
  }
}

export type InsertWorkflowRunResult =
  | { ok: true; runId: string; templateId: string; templateName: string }
  | { ok: false; error: string };

/**
 * Inserts `workflow_runs` + one `step_executions` row per template node.
 * Nodes with no incoming edges: `start` / `draft_complete` → `completed` (draft gate cleared at submit);
 * other entry nodes → `running` as “ready”. All others → `pending`.
 */
export async function insertWorkflowRunWithSteps(
  tx: Tx,
  params: { versionId: string; actorId: string },
): Promise<InsertWorkflowRunResult> {
  const [tpl] = await tx
    .select({ id: workflowTemplates.id, name: workflowTemplates.name })
    .from(workflowTemplates)
    .orderBy(asc(workflowTemplates.name))
    .limit(1);
  if (!tpl) {
    return { ok: false, error: "No workflow template found — run packages/db seed." };
  }

  const nodes = await tx
    .select()
    .from(workflowNodes)
    .where(eq(workflowNodes.templateId, tpl.id));
  if (nodes.length === 0) {
    return { ok: false, error: "Workflow template has no nodes." };
  }

  const edges = await tx
    .select({
      fromNodeId: workflowEdges.fromNodeId,
      toNodeId: workflowEdges.toNodeId,
    })
    .from(workflowEdges)
    .where(eq(workflowEdges.templateId, tpl.id));

  const edgeLite = edges.map((e) => ({
    source: e.fromNodeId,
    target: e.toNodeId,
  }));
  const predMap = predecessorsFromEdges(edgeLite);
  const runId = randomUUID();

  await tx.insert(workflowRuns).values({
    id: runId,
    templateId: tpl.id,
    documentVersionId: params.versionId,
    status: "running",
  });

  for (const node of nodes) {
    const preds = predMap.get(node.id) ?? [];
    let status = "pending";
    let actorIdOut: string | null = null;
    let commentOut: string | null = null;

    if (preds.length === 0) {
      if (node.nodeType === "start" || node.nodeKey === "draft_complete") {
        status = "completed";
        actorIdOut = params.actorId;
        commentOut =
          "Automatic: filing entered review — draft / start gate satisfied.";
      } else {
        status = "running";
        actorIdOut = params.actorId;
        commentOut = "Ready — no upstream workflow dependencies (entry node).";
      }
    }

    await tx.insert(stepExecutions).values({
      id: randomUUID(),
      runId,
      nodeId: node.id,
      status,
      actorId: actorIdOut,
      comment: commentOut,
    });
  }

  return { ok: true, runId, templateId: tpl.id, templateName: tpl.name };
}
