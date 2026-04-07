/**
 * DAG workflow rules: shared by the server action and the run UI.
 * Direct predecessors must be `completed` or `skipped` before a step can
 * become `running`, `completed`, or `skipped` from `pending`/`blocked`.
 */

export const WORKFLOW_STEP_STATUSES = [
  "pending",
  "running",
  "completed",
  "blocked",
  "skipped",
] as const;

export type WorkflowStepStatus = (typeof WORKFLOW_STEP_STATUSES)[number];

const ALLOWED = new Set<string>(WORKFLOW_STEP_STATUSES);

export type WorkflowEdgeLite = { source: string; target: string };

export type WorkflowStepLite = { nodeId: string; status: string };

/** Map: node id → direct predecessor node ids (from incoming edges). */
export function predecessorsFromEdges(
  edges: WorkflowEdgeLite[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const e of edges) {
    const list = map.get(e.target) ?? [];
    list.push(e.source);
    map.set(e.target, list);
  }
  return map;
}

function predecessorsDone(
  predecessorIds: string[],
  statusByNodeId: Map<string, string>,
): boolean {
  for (const pid of predecessorIds) {
    const st = statusByNodeId.get(pid);
    if (st !== "completed" && st !== "skipped") {
      return false;
    }
  }
  return true;
}

export type TransitionValidation =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Validates a single step status change for one run.
 * `edges` must be React Flow–style { source, target } using workflow node UUIDs.
 */
export function validateWorkflowTransition(input: {
  edges: WorkflowEdgeLite[];
  steps: WorkflowStepLite[];
  nodeId: string;
  nextStatus: string;
}): TransitionValidation {
  if (!ALLOWED.has(input.nextStatus)) {
    return { ok: false, message: "Invalid status." };
  }
  const next = input.nextStatus as WorkflowStepStatus;

  const statusByNodeId = new Map(
    input.steps.map((s) => [s.nodeId, s.status] as const),
  );
  const fromRaw = statusByNodeId.get(input.nodeId);
  if (!fromRaw || !ALLOWED.has(fromRaw)) {
    return { ok: false, message: "Unknown current step status." };
  }
  const from = fromRaw as WorkflowStepStatus;

  if (from === next) {
    return { ok: true };
  }

  if (from === "completed" || from === "skipped") {
    return {
      ok: false,
      message: "This step is already finalized and cannot change.",
    };
  }

  const predMap = predecessorsFromEdges(input.edges);
  const preds = predMap.get(input.nodeId) ?? [];

  if (from === "pending") {
    if (next === "blocked") {
      return { ok: true };
    }
    if (next === "running" || next === "completed" || next === "skipped") {
      if (!predecessorsDone(preds, statusByNodeId)) {
        return {
          ok: false,
          message:
            "Upstream steps must be completed or skipped before this step can advance.",
        };
      }
      return { ok: true };
    }
    return {
      ok: false,
      message: `Cannot transition from pending to ${next}.`,
    };
  }

  if (from === "running") {
    if (next === "completed" || next === "blocked") {
      return { ok: true };
    }
    return {
      ok: false,
      message: `Cannot transition from running to ${next}.`,
    };
  }

  if (from === "blocked") {
    if (next === "pending") {
      return { ok: true };
    }
    if (next === "completed") {
      return {
        ok: false,
        message: "Move to running first, then complete.",
      };
    }
    if (next === "running" || next === "skipped") {
      if (!predecessorsDone(preds, statusByNodeId)) {
        return {
          ok: false,
          message:
            "Upstream steps must be completed or skipped before this step can advance.",
        };
      }
      return { ok: true };
    }
    return {
      ok: false,
      message: `Cannot transition from blocked to ${next}.`,
    };
  }

  return {
    ok: false,
    message: `Invalid transition from ${from} to ${next}.`,
  };
}
