"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addChecklistItem,
  approveDocumentVersion,
  rejectDocumentVersion,
  reopenRejectedVersion,
  removeUserChecklistItem,
  submitVersionForApproval,
  toggleChecklistItem,
  updateVersionDraftContent,
  validateIxbrlDraftsForVersion,
} from "../../../../actions/compliance-workspace";
import {
  canApproveDocumentVersion,
  canExportFiling,
  canMutateChecklist,
  canRejectDocumentVersion,
  canReopenRejectedVersion,
  type DemoRole,
} from "../../../../../lib/demo-role-constants";
import type { VersionApprovalReadiness } from "../../../../../lib/version-approval-readiness";
import {
  expandRedlinePartsToSideBySideRows,
  type RedlinePart,
} from "../../../../../lib/redline-split-rows";
import styles from "../../../../disclosure.module.css";

export type ChecklistDTO = {
  id: string;
  code: string;
  label: string;
  category: string;
  required: boolean;
  completedAt: string | null;
  completedBy: string | null;
  evidenceNote: string | null;
};

export type FactDTO = {
  id: string;
  conceptQname: string;
  contextRef: string;
  factValue: string;
  validatedOk: boolean;
  validationMessage: string | null;
};

type Tab = "content" | "redline" | "checklist" | "ixbrl" | "export";

type DecisionMode = "reject" | "approve";

type RedlineLayout = "inline" | "split";

/** Seed: Corgi Innovation ETF → Risk factors → version 2025.04.1 (has `ixbrl_fact_drafts` rows). */
const SEED_IXBRL_DOC_ID = "d0000001-0000-4000-8000-000000000001";
const SEED_IXBRL_VERSION_ID = "b0000002-0000-4000-8000-000000000002";

/**
 * TODO: dedupe — keep in sync with `USER_CHECKLIST_CODE_PREFIX` in
 * `app/actions/compliance-workspace.ts` (Next "use server" files cannot export it).
 */
const USER_CHECKLIST_CODE_PREFIX = "user_";

type Flash = { tone: "success" | "error"; text: string };

type RedlineBaselineMode = "parent" | "previous" | "anchor" | "none";

type Props = {
  documentId: string;
  versionId: string;
  docTitle: string;
  versionLabel: string;
  status: string;
  initialContent: string;
  demoRole: DemoRole;
  runId: string | null;
  checklist: ChecklistDTO[];
  facts: FactDTO[];
  redline: RedlinePart[];
  redlineBaselineMode: RedlineBaselineMode;
  /** Prior revision label when mode is `parent` or `previous`. */
  redlineBaselineVersionLabel: string | null;
  approvalReadiness: VersionApprovalReadiness;
};

