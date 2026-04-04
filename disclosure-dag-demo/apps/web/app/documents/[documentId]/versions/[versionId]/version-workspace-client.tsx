"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  submitVersionForApproval,
  toggleChecklistItem,
  updateVersionDraftContent,
  validateIxbrlDraftsForVersion,
} from "../../../../actions/compliance-workspace";
import {
  canExportFiling,
  canMutateChecklist,
  type DemoRole,
} from "../../../../../lib/demo-role-constants";
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
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("content");
  const [content, setContent] = useState(initialContent);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const canChecklist = canMutateChecklist(demoRole);
  const canExport = canExportFiling(demoRole);

  const requiredOpen = useMemo(() => {
    return checklist.filter((c) => c.required && !c.completedAt);
  }, [checklist]);

  async function onToggleCheck(itemId: string, completed: boolean) {
    setMsg(null);
    startTransition(async () => {
      const res = await toggleChecklistItem({
        itemId,
        completed,
        actorId: "reviewer@demo.local",
        evidenceNote: completed ? "Acknowledged in QA workspace" : null,
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

  return (
    <div>
      <p className={styles.workspaceDisclaimer}>
        <strong>Demo scope.</strong> This workspace illustrates filing QA, redlines,
        checklist discipline, and a stub iXBRL / EDGAR-style export. It is{" "}
        <strong>not</strong> SEC EDGAR Live, not legal advice, and not submission-grade
        Inline XBRL.
      </p>

      <div
        className={styles.workflowAutoRow}
        style={{ marginBottom: "1rem", flexDirection: "column", alignItems: "stretch" }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
          <strong style={{ fontSize: "0.85rem" }}>Process control</strong>
          {status === "draft" ? (
            <span
              className={styles.workflowPanelHint}
              style={{ margin: 0 }}
              role="status"
            >
              Blocking:{" "}
              <strong>
                {requiredOpen.length} required checklist item
                {requiredOpen.length !== 1 ? "s" : ""} incomplete
              </strong>
              {requiredOpen.length === 0 ? (
                <> — you may submit for review.</>
              ) : (
                <> — complete them before submitting.</>
              )}
            </span>
          ) : null}
          {status === "in_review" ? (
            <span className={styles.workflowPanelHint} style={{ margin: 0 }} role="status">
              Status <strong>in review</strong>. Checklist changes and workflow run still apply.
            </span>
          ) : null}
          {status === "approved" ? (
            <span className={styles.workflowPanelHint} style={{ margin: 0 }} role="status">
              Version is <strong>approved</strong>.
            </span>
          ) : null}
        </div>
        {status === "draft" && canChecklist ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
            <button
              type="button"
              className={styles.workflowAutoRunBtn}
              disabled={pending || requiredOpen.length > 0}
              title={
                requiredOpen.length > 0
                  ? "Complete all required checklist items first."
                  : "Sets document version status to in_review (server-enforced)."
              }
              onClick={() => void onSubmitForApproval()}
            >
              Submit for approval
            </button>
            <span className={styles.workspaceCheckMeta}>
              Moves version from <code>draft</code> → <code>in_review</code> and writes an audit event.
            </span>
          </div>
        ) : null}
        {status === "draft" && !canChecklist ? (
          <p className={styles.workflowViewerBanner} style={{ margin: 0 }} role="status">
            Switch to <strong>reviewer</strong> or <strong>admin</strong> on{" "}
            <a href="/compliance" className={styles.inlineLink}>
              Compliance
            </a>{" "}
            to submit for approval.
          </p>
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
              Required items still open:{" "}
              <strong>{requiredOpen.length}</strong>. Toggling writes{" "}
              <code>audit_events</code> with evidence notes (demo).
            </p>
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
              <ul className={styles.workspaceChecklist}>
                {checklist.map((c) => (
                  <li key={c.id} className={styles.workspaceCheckRow}>
                    <input
                      type="checkbox"
                      checked={!!c.completedAt}
                      disabled={!canChecklist || pending}
                      onChange={(e) => void onToggleCheck(c.id, e.target.checked)}
                      aria-label={c.label}
                    />
                    <div>
                      <div>
                        <strong>{c.label}</strong>{" "}
                        <span className={styles.policyCode}>({c.code})</span>{" "}
                        <span className={styles.workspaceCheckMeta}>
                          {c.category}
                          {c.required ? " · required" : ""}
                        </span>
                      </div>
                      {c.completedAt ? (
                        <div className={styles.workspaceCheckMeta}>
                          Done {c.completedAt} by {c.completedBy}
                          {c.evidenceNote ? ` — ${c.evidenceNote}` : ""}
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
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
