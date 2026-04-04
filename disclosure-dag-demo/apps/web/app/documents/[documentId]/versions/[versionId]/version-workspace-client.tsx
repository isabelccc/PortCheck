"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  toggleChecklistItem,
  updateVersionDraftContent,
  validateIxbrlDraftsForVersion,
} from "../../../../actions/compliance-workspace";
import {
  canEditVersionContent,
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
  redline: RedlinePart[] | null;
  hasParent: boolean;
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
  hasParent,
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
  const canEdit = canEditVersionContent(demoRole);
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
      const res = await updateVersionDraftContent({
        versionId,
        content,
        actorId: "admin@demo.local",
      });
      if (!res.ok) {
        setMsg(res.error);
        return;
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
            {canEdit ? (
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
                  <strong>Admin</strong> role can edit body text. Current role:{" "}
                  <strong>{demoRole}</strong> (
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
            {!hasParent || !redline ? (
              <p className={styles.workflowPanelHint}>
                No parent version — redline compares the current body to an empty
                baseline, or open a version that has{" "}
                <code>parent_version_id</code> set.
              </p>
            ) : null}
            <div className={styles.workspaceRedline} aria-label="Diff vs parent">
              {(redline ?? []).map((p, i) => (
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
              Draft facts stored in <code>ixbrl_fact_drafts</code>. Demo validator
              checks QName shape, non-empty values, and context ref pattern — not
              full taxonomy / calculation linkbase rules.
            </p>
            {facts.length === 0 ? (
              <p className={styles.empty}>No draft facts for this version.</p>
            ) : (
              <>
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
