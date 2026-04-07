"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";
import { updateStepStatus } from "../../actions/workflow";
import {
  validateWorkflowTransition,
} from "../../../lib/workflow/workflow-rules-engine";
import type { DemoRole } from "../../../lib/roles/demo-role-constants";
import {
  WorkflowStepNode,
  type WorkflowStepData,
} from "../../components/workflow-step-node";
import styles from "../../disclosure.module.css";

const nodeTypes = { workflowStep: WorkflowStepNode };

function stepProgress(steps: StepRow[]) {
  const total = steps.length;
  const completed = steps.filter((s) => s.status === "completed").length;
  const running = steps.filter((s) => s.status === "running");
  const blocked = steps.filter((s) => s.status === "blocked");
  const pending = steps.filter((s) => s.status === "pending");
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const allDone = total > 0 && completed === total;
  return {
    total,
    completed,
    running,
    blocked,
    pending,
    pct,
    allDone,
  };
}

type StepRow = {
  id: string;
  nodeId: string;
  status: string;
  actorId: string | null;
  comment: string | null;
};

type Props = {
  runId: string;
  baseNodes: Node<WorkflowStepData>[];
  baseEdges: Edge[];
  steps: StepRow[];
  demoRole: DemoRole;
  linkedVersionStatus: string;
  openRequiredChecklist: number;
};

