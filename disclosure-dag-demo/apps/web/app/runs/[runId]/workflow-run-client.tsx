"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import {
  advanceWorkflowAutoWave,
  updateStepStatus,
} from "../../actions/workflow";
import {
  validateWorkflowTransition,
} from "../../../lib/workflow-rules-engine";
import type { DemoRole } from "../../../lib/demo-role-constants";
import {
  WorkflowStepNode,
  type WorkflowStepData,
} from "../../components/workflow-step-node";
import styles from "../../disclosure.module.css";

const nodeTypes = { workflowStep: WorkflowStepNode };

const AUTO_WAVE_DELAY_MS = 750;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

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
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const autoCancelRef = useRef(false);
  const autoRunLockRef = useRef(false);
  const [optimisticSteps, setOptimisticSteps] = useState<StepRow[] | null>(
    null,
  );
  const [evidenceNote, setEvidenceNote] = useState("");

  const canMutateWorkflow = demoRole !== "viewer";

  useEffect(() => {
    return () => {
      autoCancelRef.current = true;
    };
  }, []);

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

  async function runAutoToCompletion() {
    if (!canMutateWorkflow) {
      return;
    }
    if (autoRunLockRef.current) {
      return;
    }
    autoRunLockRef.current = true;
    setMessage(null);
    setOptimisticSteps(null);
    autoCancelRef.current = false;
    setIsAutoAdvancing(true);
    try {
      while (!autoCancelRef.current) {
        const res = await advanceWorkflowAutoWave(runId, "auto@demo.local");
        if (!res.ok) {
          setMessage(res.error);
          break;
        }
        router.refresh();
        if (res.allCompleted) {
          break;
        }
        if (res.idle) {
          setMessage(
            "Auto-run stopped: no eligible steps (for example blocked steps need manual changes).",
          );
          break;
        }
        await sleep(AUTO_WAVE_DELAY_MS);
      }
    } finally {
      autoRunLockRef.current = false;
      setIsAutoAdvancing(false);
    }
  }

  function stopAuto() {
    autoCancelRef.current = true;
  }

  const prog = useMemo(() => stepProgress(displaySteps), [displaySteps]);
  const busy = isPending || isAutoAdvancing || !canMutateWorkflow;

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

  return (
    <div>
      <div
        className={styles.workflowPanel}
        style={{ marginBottom: "1rem", padding: "1rem 1.15rem" }}
      >
        <div className={styles.sectionLabel} style={{ marginTop: 0 }}>
          QA / approval engine coupling
        </div>
        <p className={styles.workflowPanelHint} style={{ marginBottom: "0.5rem" }}>
          Completing <strong>Final approval</strong> on this DAG is server-gated: the
          linked document version must be <code>in_review</code>, and every{" "}
          <strong>required</strong> Filing QA checklist row must be closed first.
          Admin <strong>document sign-off</strong> in the QA workspace then requires
          this final step to be <code>completed</code>.
        </p>
        {linkedVersionStatus !== "in_review" ? (
          <p className={styles.workflowError} role="status">
            Linked version is <strong>{linkedVersionStatus.replaceAll("_", " ")}</strong>{" "}
            — use <em>Submit for approval</em> from the Filing QA workspace so the
            version is <code>in_review</code> before finishing final approval.
          </p>
        ) : null}
        {openRequiredChecklist > 0 ? (
          <p className={styles.workflowError} role="status">
            <strong>{openRequiredChecklist}</strong> required checklist item(s) still
            open on the linked version — final approval completion is blocked.
          </p>
        ) : linkedVersionStatus === "in_review" ? (
          <p className={styles.workflowPanelHint} role="status">
            QA gate: no open <strong>required</strong> checklist items for linked
            version.
          </p>
        ) : null}
        {finalNode ? (
          <p className={styles.workflowPanelHint} style={{ marginTop: "0.35rem" }}>
            Final approval step status: <strong>{finalStatus || "—"}</strong>
          </p>
        ) : null}
      </div>

      <section
        className={styles.workflowProgressSection}
        aria-busy={busy}
        aria-label="Workflow progress"
      >
        <div className={styles.workflowProgressHeader}>
          <div>
            <h2 className={styles.workflowProgressTitle}>Progress</h2>
           
          </div>
          <div className={styles.workflowProgressFraction}>
            <span className={styles.workflowProgressBig}>
              {prog.completed}/{prog.total}
            </span>
            <span className={styles.workflowProgressSmall}>steps done</span>
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
        <div className={styles.workflowProgressMeta}>
          <span>{prog.pct}%</span>
          {prog.allDone ? (
            <span className={styles.workflowProgressCelebrate}>
              All steps completed — run is finished for this demo.
            </span>
          ) : (
            <span>
              {prog.running.length > 0
                ? `In progress: ${runningLabels || "—"}`
                : prog.blocked.length > 0
                  ? `${prog.blocked.length} step(s) blocked`
                  : "No step marked running — use buttons below to advance."}
            </span>
          )}
          {isPending ? (
            <span className={styles.workflowProgressSaving}>Saving…</span>
          ) : null}
          {isAutoAdvancing ? (
            <span className={styles.workflowProgressSaving}>Auto-running…</span>
          ) : null}
        </div>

        <ul className={styles.workflowProgressLegend} aria-label="Legend">
          <li>
            <span className={styles.workflowLegendSwatch} data-status="completed" />{" "}
            Done
          </li>
          <li>
            <span className={styles.workflowLegendSwatch} data-status="running" />{" "}
            In progress
          </li>
          <li>
            <span className={styles.workflowLegendSwatch} data-status="pending" />{" "}
            Not started
          </li>
          <li>
            <span className={styles.workflowLegendSwatch} data-status="blocked" />{" "}
            Blocked
          </li>
        </ul>

        <ol className={styles.workflowProgressChecklist}>
          {displaySteps.map((s) => {
            const label =
              baseNodes.find((n) => n.data.nodeId === s.nodeId)?.data.label ??
              s.nodeId;
            return (
              <li
                key={s.id}
                className={styles.workflowCheckItem}
                data-status={s.status}
              >
                <span
                  className={styles.workflowCheckIcon}
                  data-status={s.status}
                  aria-hidden
                />
                <span className={styles.workflowCheckLabel}>{label}</span>
                <span className={styles.workflowCheckState}>
                  {s.status.replaceAll("_", " ")}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <div
        className={styles.workflowCanvas}
        style={{ height: 520, width: "100%" }}
      >
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
        >
          <Background gap={16} color="#d4d4d4" />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>

      {message ? (
        <p className={styles.workflowError} role="alert">
          {message}
        </p>
      ) : null}

      <div className={styles.workflowPanel}>
        <div className={styles.sectionLabel}>Step transitions</div>
        <p className={styles.workflowPanelHint}>
          Updates <code>step_executions</code> and appends <code>audit_events</code>{" "}
          (append-only log). Transitions follow the DAG: upstream steps must be{" "}
          <strong>completed</strong> or <strong>skipped</strong> before downstream
          steps can run or finish.
        </p>
        {!canMutateWorkflow ? (
          <p className={styles.workflowViewerBanner} role="status">
            <strong>Viewer</strong> mode: workflow controls are read-only. Set role
            to reviewer or admin on{" "}
            <a href="/compliance" className={styles.inlineLink}>
              Compliance
            </a>
            .
          </p>
        ) : null}
        <div className={styles.workflowAutoRow}>
          <button
            type="button"
            className={styles.workflowAutoRunBtn}
            disabled={busy || prog.allDone}
            onClick={() => void runAutoToCompletion()}
          >
            Auto-run to completion
          </button>
          <button
            type="button"
            className={styles.workflowAutoStopBtn}
            disabled={!isAutoAdvancing}
            onClick={stopAuto}
          >
            Stop
          </button>
          <span className={styles.workflowAutoHint}>
            Demo: starts every ready step, then completes all in progress, repeats
            until 100% or nothing left to do.
          </span>
        </div>
        {canMutateWorkflow ? (
          <label className={styles.workflowEvidenceField}>
            <span className={styles.workflowEvidenceLabel}>
              Evidence / attestation (required when marking an{" "}
              <strong>approval</strong> step completed)
            </span>
            <textarea
              className={styles.workflowEvidenceTextarea}
              rows={3}
              value={evidenceNote}
              onChange={(e) => setEvidenceNote(e.target.value)}
              placeholder="e.g. Supervisory review complete; no material issues."
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
