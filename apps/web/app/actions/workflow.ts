"use server";

import { revalidatePath } from "next/cache";
import {
  appendAuditEvent,
  db,
  documentVersions,
  stepExecutions,
  versionChecklistItems,
  workflowEdges,
  workflowNodes,
  workflowRuns,
} from "@repo/db";
import { and, count, eq, isNull } from "drizzle-orm";
import { validateWorkflowTransition } from "../../lib/workflow-rules-engine";
import type { WorkflowEdgeLite, WorkflowStepLite } from "../../lib/workflow-rules-engine";
import { canMutateWorkflow } from "../../lib/demo-role-constants";
import { getDemoRole } from "../../lib/demo-role-server";

const ALLOWED = new Set(["pending", "running", "completed", "blocked", "skipped"]);

export type UpdateStepResult = { ok: true } | { ok: false; error: string };

type StepRow = typeof stepExecutions.$inferSelect;

async function commitStepStatusChange(
  runId: string,
  row: Pick<StepRow, "id" | "nodeId" | "status">,
  nextStatus: string,
  actor: string,
  comment: string | null,
  automation?: string,
) {
  const previousStatus = row.status;
  await db
    .update(stepExecutions)
    .set({
      status: nextStatus,
      actorId: actor,
      comment: comment?.trim() || null,
    })
    .where(eq(stepExecutions.id, row.id));

  await appendAuditEvent({
    actorId: actor,
    action: "step_status_changed",
    entityType: "step_execution",
    entityId: row.id,
    payload: {
      runId,
      nodeId: row.nodeId,
      stepExecutionId: row.id,
      previousStatus,
      newStatus: nextStatus,
      comment: comment?.trim() || null,
      ...(automation ? { automation } : {}),
    },
  });
}

async function loadRunWorkflowContext(runId: string) {
  const [run] = await db
    .select({
      id: workflowRuns.id,
      templateId: workflowRuns.templateId,
    })
    .from(workflowRuns)
    .where(eq(workflowRuns.id, runId))
    .limit(1);
  if (!run) {
    return null;
  }

  const [wfEdgeRows, stepRows] = await Promise.all([
    db
      .select({
        fromNodeId: workflowEdges.fromNodeId,
        toNodeId: workflowEdges.toNodeId,
      })
      .from(workflowEdges)
      .where(eq(workflowEdges.templateId, run.templateId)),
    db.select().from(stepExecutions).where(eq(stepExecutions.runId, runId)),
  ]);

  const edges: WorkflowEdgeLite[] = wfEdgeRows.map((e) => ({
    source: e.fromNodeId,
    target: e.toNodeId,
  }));

  return { run, edges, stepRows };
}

function toStepLite(rows: StepRow[]): WorkflowStepLite[] {
  return rows.map((r) => ({ nodeId: r.nodeId, status: r.status }));
}

/**
 * Final workflow approval is wired to the Filing QA gate: version must be
 * `in_review` and every required checklist row must be complete.
 */
async function assertFinalApprovalQaGates(
  runId: string,
  nodeId: string,
  nextStatus: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (nextStatus !== "completed") {
    return { ok: true };
  }

  const [wfNode] = await db
    .select({ nodeKey: workflowNodes.nodeKey })
    .from(workflowNodes)
    .where(eq(workflowNodes.id, nodeId))
    .limit(1);
  if (wfNode?.nodeKey !== "final_approval") {
    return { ok: true };
  }

  const [run] = await db
    .select({ documentVersionId: workflowRuns.documentVersionId })
    .from(workflowRuns)
    .where(eq(workflowRuns.id, runId))
    .limit(1);
  if (!run) {
    return { ok: false, error: "Run not found." };
  }

  const [ver] = await db
    .select({ status: documentVersions.status })
    .from(documentVersions)
    .where(eq(documentVersions.id, run.documentVersionId))
    .limit(1);
  if (ver?.status !== "in_review") {
    return {
      ok: false,
      error:
        "Final approval is blocked: the document version must be in_review. Submit it from the Filing QA workspace after clearing QA gates.",
    };
  }

  const [openRow] = await db
    .select({ n: count() })
    .from(versionChecklistItems)
    .where(
      and(
        eq(versionChecklistItems.documentVersionId, run.documentVersionId),
        eq(versionChecklistItems.required, true),
        isNull(versionChecklistItems.completedAt),
      ),
    );
  const open = Number(openRow?.n ?? 0);
  if (open > 0) {
    return {
      ok: false,
      error: `Final approval is blocked: ${open} required QA checklist item(s) still open. Complete them in the Filing QA workspace.`,
    };
  }

  return { ok: true };
}

export async function updateStepStatus(
  runId: string,
  nodeId: string,
  nextStatus: string,
  actorId: string,
  comment: string | null,
): Promise<UpdateStepResult> {
  const role = await getDemoRole();
  if (!canMutateWorkflow(role)) {
    return {
      ok: false,
      error: "Workflow changes are disabled for the viewer role.",
    };
  }

  const actor = actorId.trim() || "anonymous@demo.local";
  if (!ALLOWED.has(nextStatus)) {
    return { ok: false, error: "Invalid status" };
  }

  const ctx = await loadRunWorkflowContext(runId);
  if (!ctx) {
    return { ok: false, error: "Run not found" };
  }

  const [row] = ctx.stepRows.filter((s) => s.nodeId === nodeId);
  if (!row) {
    return { ok: false, error: "Step execution not found for this run/node" };
  }

  const ruleCheck = validateWorkflowTransition({
    edges: ctx.edges,
    steps: toStepLite(ctx.stepRows),
    nodeId,
    nextStatus,
  });
  if (!ruleCheck.ok) {
    return { ok: false, error: ruleCheck.message };
  }

  const [wfNode] = await db
    .select({ nodeType: workflowNodes.nodeType })
    .from(workflowNodes)
    .where(eq(workflowNodes.id, nodeId))
    .limit(1);
  if (
    nextStatus === "completed" &&
    wfNode?.nodeType === "approval" &&
    !comment?.trim()
  ) {
    return {
      ok: false,
      error:
        "Approval completion requires an evidence note (comment) describing the attestation.",
    };
  }

  const gate = await assertFinalApprovalQaGates(runId, nodeId, nextStatus);
  if (!gate.ok) {
    return { ok: false, error: gate.error };
  }

  await commitStepStatusChange(runId, row, nextStatus, actor, comment);

  revalidatePath(`/runs/${runId}`);
  revalidatePath("/runs");
  revalidatePath("/reviews");
  revalidatePath("/audit");
  return { ok: true };
}
