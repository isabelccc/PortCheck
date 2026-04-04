"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  approveDocumentVersion,
  rejectDocumentVersion,
  reopenRejectedVersion,
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

type RedlinePart = { type: "add" | "remove" | "same"; value: string };

type Tab = "content" | "redline" | "checklist" | "ixbrl" | "export";

type RedlineBaselineMode = "parent" | "previous" | "none";

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
  const [tab, setTab] = useState<Tab>("content");
  const [content, setContent] = useState(initialContent);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [approveNote, setApproveNote] = useState("");
  const [rejectNote, setRejectNote] = useState("");

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const canChecklist = canMutateChecklist(demoRole);
  const canExport = canExportFiling(demoRole);
  const canApprove = canApproveDocumentVersion(demoRole);
  const canReject = canRejectDocumentVersion(demoRole);
  const canReopen = canReopenRejectedVersion(demoRole);

  const requiredOpen = useMemo(() => {
    return checklist.filter((c) => c.required && !c.completedAt);
  }, [checklist]);

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
    setMsg(null);
    startTransition(async () => {
      const res = await toggleChecklistItem({
        itemId,
        completed,
        actorId: "reviewer@demo.local",
        evidenceNote: completed ? DEFAULT_EVIDENCE_REQUIRED : null,
      });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      router.refresh();
    });
  }

  async function onSaveContent() {
    setMsg(null);
    startTransition(async () => {
      try {
        const res = await updateVersionDraftContent({
          versionId,
          content,
          actorId: "reviewer@demo.local",
        });
        if (!res.ok) {
          setMsg(res.error);
          return;
        }
        setMsg("Draft body saved.");
        router.refresh();
      } catch (e) {
        const message = e instanceof Error ? e.message : "Save failed";
        setMsg(message);
      }
    });
  }

  async function onSubmitForApproval() {
    setMsg(null);
    startTransition(async () => {
      const res = await submitVersionForApproval({
        versionId,
        actorId: "reviewer@demo.local",
      });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      if ("alreadyInReview" in res && res.alreadyInReview) {
        setMsg("This version is already in review.");
      } else {
        setMsg("Submitted for review — document version status is now in_review.");
      }
      router.refresh();
    });
  }

  async function onValidateIxbrl() {
    setMsg(null);
    startTransition(async () => {
      const res = await validateIxbrlDraftsForVersion(versionId);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      if (!res.allValid) {
        setMsg(
          "Some facts failed demo validation — fix QName/value issues and re-run.",
        );
      } else {
        setMsg("All draft facts passed demo validation; checklist updated if applicable.");
      }
      router.refresh();
    });
  }

  async function onApproveVersion() {
    setMsg(null);
    startTransition(async () => {
      const res = await approveDocumentVersion({
        versionId,
        actorId: "admin@demo.local",
        rationale: approveNote,
      });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setApproveNote("");
      setMsg("Version approved — status is now approved (formal sign-off recorded).");
      router.refresh();
    });
  }

  async function onRejectVersion() {
    setMsg(null);
    startTransition(async () => {
      const res = await rejectDocumentVersion({
        versionId,
        actorId: "reviewer@demo.local",
        rationale: rejectNote,
      });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setRejectNote("");
      setMsg("Version rejected — moved to rejected until reopened as draft.");
      router.refresh();
    });
  }

  async function onReopenRejected() {
    setMsg(null);
    startTransition(async () => {
      const res = await reopenRejectedVersion({
        versionId,
        actorId: "reviewer@demo.local",
      });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setMsg("Reopened as draft — you may edit and resubmit for review.");
      router.refresh();
    });
  }

  return (
    <div>
      <p className={styles.workspaceDisclaimer}>
        <strong>Demo scope.</strong> This workspace illustrates filing QA, redlines,
        checklist discipline, and a stub iXBRL / EDGAR-style export. It is{" "}
        <strong>not</strong> SEC EDGAR Live, not legal advice, and not submission-grade
        Inline XBRL.
      </p>

      <div
        className={styles.workflowProgressSection}
        style={{ marginBottom: "1rem" }}
        aria-label="Process control and gates"
      >
        <div className={styles.workflowProgressHeader}>
          <div>
            <h2 className={styles.workflowProgressTitle} style={{ fontSize: "1rem" }}>
              QA gates &amp; approvals
            </h2>
            <p className={styles.workflowPanelHint} style={{ margin: "0.25rem 0 0" }}>
              Required checklist + workflow final step must pass before{" "}
              <strong>admin</strong> document sign-off. Line reviewers can{" "}
              <strong>reject</strong> back from queue.
            </p>
          </div>
          <div className={styles.workflowProgressFraction}>
            <span className={styles.workflowProgressBig}>
              {approvalReadiness.requiredDone}/{approvalReadiness.requiredTotal || "—"}
            </span>
            <span className={styles.workflowProgressSmall}>required QA done</span>
          </div>
        </div>
        <div
          className={styles.workspaceQaBarTrack}
          role="progressbar"
          aria-valuenow={approvalReadiness.checklistProgressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={styles.workspaceQaBarFill}
            style={{
              width: `${approvalReadiness.requiredTotal === 0 ? 0 : approvalReadiness.checklistProgressPct}%`,
            }}
          />
        </div>
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
              "no run on this version"
            )}
          </span>
          <span>
            Status: <strong>{status.replaceAll("_", " ")}</strong>
          </span>
        </div>

        {status === "draft" ? (
          <p className={styles.workflowPanelHint} style={{ marginTop: "0.75rem" }} role="status">
            <strong>Submit</strong> blocked while{" "}
            <strong>{requiredOpen.length}</strong> required checklist item
            {requiredOpen.length !== 1 ? "s" : ""} incomplete.
            {requiredOpen.length === 0
              ? " You may submit for review."
              : " Finish QA tab first."}
          </p>
        ) : null}
        {status === "in_review" ? (
          <p className={styles.workflowPanelHint} style={{ marginTop: "0.75rem" }} role="status">
            In <strong>review queue</strong>. Admin sign-off requires all required QA
            items + workflow <em>final approval</em> complete.
          </p>
        ) : null}
        {status === "rejected" ? (
          <p className={styles.workflowError} style={{ marginTop: "0.75rem" }} role="status">
            <strong>Rejected</strong> — reopen as draft to revise, then resubmit.
          </p>
        ) : null}
        {status === "approved" ? (
          <p className={styles.workflowPanelHint} style={{ marginTop: "0.75rem" }} role="status">
            <strong>Approved</strong> — version locked for editing; audit retains history.
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
                    ? "Complete all required checklist items first."
                    : "draft → in_review"
                }
                onClick={() => void onSubmitForApproval()}
              >
                Submit for approval
              </button>
              <span className={styles.workspaceCheckMeta}>
                Enters review queue · audit event
              </span>
            </>
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
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--pilot-line)" }}>
            <div className={styles.sectionLabel} style={{ marginTop: 0 }}>
              Document decision
            </div>
            {!canReject && !canApprove ? (
              <p className={styles.workflowViewerBanner}>
                Read-only — switch role on{" "}
                <a href="/compliance" className={styles.inlineLink}>
                  Compliance
                </a>
                .
              </p>
            ) : null}
            {canReject ? (
              <div style={{ marginBottom: "0.75rem" }}>
                <label className={styles.workflowEvidenceField}>
                  <span className={styles.workflowEvidenceLabel}>
                    Rejection rationale (reviewer/admin, min 24 chars)
                  </span>
                  <textarea
                    className={styles.workflowEvidenceTextarea}
                    rows={2}
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="e.g. Material cross-reference errors; must correct before supervisory sign-off."
                  />
                </label>
                <button
                  type="button"
                  className={styles.workflowAutoStopBtn}
                  disabled={pending || rejectNote.trim().length < 24}
                  onClick={() => void onRejectVersion()}
                >
                  Reject version
                </button>
              </div>
            ) : null}
            {canApprove ? (
              <div>
                <label className={styles.workflowEvidenceField}>
                  <span className={styles.workflowEvidenceLabel}>
                    Approval attestation (admin only, min 24 chars)
                  </span>
                  <textarea
                    className={styles.workflowEvidenceTextarea}
                    rows={3}
                    value={approveNote}
                    onChange={(e) => setApproveNote(e.target.value)}
                    placeholder="e.g. I attest required QA and workflow final approval are complete; no blockers known."
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
                        ? "Complete final workflow approval on the linked run."
                        : undefined
                  }
                  onClick={() => void onApproveVersion()}
                >
                  Approve version (sign-off)
                </button>
              </div>
            ) : (
              <p className={styles.workflowPanelHint} style={{ marginTop: "0.35rem" }}>
                Formal <strong>Approve version</strong> is restricted to the{" "}
                <strong>admin</strong> role (segregation of duties).
              </p>
            )}
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
            ["content", "Content & edit"],
            ["redline", "Redlines vs parent"],
            ["checklist", "QA checklist"],
            ["ixbrl", "iXBRL drafts"],
            ["export", "EDGAR-style export"],
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

      {msg ? (
        <p className={styles.workflowError} role="alert">
          {msg}
        </p>
      ) : null}

      <div className={styles.workspaceTabPanel} role="tabpanel">
        {tab === "content" ? (
          <div>
            <p className={styles.workflowPanelHint}>
              Document: <strong>{docTitle}</strong> · Version{" "}
              <strong>{versionLabel}</strong> · Status <strong>{status}</strong>
              {runId ? (
                <>
                  {" "}
                  ·{" "}
                  <Link href={`/runs/${runId}`} className={styles.inlineLink}>
                    Workflow run
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
                      Approved versions are locked.
                    </span>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <p className={styles.workflowPanelHint}>
                  <strong>Reviewer</strong> or <strong>admin</strong> can edit body text. Current
                  role: <strong>{demoRole}</strong> (
                  <a href="/compliance" className={styles.inlineLink}>
                    change
                  </a>
                  ).
                </p>
                <pre className={styles.contentBlock}>{initialContent}</pre>
              </>
            )}
          </div>
        ) : null}

        {tab === "redline" ? (
          <div>
            {redlineBaselineMode === "none" ? (
              <p className={styles.workflowPanelHint}>
                No baseline revision — this is the first version on the document (or
                the parent link is missing). Redline below treats the prior text as
                empty (all <strong>additions</strong>). Add{" "}
                <code>parent_version_id</code> or create an older version to
                compare.
              </p>
            ) : null}
            {redlineBaselineMode === "previous" ? (
              <p className={styles.workflowPanelHint}>
                No <code>parent_version_id</code> on this row — comparing to the{" "}
                <strong>previous revision</strong> on file
                {redlineBaselineVersionLabel ? (
                  <>
                    {" "}
                    (<strong>{redlineBaselineVersionLabel}</strong>)
                  </>
                ) : null}
                , ordered by creation time.
              </p>
            ) : null}
            {redlineBaselineMode === "parent" && redlineBaselineVersionLabel ? (
              <p className={styles.workflowPanelHint}>
                Compared to linked parent version{" "}
                <strong>{redlineBaselineVersionLabel}</strong> (
                <code>parent_version_id</code>).
              </p>
            ) : null}
            <div className={styles.workspaceRedline} aria-label="Diff vs baseline">
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
          </div>
        ) : null}

        {tab === "checklist" ? (
          <div>
            <p className={styles.workflowPanelHint}>
              <strong>Blocking discipline:</strong> required rows need an evidence note
              (≥12 chars) when checked. Open items block{" "}
              <strong>Submit for approval</strong> and (with workflow){" "}
              <strong>Final approval</strong> on the DAG.
            </p>
            <div className={styles.workspaceQaCategoryRow} style={{ marginBottom: "0.75rem" }}>
              <span>
                Progress: <strong>{approvalReadiness.requiredDone}</strong> /{" "}
                <strong>{approvalReadiness.requiredTotal}</strong> required
              </span>
              <span>
                {requiredOpen.length === 0 ? (
                  <span style={{ color: "#15803d" }}>Submit unblocked</span>
                ) : (
                  <span style={{ color: "#b45309" }}>
                    {requiredOpen.length} blocker(s)
                  </span>
                )}
              </span>
            </div>
            {!canChecklist ? (
              <p className={styles.workflowViewerBanner}>
                Switch to <strong>reviewer</strong> or <strong>admin</strong> on{" "}
                <a href="/compliance" className={styles.inlineLink}>
                  Compliance
                </a>{" "}
                to change checklist items.
              </p>
            ) : null}
            {checklist.length === 0 ? (
              <p className={styles.empty}>No checklist rows for this version (run db migrate + seed).</p>
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
                          <div>
                            <div>
                              <strong>{c.label}</strong>{" "}
                              <span className={styles.policyCode}>({c.code})</span>{" "}
                              <span className={styles.workspaceCheckMeta}>
                                {c.required ? "required" : "optional"}
                              </span>
                            </div>
                            {c.completedAt ? (
                              <div className={styles.workspaceCheckMeta}>
                                Done {c.completedAt} by {c.completedBy}
                                {c.evidenceNote ? ` — ${c.evidenceNote}` : ""}
                              </div>
                            ) : c.required ? (
                              <div className={styles.workspaceCheckMeta}>
                                Evidence ≥12 chars applied when you check this box.
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
          </div>
        ) : null}

        {tab === "ixbrl" ? (
          <div>
            <p className={styles.workflowPanelHint}>
              Facts for each version live in <code>ixbrl_fact_drafts</code> (one row
              per draft tag). The sample seed only attaches demo rows to{" "}
              <strong>Corgi Innovation ETF → Risk Factors → 2025.04.1</strong>; every
              other version starts with an empty list until you insert rows (e.g. via
              SQL or a future editor).
            </p>
            {facts.length === 0 ? (
              <p className={styles.empty}>
                No draft facts for this version — nothing to validate here yet.
              </p>
            ) : (
              <>
                <p className={styles.workflowPanelHint} style={{ marginTop: "0.5rem" }}>
                  <strong>Demo validator</strong> (button below) checks QName shape
                  (prefix:Local with uppercase local start), non-empty values, and{" "}
                  <code>c-…</code> context ref pattern — not full taxonomy or
                  calculation linkbase rules.
                </p>
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
            <p className={styles.workflowPanelHint}>
              Downloads a single HTML file with exhibit-style framing. Use only for
              demos — production filings use EDGAR Filer Manual workflows and
              certified software.
            </p>
            {status !== "approved" ? (
              <p className={styles.workflowPanelHint}>
                <strong>Controlled disclosure:</strong> this demo still allows export
                while not approved; production would tie download entitlements to
                sign-off state.
              </p>
            ) : null}
            <div className={styles.workspaceExportActions}>
              {canExport ? (
                <a
                  className={styles.workflowAutoRunBtn}
                  href={`/api/edgar/${versionId}`}
                  download
                >
                  Download demo EDGAR-style HTML
                </a>
              ) : (
                <span className={styles.workflowPanelHint}>
                  Export requires <strong>reviewer</strong> or <strong>admin</strong>.
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
