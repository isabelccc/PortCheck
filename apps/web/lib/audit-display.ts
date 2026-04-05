/** User-facing labels for audit log (avoid raw DB slugs in the primary column). */
export function auditActionLabel(action: string): string {
  const map: Record<string, string> = {
    document_version_content_updated: "Document body saved",
    checklist_item_updated: "QA checklist changed",
    checklist_item_created: "QA checklist row added",
    checklist_item_deleted: "QA checklist row removed",
    version_submitted_for_approval: "Submitted for review",
    version_approved: "Version approved",
    version_rejected: "Version rejected",
    version_reopened_to_draft: "Reopened as draft",
    step_status_changed: "Workflow step updated",
    workflow_run_started: "Workflow run started",
  };
  return map[action] ?? titleCaseSnake(action);
}

export function auditEntityLabel(entityType: string): string {
  const map: Record<string, string> = {
    document_version: "Document version",
    checklist_item: "Checklist item",
    step_execution: "Workflow step",
    workflow_run: "Workflow run",
  };
  return map[entityType] ?? titleCaseSnake(entityType);
}

function titleCaseSnake(s: string): string {
  return s
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function num(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function str(n: unknown, max = 400): string | null {
  if (typeof n !== "string") return null;
  const t = n.trim();
  if (!t) return null;
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Prior / new body snapshots stored on `document_version_content_updated` for audit diff UI. */
export function getAuditBodyDiffPayload(payload: unknown): {
  prior: string;
  next: string;
  truncatedNote: string | null;
} | null {
  if (!isRecord(payload)) return null;
  const prior = payload.priorBody;
  const next = payload.newBody;
  if (typeof prior !== "string" || typeof next !== "string") return null;
  const pt = payload.priorBodyTruncated === true;
  const nt = payload.newBodyTruncated === true;
  const truncatedNote =
    pt || nt
      ? "Diff uses the first 80k characters of before/after (full text is in the document version row)."
      : null;
  return { prior, next, truncatedNote };
}

export function auditRunIdFromRow(
  action: string,
  entityType: string,
  entityId: string,
  payload: unknown,
): string | null {
  if (!isRecord(payload)) {
    return entityType === "workflow_run" && action === "workflow_run_started"
      ? entityId
      : null;
  }
  const r = payload.runId;
  if (typeof r === "string" && r.length > 0) return r;
  return entityType === "workflow_run" && action === "workflow_run_started"
    ? entityId
    : null;
}

export function auditWorkflowNodeId(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const n = payload.nodeId;
  return typeof n === "string" && n.length > 0 ? n : null;
}

/** One or more short lines for the “Details” column — no raw JSON. */
export function auditPayloadSummary(action: string, payload: unknown): string[] {
  if (!isRecord(payload)) {
    return [];
  }

  const lines: string[] = [];

  switch (action) {
    case "document_version_content_updated": {
      const before = num(payload.priorLength);
      const after = num(payload.newLength);
      if (before !== null && after !== null) {
        const delta = after - before;
        const sign = delta > 0 ? "+" : "";
        lines.push(
          `Text length ${before.toLocaleString()} → ${after.toLocaleString()} characters (${sign}${delta.toLocaleString()}).`,
        );
      } else {
        lines.push("Saved changes to the document body.");
      }
      if (payload.priorBodyTruncated === true || payload.newBodyTruncated === true) {
        lines.push(
          "Redline below may be truncated to the first 80k characters per side (demo cap).",
        );
      } else if (getAuditBodyDiffPayload(payload)) {
        lines.push("Redline below: removed (−) / added (+) vs prior save.");
      }
      break;
    }
    case "checklist_item_updated": {
      const code = str(payload.code, 80);
      const done = payload.completed === true;
      lines.push(done ? "Marked complete." : "Marked not done.");
      if (code) {
        lines.push(`Item: ${code.replaceAll("_", " ")}.`);
      }
      const note = str(payload.evidenceNote, 220);
      if (note) {
        lines.push(`Evidence: ${note}`);
      }
      if (payload.automation === "ixbrl_demo_validate") {
        lines.push("Recorded automatically after iXBRL validation passed.");
      }
      break;
    }
    case "checklist_item_created": {
      const lab = str(payload.label, 200);
      const cat = str(payload.category, 40);
      const req = payload.required === true;
      lines.push(req ? "Required row." : "Optional row.");
      if (lab) {
        lines.push(lab);
      }
      if (cat) {
        lines.push(`Category: ${cat.replaceAll("_", " ")}.`);
      }
      break;
    }
    case "checklist_item_deleted": {
      const lab = str(payload.label, 200);
      lines.push("Removed a user-added checklist row.");
      if (lab) {
        lines.push(lab);
      }
      break;
    }
    case "version_submitted_for_approval":
    case "version_approved":
    case "version_rejected":
    case "version_reopened_to_draft": {
      const from = str(payload.priorStatus, 40);
      const to = str(payload.newStatus, 40);
      if (from && to) {
        lines.push(`Status: ${from.replaceAll("_", " ")} → ${to.replaceAll("_", " ")}.`);
      }
      const rationale = str(payload.rationale, 280);
      if (rationale) {
        lines.push(`Rationale: ${rationale}`);
      }
      break;
    }
    case "step_status_changed": {
      const prev = str(payload.previousStatus, 40);
      const next = str(payload.newStatus, 40);
      const legacy = str((payload as { status?: unknown }).status, 40);
      if (prev && next) {
        lines.push(`Step status: ${prev} → ${next}.`);
      } else if (legacy) {
        lines.push(`Step status: ${legacy}.`);
      }
      const comment = str(payload.comment, 240);
      if (comment) {
        lines.push(`Comment: ${comment}`);
      }
      if (payload.automation === "demo_auto_wave") {
        lines.push("Applied by demo workflow auto-run.");
      }
      break;
    }
    case "workflow_run_started": {
      const tname = str(payload.templateName, 120);
      const trig = str(payload.trigger, 80);
      lines.push(
        tname
          ? `Started run using template “${tname}”.`
          : "A new workflow run was created for this document version.",
      );
      lines.push("Open the linked run to view the DAG.");
      if (trig) {
        lines.push(`Trigger: ${trig.replaceAll("_", " ")}.`);
      }
      break;
    }
    default:
      break;
  }

  return lines;
}