export function WorkflowRunClient({
  runId,
  baseNodes,
  baseEdges,
  steps,
  demoRole,
  linkedVersionStatus,
  openRequiredChecklist,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [optimisticSteps, setOptimisticSteps] = useState<StepRow[] | null>(
    null,
  );
  const [evidenceNote, setEvidenceNote] = useState("");

  const canMutateWorkflow = demoRole !== "viewer";

  const stepsSyncKey = useMemo(
    () =>
      steps
        .map((s) => `${s.id}:${s.status}`)
        .sort()
        .join("|"),
    [steps],
  );

  useEffect(() => {
    setOptimisticSteps(null);
  }, [stepsSyncKey]);

  const displaySteps = optimisticSteps ?? steps;

  const mergedNodes = useMemo(() => {
    const byNode = new Map(displaySteps.map((s) => [s.nodeId, s]));
    return baseNodes.map((n) => {
      const step = byNode.get(n.data.nodeId);
      return {
        ...n,
        data: {
          ...n.data,
          status: step?.status ?? n.data.status,
        },
      };
    });
  }, [baseNodes, displaySteps]);

  const [nodes, setNodes, onNodesChange] = useNodesState(mergedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(baseEdges);

  useEffect(() => {
    setNodes(mergedNodes);
  }, [mergedNodes, setNodes]);

  useEffect(() => {
    setEdges(baseEdges);
  }, [baseEdges, setEdges]);

  const ruleEdges = useMemo(
    () => baseEdges.map((e) => ({ source: e.source, target: e.target })),
    [baseEdges],
  );

  function nodeTypeFor(nodeId: string): string | undefined {
    return baseNodes.find((n) => n.data.nodeId === nodeId)?.data.nodeType;
  }

  async function transition(nodeId: string, nextStatus: string) {
    if (!canMutateWorkflow) {
      setMessage("Viewer role cannot change workflow steps.");
      return;
    }

    const base = optimisticSteps ?? steps;
    const check = validateWorkflowTransition({
      edges: ruleEdges,
      steps: base,
      nodeId,
      nextStatus,
    });
    if (!check.ok) {
      setMessage(check.message);
      return;
    }

    if (
      nextStatus === "completed" &&
      nodeTypeFor(nodeId) === "approval" &&
      !evidenceNote.trim()
    ) {
      setMessage(
        "Enter an evidence / attestation note before completing an approval step.",
      );
      return;
    }

    const commentForServer =
      nextStatus === "completed" ? evidenceNote.trim() || null : null;

    setMessage(null);
    setOptimisticSteps((prev) => {
      const optimisticBase = prev ?? steps;
      return optimisticBase.map((s) =>
        s.nodeId === nodeId ? { ...s, status: nextStatus } : s,
      );
    });
    startTransition(async () => {
      const res = await updateStepStatus(
        runId,
        nodeId,
        nextStatus,
        "demo@portfolio.local",
        commentForServer,
      );
      if (!res.ok) {
        setMessage(res.error);
        setOptimisticSteps(null);
        return;
      }
      router.refresh();
    });
  }

  const prog = useMemo(() => stepProgress(displaySteps), [displaySteps]);
  const busy = isPending || !canMutateWorkflow;

  const runningLabels = prog.running
    .map(
      (s) =>
        baseNodes.find((n) => n.data.nodeId === s.nodeId)?.data.label ?? s.nodeId,
    )
    .join(", ");

  const finalNode = baseNodes.find((n) => n.data.nodeKey === "final_approval");
  const finalStatus = finalNode
    ? (displaySteps.find((s) => s.nodeId === finalNode.data.nodeId)?.status ?? "")
    : "";
  const versionInReview = linkedVersionStatus === "in_review";

  return (
    <div
      className={styles.workflowRunUnified}
      aria-busy={busy}
      aria-label="Workflow run"
    >
      <div className={styles.workflowRunPanel}>
        {!versionInReview ? (
          <p className={styles.workflowRunGateError} role="status">
            Version not <strong>in review</strong> — submit from QA workspace before
            final approval.
          </p>
        ) : null}
        {openRequiredChecklist > 0 ? (
          <p className={styles.workflowRunGateError} role="status">
            <strong>{openRequiredChecklist}</strong> required checklist item(s) open.
          </p>
        ) : null}

        <div className={styles.sectionLabel} style={{ marginTop: 0 }}>
          Progress
        </div>
        <div className={styles.workflowProgressHeader}>
          <div className={styles.workflowProgressMeta} style={{ marginTop: 0 }}>
            <span>{prog.pct}%</span>
            {prog.allDone ? (
              <span className={styles.workflowProgressCelebrate}>All steps done.</span>
            ) : (
              <span>
                {prog.running.length > 0
                  ? `Now: ${runningLabels || "—"}`
                  : prog.blocked.length > 0
                    ? `${prog.blocked.length} blocked`
                    : "Advance steps below."}
              </span>
            )}
            {finalNode ? (
              <span className={styles.workflowRunFinalPill}>
                Final <strong>{finalStatus || "—"}</strong>
              </span>
            ) : null}
            {isPending ? (
              <span className={styles.workflowProgressSaving}>Saving…</span>
            ) : null}
          </div>
          <div className={styles.workflowProgressFraction}>
            <span className={styles.workflowProgressBig}>
              {prog.completed}/{prog.total}
            </span>
            <span className={styles.workflowProgressSmall}>done</span>
          </div>
        </div>

        <div
          className={styles.workflowProgressBarTrack}
          role="progressbar"
          aria-valuenow={prog.pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${prog.pct}% complete`}
        >
          <div
            className={styles.workflowProgressBarFill}
            data-saving={isPending ? "true" : undefined}
            style={{
              width: `${prog.pct}%`,
              background: prog.allDone ? "#22c55e" : undefined,
            }}
          />
        </div>

        <ul className={styles.workflowProgressLegend} aria-label="Legend">
          <li>
            <span className={styles.workflowLegendSwatch} data-status="completed" />{" "}
            Done
          </li>
          <li>
            <span className={styles.workflowLegendSwatch} data-status="running" />{" "}
            Running
          </li>
          <li>
            <span className={styles.workflowLegendSwatch} data-status="pending" />{" "}
            Pending
          </li>
          <li>
            <span className={styles.workflowLegendSwatch} data-status="blocked" />{" "}
            Blocked
          </li>
        </ul>
      </div>

      <div className={styles.workflowRunCanvasWrap}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
          style={{ width: "100%", height: "100%" }}
        >
          <Background gap={16} color="#d4d4d4" />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>

      <div className={styles.workflowRunPanel}>
        <div className={styles.sectionLabel} style={{ marginTop: 0 }}>
          Steps
        </div>
        {message ? (
          <p className={styles.workflowError} role="alert">
            {message}
          </p>
        ) : null}
        {!canMutateWorkflow ? (
          <p className={styles.workflowViewerBanner} role="status">
            <strong>Viewer</strong> — read-only. Change role on{" "}
            <a href="/compliance" className={styles.inlineLink}>
              Compliance
            </a>
            .
          </p>
        ) : null}
        {canMutateWorkflow ? (
          <label className={styles.workflowEvidenceField}>
            <span className={styles.workflowEvidenceLabel}>
              Evidence for <strong>approval</strong> completions
            </span>
            <textarea
              className={styles.workflowEvidenceTextarea}
              rows={2}
              value={evidenceNote}
              onChange={(e) => setEvidenceNote(e.target.value)}
              placeholder="Required when marking an approval step completed."
            />
          </label>
        ) : null}
        <ul className={styles.workflowStepList}>
          {displaySteps.map((s) => {
            const label =
              baseNodes.find((n) => n.data.nodeId === s.nodeId)?.data.label ??
              s.nodeId;
            return (
              <li key={s.id} className={styles.workflowStepRow}>
                <div>
                  <strong>{label}</strong>
                  <span className={styles.workflowStepMeta}>
                    {" "}
                    · {s.status.replaceAll("_", " ")}
                    {s.actorId ? ` · ${s.actorId}` : ""}
                  </span>
                </div>
                <div className={styles.workflowStepActions}>
                  {(
                    [
                      "pending",
                      "running",
                      "completed",
                      "blocked",
                      "skipped",
                    ] as const
                  ).map((st) => {
                    const rule = validateWorkflowTransition({
                      edges: ruleEdges,
                      steps: displaySteps,
                      nodeId: s.nodeId,
                      nextStatus: st,
                    });
                    const blockedByRule = !rule.ok;
                    const disabled =
                      busy || s.status === st || blockedByRule;
                    return (
                      <button
                        key={st}
                        type="button"
                        className={styles.workflowStepBtn}
                        disabled={disabled}
                        title={
                          blockedByRule && s.status !== st
                            ? rule.message
                            : undefined
                        }
                        onClick={() => transition(s.nodeId, st)}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
