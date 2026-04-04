"use server";

import { revalidatePath } from "next/cache";
import {
  auditEvents,
  db,
  stepExecutions,
  workflowEdges,
  workflowNodes,
  workflowRuns,
} from "@repo/db";
import { eq, inArray } from "drizzle-orm";
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

  await db.insert(auditEvents).values({
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

  await commitStepStatusChange(runId, row, nextStatus, actor, comment);

  revalidatePath(`/runs/${runId}`);
  revalidatePath("/runs");
  revalidatePath("/audit");
  return { ok: true };
}

export type AutoWaveResult =
  | {
      ok: true;
      started: number;
      finished: number;
      allCompleted: boolean;
      idle: boolean;
    }
  | { ok: false; error: string };

/**
 * One “tick” of demo automation: all eligible pending → running, then all eligible running → completed.
 * Respects the same DAG rules as manual transitions. Call repeatedly (with UI delay) until idle or allCompleted.
 */
export async function advanceWorkflowAutoWave(
  runId: string,
  actorId: string,
): Promise<AutoWaveResult> {
  const role = await getDemoRole();
  if (!canMutateWorkflow(role)) {
    return { ok: false, error: "Auto-run is disabled for the viewer role." };
  }

  const actor = actorId.trim() || "auto@demo.local";
  const ctx = await loadRunWorkflowContext(runId);
  if (!ctx) {
    return { ok: false, error: "Run not found" };
  }

  const { edges } = ctx;
  let stepsLite = toStepLite(ctx.stepRows);

  let started = 0;
  for (const row of ctx.stepRows) {
    if (row.status !== "pending") {
      continue;
    }
    const v = validateWorkflowTransition({
      edges,
      steps: stepsLite,
      nodeId: row.nodeId,
      nextStatus: "running",
    });
    if (!v.ok) {
      continue;
    }
    await commitStepStatusChange(
      runId,
      row,
      "running",
      actor,
      "demo auto-advance",
      "demo_auto_wave",
    );
    started++;
    stepsLite = stepsLite.map((s) =>
      s.nodeId === row.nodeId ? { ...s, status: "running" } : s,
    );
  }

  const afterStart = await db
    .select()
    .from(stepExecutions)
    .where(eq(stepExecutions.runId, runId));
  let lite2 = toStepLite(afterStart);

  const nodeIds = [...new Set(afterStart.map((r) => r.nodeId))];
  const wfNodes =
    nodeIds.length === 0
      ? []
      : await db
          .select({ id: workflowNodes.id, nodeType: workflowNodes.nodeType })
          .from(workflowNodes)
          .where(inArray(workflowNodes.id, nodeIds));
  const nodeTypeById = new Map(wfNodes.map((n) => [n.id, n.nodeType]));

  let finished = 0;
  for (const row of afterStart) {
    if (row.status !== "running") {
      continue;
    }
    const v = validateWorkflowTransition({
      edges,
      steps: lite2,
      nodeId: row.nodeId,
      nextStatus: "completed",
    });
    if (!v.ok) {
      continue;
    }
    const nt = nodeTypeById.get(row.nodeId);
    const completeComment =
      nt === "approval"
        ? "Automated demo completion — production requires human attestation."
        : "demo auto-advance";
    await commitStepStatusChange(
      runId,
      row,
      "completed",
      actor,
      completeComment,
      "demo_auto_wave",
    );
    finished++;
    lite2 = lite2.map((s) =>
      s.nodeId === row.nodeId ? { ...s, status: "completed" } : s,
    );
  }

  const finalRows = await db
    .select({ status: stepExecutions.status })
    .from(stepExecutions)
    .where(eq(stepExecutions.runId, runId));

  const allCompleted =
    finalRows.length > 0 &&
    finalRows.every((r) => r.status === "completed");
  const idle = started === 0 && finished === 0;

  revalidatePath(`/runs/${runId}`);
  revalidatePath("/runs");
  revalidatePath("/audit");

  return { ok: true, started, finished, allCompleted, idle };
}
