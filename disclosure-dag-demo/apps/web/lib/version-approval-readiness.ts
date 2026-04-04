import {
  db,
  stepExecutions,
  versionChecklistItems,
  workflowNodes,
  workflowRuns,
} from "@repo/db";
import { and, count, eq, isNull } from "drizzle-orm";

/** Server-only snapshot for QA workspace + document sign-off gates. */
export type VersionApprovalReadiness = {
  requiredTotal: number;
  requiredDone: number;
  requiredOpen: number;
  checklistProgressPct: number;
  byCategory: Record<string, { done: number; total: number }>;
  runId: string | null;
  finalApprovalComplete: boolean;
  finalApprovalLabel: string | null;
};

export async function getVersionApprovalReadiness(
  versionId: string,
): Promise<VersionApprovalReadiness> {
  const items = await db
    .select()
    .from(versionChecklistItems)
    .where(eq(versionChecklistItems.documentVersionId, versionId));

  const requiredItems = items.filter((i) => i.required);
  const requiredDone = requiredItems.filter((i) => i.completedAt).length;
  const requiredTotal = requiredItems.length;
  const requiredOpen = requiredTotal - requiredDone;
  const checklistProgressPct =
    requiredTotal === 0 ? 100 : Math.round((requiredDone / requiredTotal) * 100);

  const byCategory: Record<string, { done: number; total: number }> = {};
  for (const i of items) {
    const c = i.category || "other";
    if (!byCategory[c]) {
      byCategory[c] = { done: 0, total: 0 };
    }
    byCategory[c].total += 1;
    if (i.completedAt) {
      byCategory[c].done += 1;
    }
  }

  const [run] = await db
    .select()
    .from(workflowRuns)
    .where(eq(workflowRuns.documentVersionId, versionId))
    .limit(1);

  let finalApprovalComplete = true;
  let finalApprovalLabel: string | null = null;

  if (run) {
    const [finalNode] = await db
      .select()
      .from(workflowNodes)
      .where(
        and(
          eq(workflowNodes.templateId, run.templateId),
          eq(workflowNodes.nodeKey, "final_approval"),
        ),
      )
      .limit(1);
    if (finalNode) {
      finalApprovalLabel = finalNode.label;
      const [step] = await db
        .select()
        .from(stepExecutions)
        .where(
          and(
            eq(stepExecutions.runId, run.id),
            eq(stepExecutions.nodeId, finalNode.id),
          ),
        )
        .limit(1);
      finalApprovalComplete = step?.status === "completed";
    }
  }

  return {
    requiredTotal,
    requiredDone,
    requiredOpen,
    checklistProgressPct,
    byCategory,
    runId: run?.id ?? null,
    finalApprovalComplete,
    finalApprovalLabel,
  };
}

export async function countOpenRequiredChecklist(versionId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(versionChecklistItems)
    .where(
      and(
        eq(versionChecklistItems.documentVersionId, versionId),
        eq(versionChecklistItems.required, true),
        isNull(versionChecklistItems.completedAt),
      ),
    );
  return Number(row?.n ?? 0);
}