export function VersionWorkspaceClient({
  documentId,
  versionId,
  docTitle,
  versionLabel,
  status,
  initialContent,
  demoRole,
  runId,
  checklist,
  facts,
  redline,
  redlineBaselineMode,
  redlineBaselineVersionLabel,
  approvalReadiness,
}: Props) {
  const router = useRouter();

  /** Lets success copy render before `router.refresh()` remounts client state (App Router). */
  function scheduleRefresh() {
    window.setTimeout(() => {
      router.refresh();
    }, 450);
  }
  const [tab, setTab] = useState<Tab>("content");
  const [redlineLayout, setRedlineLayout] = useState<RedlineLayout>("inline");
  const [content, setContent] = useState(initialContent);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [pending, startTransition] = useTransition();
  const [approveNote, setApproveNote] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [decisionMode, setDecisionMode] = useState<DecisionMode>("approve");
  const [newCheckLabel, setNewCheckLabel] = useState("");
  const [newCheckCategory, setNewCheckCategory] = useState("qa_content");
  const [newCheckRequired, setNewCheckRequired] = useState(true);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  /** Success toasts (e.g. “Draft body saved.”) auto-dismiss so they never sit forever. */
  useEffect(() => {
    if (!flash || flash.tone !== "success") return;
    const id = window.setTimeout(() => {
      setFlash(null);
    }, 3000);
    return () => window.clearTimeout(id);
  }, [flash]);

  const canChecklist = canMutateChecklist(demoRole);
  const canExport = canExportFiling(demoRole);
  const canApprove = canApproveDocumentVersion(demoRole);
  const canReject = canRejectDocumentVersion(demoRole);
  const canReopen = canReopenRejectedVersion(demoRole);
  const canEditChecklistStructure = canChecklist && status !== "approved";

  const requiredOpen = useMemo(() => {
    return checklist.filter((c) => c.required && !c.completedAt);
  }, [checklist]);

  const redlineSplitRows = useMemo(
    () => expandRedlinePartsToSideBySideRows(redline),
    [redline],
  );

  const checklistByCategory = useMemo(() => {
    const m = new Map<string, ChecklistDTO[]>();
    for (const c of checklist) {
      const k = c.category || "other";
      const list = m.get(k) ?? [];
      list.push(c);
      m.set(k, list);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [checklist]);

  const DEFAULT_EVIDENCE_REQUIRED =
    "Acknowledged in filing QA workspace with control evidence sufficient for audit trail (demo).";

  async function onToggleCheck(itemId: string, completed: boolean) {
    setFlash(null);
    startTransition(async () => {
      const res = await toggleChecklistItem({
        itemId,
        completed,
        actorId: "reviewer@demo.local",
        evidenceNote: completed ? DEFAULT_EVIDENCE_REQUIRED : null,
      });
      if (!res.ok) {
        setFlash({ tone: "error", text: res.error });
        return;
      }
      router.refresh();
    });
  }

  function onAddChecklistRow() {
    setFlash(null);
    startTransition(async () => {
      const res = await addChecklistItem({
        versionId,
        label: newCheckLabel,
        category: newCheckCategory,
        required: newCheckRequired,
        actorId: "reviewer@demo.local",
      });
      if (!res.ok) {
        setFlash({ tone: "error", text: res.error });
        return;
      }
      setNewCheckLabel("");
      setFlash({ tone: "success", text: "Checklist row added." });
      scheduleRefresh();
    });
  }

  function onRemoveUserChecklist(itemId: string) {
    setFlash(null);
    startTransition(async () => {
      const res = await removeUserChecklistItem({
        itemId,
        actorId: "reviewer@demo.local",
      });
      if (!res.ok) {
        setFlash({ tone: "error", text: res.error });
        return;
      }
      setFlash({ tone: "success", text: "Checklist row removed." });
      scheduleRefresh();
    });
  }

  async function onSaveContent() {
    setFlash(null);
    startTransition(async () => {
      try {
        const res = await updateVersionDraftContent({
          versionId,
          content,
          actorId: "reviewer@demo.local",
        });
        if (!res.ok) {
          setFlash({ tone: "error", text: res.error });
          return;
        }
        setFlash({ tone: "success", text: "Draft body saved." });
        scheduleRefresh();
      } catch (e) {
        const message = e instanceof Error ? e.message : "Save failed";
        setFlash({ tone: "error", text: message });
      }
    });
  }

  async function onSubmitForApproval() {
    setFlash(null);
    startTransition(async () => {
      const res = await submitVersionForApproval({
        versionId,
        actorId: "reviewer@demo.local",
      });
      if (!res.ok) {
        setFlash({ tone: "error", text: res.error });
        return;
      }
      if ("alreadyInReview" in res && res.alreadyInReview) {
        setFlash({
          tone: "success",
          text:
            "workflowStarted" in res && res.workflowStarted
              ? "Workflow run created from the default template — DAG is linked."
              : "This version is already in review.",
        });
      } else {
        setFlash({
          tone: "success",
          text: "Submitted for review — document version status is now in_review.",
        });
      }
      scheduleRefresh();
    });
  }

  async function onValidateIxbrl() {
    setFlash(null);
    startTransition(async () => {
      const res = await validateIxbrlDraftsForVersion(versionId);
      if (!res.ok) {
        setFlash({ tone: "error", text: res.error });
        return;
      }
      if (!res.allValid) {
        setFlash({
          tone: "error",
          text: "Some facts failed demo validation — fix QName/value issues and re-run.",
        });
      } else {
        setFlash({
          tone: "success",
          text: "All draft facts passed demo validation; checklist updated if applicable.",
        });
      }
      scheduleRefresh();
    });
  }

  async function onApproveVersion() {
    setFlash(null);
    startTransition(async () => {
      const res = await approveDocumentVersion({
        versionId,
        actorId: "admin@demo.local",
        rationale: approveNote,
      });
      if (!res.ok) {
        setFlash({ tone: "error", text: res.error });
        return;
      }
      setApproveNote("");
      setFlash({
        tone: "success",
        text: "Version approved — status is now approved (formal sign-off recorded).",
      });
      scheduleRefresh();
    });
  }

  async function onRejectVersion() {
    setFlash(null);
    startTransition(async () => {
      const res = await rejectDocumentVersion({
        versionId,
        actorId: "reviewer@demo.local",
        rationale: rejectNote,
      });
      if (!res.ok) {
        setFlash({ tone: "error", text: res.error });
        return;
      }
      setRejectNote("");
      setFlash({
        tone: "success",
        text: "Version rejected — moved to rejected until reopened as draft.",
      });
      scheduleRefresh();
    });
  }

  async function onReopenRejected() {
    setFlash(null);
    startTransition(async () => {
      const res = await reopenRejectedVersion({
        versionId,
        actorId: "reviewer@demo.local",
      });
      if (!res.ok) {
        setFlash({ tone: "error", text: res.error });
        return;
      }
      setFlash({
        tone: "success",
        text: "Reopened as draft — you may edit and resubmit for review.",
      });
      scheduleRefresh();
    });
  }

  return (
    <div>
      <div
        className={styles.workspaceGatesCard}
        aria-label="Process control and gates"
      >
        <div className={styles.workflowProgressHeader}>
          <div>
            <div className={styles.sectionLabel} style={{ marginTop: 0 }}>
              Process
            </div>
          </div>
          <div className={styles.workflowProgressFraction}>
            <span className={styles.workflowProgressBig}>
              {approvalReadiness.requiredDone}/{approvalReadiness.requiredTotal}
            </span>
            <span className={styles.workflowProgressSmall}>required QA</span>
          </div>
        </div>
        <div
          className={styles.workspaceQaBarTrack}
          role="progressbar"
          aria-valuenow={
            approvalReadiness.requiredTotal === 0
              ? 100
              : approvalReadiness.checklistProgressPct
          }
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={styles.workspaceQaBarFill}
            style={{
              width: `${approvalReadiness.requiredTotal === 0 ? 100 : approvalReadiness.checklistProgressPct}%`,
            }}
          />
        </div>
        {approvalReadiness.requiredTotal === 0 ? (
          <p className={styles.workspaceCheckMeta} style={{ margin: "0.35rem 0 0" }}>
            No required checklist rows.
          </p>
        ) : null}
        <div className={styles.workspaceQaCategoryRow}>
          <span>
            Workflow:{" "}
            {approvalReadiness.runId ? (
              <>
                <Link
                  href={`/runs/${approvalReadiness.runId}`}
                  className={styles.inlineLink}
                >
                  linked run
                </Link>
                {approvalReadiness.finalApprovalLabel ? (
                  <>
                    {" "}
                    · final step{" "}
                    <strong>
                      {approvalReadiness.finalApprovalComplete ? "done" : "open"}
                    </strong>
                  </>
                ) : null}
              </>
            ) : (
              <span className={styles.auditCellMuted}>no run linked</span>
            )}
          </span>
          <span>
            Status: <strong>{status.replaceAll("_", " ")}</strong>
          </span>
        </div>

        {status === "draft" && requiredOpen.length > 0 ? (
          <p className={styles.workflowError} style={{ marginTop: "0.5rem" }} role="status">
            <strong>{requiredOpen.length}</strong> required checklist item
            {requiredOpen.length !== 1 ? "s" : ""} open — finish in <strong>Checklist</strong>{" "}
            tab.
          </p>
        ) : null}
        {status === "rejected" ? (
          <p className={styles.workflowError} style={{ marginTop: "0.5rem" }} role="status">
            Rejected — reopen as draft to revise.
          </p>
        ) : null}
        {status === "approved" ? (
          <p className={styles.workspaceCheckMeta} style={{ marginTop: "0.5rem" }}>
            Approved
            {approvalReadiness.runId ? (
              <>
                {" "}
                ·{" "}
                <Link
                  href={`/runs/${approvalReadiness.runId}`}
                  className={styles.inlineLink}
                >
                  DAG
                </Link>
              </>
            ) : null}
          </p>
        ) : null}

        <div
          style={{
            marginTop: "0.85rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          {status === "draft" && canChecklist ? (
            <>
              <button
                type="button"
                className={styles.workflowAutoRunBtn}
                disabled={pending || requiredOpen.length > 0}
                title={
                  requiredOpen.length > 0
                    ? "Complete required checklist items first."
                    : undefined
                }
                onClick={() => void onSubmitForApproval()}
              >
                Submit for approval
              </button>
            </>
          ) : null}
          {status === "in_review" && !runId && canChecklist ? (
            <button
              type="button"
              className={styles.workflowAutoRunBtn}
              disabled={pending}
              title="Create workflow run for this version"
              onClick={() => void onSubmitForApproval()}
            >
              Start workflow run
            </button>
          ) : null}
          {status === "draft" && !canChecklist ? (
            <p className={styles.workflowViewerBanner} style={{ margin: 0 }}>
              Switch to reviewer/admin on{" "}
              <a href="/compliance" className={styles.inlineLink}>
                Compliance
              </a>{" "}
              to submit.
            </p>
          ) : null}
        </div>

        {status === "in_review" ? (
          <div className={styles.workspaceGatesDivide}>
            <div className={styles.sectionLabel} style={{ marginTop: 0 }}>
              Decision
            </div>
            {!canReject && !canApprove ? (
              <p className={styles.workflowViewerBanner}>
                Read-only —{" "}
                <a href="/compliance" className={styles.inlineLink}>
                  Compliance
                </a>
              </p>
            ) : null}
            {canReject && canApprove ? (
              <div
                className={styles.workspaceDecisionSegment}
                role="tablist"
                aria-label="Reject or approve"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={decisionMode === "reject"}
                  data-active={decisionMode === "reject" ? "true" : "false"}
                  className={styles.workspaceDecisionSegmentBtn}
                  onClick={() => setDecisionMode("reject")}
                >
                  Reject
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={decisionMode === "approve"}
                  data-active={decisionMode === "approve" ? "true" : "false"}
                  className={styles.workspaceDecisionSegmentBtn}
                  onClick={() => setDecisionMode("approve")}
                >
                  Approve
                </button>
              </div>
            ) : null}
            {canReject && (!canApprove || decisionMode === "reject") ? (
              <div>
                <label className={styles.workflowEvidenceField}>
                  <span className={styles.workflowEvidenceLabel}>
                    Reject note (≥24 characters)
                  </span>
                  <textarea
                    className={styles.workflowEvidenceTextarea}
                    rows={3}
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Why this version is being rejected."
                  />
                </label>
                <button
                  type="button"
                  className={styles.workflowAutoStopBtn}
                  disabled={pending || rejectNote.trim().length < 24}
                  onClick={() => void onRejectVersion()}
                >
                  Reject
                </button>
              </div>
            ) : null}
            {canApprove && (!canReject || decisionMode === "approve") ? (
              <div>
                <label className={styles.workflowEvidenceField}>
                  <span className={styles.workflowEvidenceLabel}>
                    Sign-off note (≥24 characters)
                  </span>
                  <textarea
                    className={styles.workflowEvidenceTextarea}
                    rows={3}
                    value={approveNote}
                    onChange={(e) => setApproveNote(e.target.value)}
                    placeholder="Brief attestation for the audit log."
                  />
                </label>
                <button
                  type="button"
                  className={styles.workflowAutoRunBtn}
                  disabled={
                    pending ||
                    approveNote.trim().length < 24 ||
                    approvalReadiness.requiredOpen > 0 ||
                    (approvalReadiness.runId !== null &&
                      !approvalReadiness.finalApprovalComplete)
                  }
                  title={
                    approvalReadiness.requiredOpen > 0
                      ? "Close required checklist items."
                      : approvalReadiness.runId && !approvalReadiness.finalApprovalComplete
                        ? "Complete final step on linked DAG run."
                        : undefined
                  }
                  onClick={() => void onApproveVersion()}
                >
                  Approve (sign-off)
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {status === "rejected" && canReopen ? (
          <div style={{ marginTop: "0.75rem" }}>
            <button
              type="button"
              className={styles.workflowAutoRunBtn}
              disabled={pending}
              onClick={() => void onReopenRejected()}
            >
              Reopen as draft
            </button>
          </div>
        ) : null}
      </div>

      <div className={styles.workspaceTabs} role="tablist" aria-label="Workspace sections">
        {(
          [
            ["content", "Content"],
            ["redline", "Redline"],
            ["checklist", "Checklist"],
            ["ixbrl", "iXBRL"],
            ["export", "Export"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={styles.workspaceTab}
            data-active={tab === id ? "true" : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {flash ? (
        <p
          className={
            flash.tone === "success"
              ? styles.workflowFlashSuccess
              : styles.workflowError
          }
          role={flash.tone === "success" ? "status" : "alert"}
        >
          {flash.text}
        </p>
      ) : null}

      <div className={styles.workspaceTabPanel} role="tabpanel">
        {tab === "content" ? (
          <div>
            <p className={styles.workspaceCheckMeta} style={{ margin: "0 0 0.65rem" }}>
              <strong>{status.replaceAll("_", " ")}</strong>
              {runId ? (
                <>
                  {" "}
                  ·{" "}
                  <Link href={`/runs/${runId}`} className={styles.inlineLink}>
                    Run
                  </Link>
                </>
              ) : null}
            </p>
            {canChecklist ? (
              <>
                <textarea
                  className={styles.contentEditor}
                  rows={18}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  aria-label="Version body"
                />
                <div style={{ marginTop: "0.75rem" }}>
                  <button
                    type="button"
                    className={styles.workflowAutoRunBtn}
                    disabled={pending || status === "approved"}
                    onClick={() => void onSaveContent()}
                  >
                    Save draft body
                  </button>
                  {status === "approved" ? (
                    <span className={styles.workspaceCheckMeta} style={{ marginLeft: "0.75rem" }}>
                      Locked.
                    </span>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <p className={styles.workflowViewerBanner}>
                  Read-only ({demoRole}) —{" "}
                  <a href="/compliance" className={styles.inlineLink}>
                    Compliance
                  </a>
                </p>
                <pre className={styles.contentBlock}>{initialContent}</pre>
              </>
            )}
          </div>
        ) : null}

        {tab === "redline" ? (
          <div className={styles.workspaceGatesCard} style={{ marginBottom: 0 }}>
            <div className={styles.sectionLabel} style={{ marginTop: 0 }}>
              Redline
            </div>
            {redlineBaselineMode === "none" ? (
              <p className={styles.workspaceCheckMeta} style={{ margin: "0.35rem 0 0" }}>
                No baseline yet — save draft once or add a parent / older version for
                lineage.
              </p>
            ) : null}
            {redlineBaselineMode === "anchor" ? (
              <p className={styles.workspaceCheckMeta} style={{ margin: "0.35rem 0 0" }}>
                vs last saved body on this version.
              </p>
            ) : null}
            {redlineBaselineMode === "previous" ? (
              <p className={styles.workspaceCheckMeta} style={{ margin: "0.35rem 0 0" }}>
                vs previous revision
                {redlineBaselineVersionLabel ? (
                  <>
                    {" "}
                    <strong>{redlineBaselineVersionLabel}</strong>
                  </>
                ) : null}
                .
              </p>
            ) : null}
            {redlineBaselineMode === "parent" && redlineBaselineVersionLabel ? (
              <p className={styles.workspaceCheckMeta} style={{ margin: "0.35rem 0 0" }}>
                vs parent <strong>{redlineBaselineVersionLabel}</strong>.
              </p>
            ) : null}
            <div
              className={styles.workspaceDecisionSegment}
              role="tablist"
              aria-label="Diff layout"
            >
              <button
                type="button"
                role="tab"
                aria-selected={redlineLayout === "inline"}
                className={styles.workspaceDecisionSegmentBtn}
                data-active={redlineLayout === "inline" ? "true" : "false"}
                onClick={() => setRedlineLayout("inline")}
              >
                Inline
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={redlineLayout === "split"}
                className={styles.workspaceDecisionSegmentBtn}
                data-active={redlineLayout === "split" ? "true" : "false"}
                onClick={() => setRedlineLayout("split")}
              >
                Split
              </button>
            </div>
            {redlineLayout === "inline" ? (
              <div className={styles.workspaceRedline} aria-label="Inline diff vs baseline">
                {redline.map((p, i) => (
                  <span
                    key={i}
                    className={
                      p.type === "add"
                        ? styles.workspaceRedlineAdd
                        : p.type === "remove"
                          ? styles.workspaceRedlineRemove
                          : styles.workspaceRedlineSame
                    }
                  >
                    {p.value}
                  </span>
                ))}
              </div>
            ) : (
              <div
                className={styles.workspaceRedlineSplit}
                aria-label="Side-by-side diff vs baseline"
              >
                <div className={styles.workspaceRedlineSplitHeader}>
                  <div className={styles.workspaceRedlineSplitHeaderCell}>
                    Baseline
                    {redlineBaselineVersionLabel ? (
                      <>
                        {" "}
                        <span className={styles.workspaceRedlineHeaderSub}>
                          ({redlineBaselineVersionLabel})
                        </span>
                      </>
                    ) : redlineBaselineMode === "none" ? (
                      <span className={styles.workspaceRedlineHeaderSub}> (empty)</span>
                    ) : null}
                  </div>
                  <div className={styles.workspaceRedlineSplitHeaderCell}>
                    Current{" "}
                    <span className={styles.workspaceRedlineHeaderSub}>({versionLabel})</span>
                  </div>
                </div>
                <div className={styles.workspaceRedlineSplitBody}>
                  {redlineSplitRows.length === 0 ? (
                    <p className={styles.workspaceCheckMeta} style={{ padding: "1rem", margin: 0 }}>
                      No changes vs baseline.
                    </p>
                  ) : (
                    redlineSplitRows.map((row, i) => (
                      <div key={i} className={styles.workspaceRedlineSplitRow}>
                        <pre
                          className={`${styles.workspaceRedlineSplitCell} ${
                            row.leftTone === "remove"
                              ? styles.workspaceRedlineSplitCellRemove
                              : row.leftTone === "same"
                                ? styles.workspaceRedlineSplitCellSame
                                : styles.workspaceRedlineSplitCellNeutral
                          }`}
                        >
                          {row.left}
                        </pre>
                        <pre
                          className={`${styles.workspaceRedlineSplitCell} ${
                            row.rightTone === "add"
                              ? styles.workspaceRedlineSplitCellAdd
                              : row.rightTone === "same"
                                ? styles.workspaceRedlineSplitCellSame
                                : styles.workspaceRedlineSplitCellNeutral
                          }`}
                        >
                          {row.right}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {tab === "checklist" ? (
          <div>
            <div className={styles.workspaceQaCategoryRow} style={{ marginBottom: "0.75rem" }}>
              <span>
                Progress: <strong>{approvalReadiness.requiredDone}</strong> /{" "}
                <strong>{approvalReadiness.requiredTotal}</strong> required
              </span>
              <span>
                {requiredOpen.length === 0 ? (
                  <span style={{ color: "#15803d" }}>Clear</span>
                ) : (
                  <span style={{ color: "#b45309" }}>
                    {requiredOpen.length} open
                  </span>
                )}
              </span>
            </div>
            {!canChecklist ? (
              <p className={styles.workflowViewerBanner}>
                Read-only —{" "}
                <a href="/compliance" className={styles.inlineLink}>
                  Compliance
                </a>
              </p>
            ) : null}
            {checklist.length === 0 ? (
              <p className={styles.empty}>
                No checklist rows yet{canEditChecklistStructure ? " — add one below" : ""}.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {checklistByCategory.map(([category, items]) => (
                  <section key={category}>
                    <div className={styles.sectionLabel} style={{ margin: "0 0 0.5rem" }}>
                      {category.replaceAll("_", " ")}
                    </div>
                    <ul className={styles.workspaceChecklist}>
                      {items.map((c) => (
                        <li key={c.id} className={styles.workspaceCheckRow}>
                          <input
                            type="checkbox"
                            checked={!!c.completedAt}
                            disabled={!canChecklist || pending || status === "approved"}
                            onChange={(e) => void onToggleCheck(c.id, e.target.checked)}
                            aria-label={c.label}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div>
                              <strong>{c.label}</strong>{" "}
                              <span className={styles.policyCode}>({c.code})</span>{" "}
                              <span className={styles.workspaceCheckMeta}>
                                {c.required ? "required" : "optional"}
                              </span>
                              {c.code.startsWith(USER_CHECKLIST_CODE_PREFIX) ? (
                                <span className={styles.workspaceCheckMeta}> · yours</span>
                              ) : null}
                            </div>
                            {c.completedAt ? (
                              <div className={styles.workspaceCheckMeta}>
                                Done {c.completedAt} by {c.completedBy}
                                {c.evidenceNote ? ` — ${c.evidenceNote}` : ""}
                              </div>
                            ) : c.required ? (
                              <div className={styles.workspaceCheckMeta}>
                                Evidence ≥12 chars on check.
                              </div>
                            ) : null}
                            {canEditChecklistStructure &&
                            c.code.startsWith(USER_CHECKLIST_CODE_PREFIX) &&
                            !c.completedAt ? (
                              <div style={{ marginTop: "0.5rem" }}>
                                <button
                                  type="button"
                                  className={styles.workflowAutoStopBtn}
                                  disabled={pending}
                                  onClick={() => onRemoveUserChecklist(c.id)}
                                >
                                  Remove row
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
            {canEditChecklistStructure ? (
              <div className={styles.workspaceAddChecklistCard}>
                <header className={styles.workspaceAddChecklistHeader}>
                  <h3 className={styles.workspaceAddChecklistTitle}>New checklist row</h3>
                  <p className={styles.workspaceAddChecklistHint}>
                    You can remove user-added rows until they are checked off.
                  </p>
                </header>
                <div className={styles.workspaceAddChecklistBody}>
                  <div className={styles.workspaceAddChecklistField}>
                    <label
                      className={styles.workspaceAddChecklistLabel}
                      htmlFor="workspace-new-checklist-label"
                    >
                      What to verify
                    </label>
                    <textarea
                      id="workspace-new-checklist-label"
                      className={styles.workspaceAddChecklistTextarea}
                      value={newCheckLabel}
                      onChange={(e) => setNewCheckLabel(e.target.value)}
                      placeholder="e.g. Legal reviewed cross-references to the summary prospectus."
                      rows={3}
                    />
                  </div>
                  <div className={styles.workspaceAddChecklistControls}>
                    <div className={styles.workspaceAddChecklistField}>
                      <label
                        className={styles.workspaceAddChecklistLabel}
                        htmlFor="workspace-new-checklist-category"
                      >
                        Category
                      </label>
                      <select
                        id="workspace-new-checklist-category"
                        className={styles.workspaceAddChecklistSelect}
                        value={newCheckCategory}
                        onChange={(e) => setNewCheckCategory(e.target.value)}
                      >
                        <option value="qa_content">QA / content</option>
                        <option value="ixbrl">iXBRL</option>
                        <option value="edgar_pack">EDGAR pack</option>
                        <option value="sec_control">SEC control</option>
                      </select>
                    </div>
                    <label className={styles.workspaceAddChecklistToggle}>
                      <input
                        type="checkbox"
                        checked={newCheckRequired}
                        onChange={(e) => setNewCheckRequired(e.target.checked)}
                      />
                      <span>Required — blocks submit until complete</span>
                    </label>
                  </div>
                  <button
                    type="button"
                    className={styles.workspaceAddChecklistBtn}
                    disabled={pending || newCheckLabel.trim().length < 3}
                    onClick={() => onAddChecklistRow()}
                  >
                    Add to checklist
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "ixbrl" ? (
          <div>
            <p className={styles.workspaceCheckMeta} style={{ margin: "0 0 0.75rem" }}>
              Demo drafts in DB. Sample data:{" "}
              <Link
                href={`/documents/${SEED_IXBRL_DOC_ID}/versions/${SEED_IXBRL_VERSION_ID}`}
                className={styles.inlineLink}
              >
                Corgi / 2025.04.1
              </Link>
              .
            </p>
            {facts.length === 0 ? (
              <p className={styles.empty}>No facts on this version.</p>
            ) : (
              <>
                <p className={styles.workspaceCheckMeta} style={{ margin: "0 0 0.5rem" }}>
                  Validator: QName shape, value, <code>c-…</code> context — not full taxonomy.
                </p>
                <div className={styles.workspaceIxbrlTableWrap}>
                  <table className={styles.workspaceIxbrlTable}>
                    <thead>
                      <tr>
                        <th>Concept (QName)</th>
                        <th>Value</th>
                        <th>Context</th>
                        <th>Demo validation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facts.map((f) => (
                        <tr key={f.id}>
                          <td>
                            <code>{f.conceptQname}</code>
                          </td>
                          <td>{f.factValue}</td>
                          <td>{f.contextRef}</td>
                          <td>
                            {f.validatedOk ? (
                              <span style={{ color: "#15803d" }}>OK</span>
                            ) : (
                              <span style={{ color: "#b91c1c" }}>
                                {f.validationMessage ?? "Not validated"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {canChecklist ? (
                  <button
                    type="button"
                    className={styles.workflowAutoRunBtn}
                    style={{ marginTop: "0.75rem" }}
                    disabled={pending}
                    onClick={() => void onValidateIxbrl()}
                  >
                    Run demo iXBRL validation
                  </button>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {tab === "export" ? (
          <div>
            <p className={styles.workspaceCheckMeta} style={{ margin: "0 0 0.75rem" }}>
              Demo HTML download only — not submission-grade.
            </p>
            <div className={styles.workspaceExportActions}>
              {canExport ? (
                <a
                  className={styles.workflowAutoRunBtn}
                  href={`/api/edgar/${versionId}`}
                  download
                >
                  Download HTML
                </a>
              ) : (
                <span className={styles.workflowViewerBanner}>
                  Reviewer/admin —{" "}
                  <a href="/compliance" className={styles.inlineLink}>
                    Compliance
                  </a>
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
