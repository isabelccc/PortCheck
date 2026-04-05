"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  appendAuditEvent,
  db,
  documentVersions,
  ixbrlFactDrafts,
  versionChecklistItems,
  workflowRuns,
} from "@repo/db";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  canApproveDocumentVersion,
  canMutateChecklist,
  canRejectDocumentVersion,
  canReopenRejectedVersion,
} from "../../lib/demo-role-constants";
import { getDemoRole } from "../../lib/demo-role-server";
import {
  insertWorkflowRunWithSteps,
  purgeWorkflowRunsForVersion,
} from "../../lib/workflow-run-for-version";
import { getVersionApprovalReadiness } from "../../lib/version-approval-readiness";
import { loadSystemValidationForVersion } from "../../lib/version-system-validation";

const ROLE_COOKIE = "demo_role";

export async function submitDemoRoleForm(
  formData: FormData,
): Promise<void> {
  const role = String(formData.get("role") ?? "");
  await setDemoRole(role);
}

export async function setDemoRole(role: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = role.trim().toLowerCase();
  if (r !== "viewer" && r !== "reviewer" && r !== "admin") {
    return { ok: false, error: "Invalid role" };
  }
  (await cookies()).set(ROLE_COOKIE, r, {
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
    sameSite: "lax",
  });
  revalidatePath("/compliance");
  revalidatePath("/reviews");
  revalidatePath("/documents");
  revalidatePath("/runs");
  return { ok: true };
}

export async function toggleChecklistItem(input: {
  itemId: string;
  completed: boolean;
  actorId: string;
  evidenceNote: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const role = await getDemoRole();
  if (!canMutateChecklist(role)) {
    return { ok: false, error: "Viewer role cannot change checklists." };
  }

  const [row] = await db
    .select({
      item: versionChecklistItems,
      documentId: documentVersions.documentId,
    })
    .from(versionChecklistItems)
    .innerJoin(
      documentVersions,
      eq(documentVersions.id, versionChecklistItems.documentVersionId),
    )
    .where(eq(versionChecklistItems.id, input.itemId))
    .limit(1);
  if (!row) {
    return { ok: false, error: "Checklist item not found" };
  }

  const actor = input.actorId.trim() || "reviewer@demo.local";
  const note = input.evidenceNote?.trim() || null;

  if (input.completed && row.item.required) {
    const minLen = 12;
    if (!note || note.length < minLen) {
      return {
        ok: false,
        error: `Required checklist items need an evidence note of at least ${minLen} characters (attestation for audit trail).`,
      };
    }
  }

  await db
    .update(versionChecklistItems)
    .set({
      completedAt: input.completed ? new Date() : null,
      completedBy: input.completed ? actor : null,
      evidenceNote: input.completed ? note : null,
    })
    .where(eq(versionChecklistItems.id, row.item.id));

  await appendAuditEvent({
    actorId: actor,
    action: "checklist_item_updated",
    entityType: "checklist_item",
    entityId: row.item.id,
    payload: {
      documentVersionId: row.item.documentVersionId,
      code: row.item.code,
      completed: input.completed,
      evidenceNote: note,
    },
  });

  revalidatePath(
    `/documents/${row.documentId}/versions/${row.item.documentVersionId}`,
  );
  revalidatePath("/audit");
  revalidatePath("/reviews");
  return { ok: true };
}

const CHECKLIST_CATEGORIES = [
  "qa_content",
  "ixbrl",
  "edgar_pack",
  "sec_control",
] as const;

/** Prefix for rows created via the workspace UI (removable while incomplete). */
const USER_CHECKLIST_CODE_PREFIX = "user_";

export async function addChecklistItem(input: {
  versionId: string;
  label: string;
  category: string;
  required: boolean;
  actorId?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const role = await getDemoRole();
  if (!canMutateChecklist(role)) {
    return { ok: false, error: "Viewer role cannot edit checklists." };
  }

  const label = input.label.trim();
  if (label.length < 3) {
    return { ok: false, error: "Label must be at least 3 characters." };
  }
  if (label.length > 600) {
    return { ok: false, error: "Label is too long (max 600 characters)." };
  }

  const cat = input.category.trim();
  if (!CHECKLIST_CATEGORIES.includes(cat as (typeof CHECKLIST_CATEGORIES)[number])) {
    return { ok: false, error: "Invalid checklist category." };
  }

  const [ver] = await db
    .select({
      id: documentVersions.id,
      documentId: documentVersions.documentId,
      status: documentVersions.status,
    })
    .from(documentVersions)
    .where(eq(documentVersions.id, input.versionId))
    .limit(1);
  if (!ver) {
    return { ok: false, error: "Version not found." };
  }
  if (ver.status === "approved") {
    return { ok: false, error: "Cannot add checklist rows to an approved version." };
  }

  const [agg] = await db
    .select({
      maxSort: sql<number>`coalesce(max(${versionChecklistItems.sortOrder}), 0)`,
    })
    .from(versionChecklistItems)
    .where(eq(versionChecklistItems.documentVersionId, input.versionId));

  const nextOrder = Number(agg?.maxSort ?? 0) + 1;
  const code = `${USER_CHECKLIST_CODE_PREFIX}${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const id = randomUUID();
  const actor = input.actorId?.trim() || "reviewer@demo.local";

  await db.insert(versionChecklistItems).values({
    id,
    documentVersionId: input.versionId,
    sortOrder: nextOrder,
    code,
    label,
    category: cat,
    required: input.required,
    completedAt: null,
    completedBy: null,
    evidenceNote: null,
  });

  await appendAuditEvent({
    actorId: actor,
    action: "checklist_item_created",
    entityType: "checklist_item",
    entityId: id,
    payload: {
      documentVersionId: input.versionId,
      code,
      label,
      category: cat,
      required: input.required,
    },
  });

  revalidatePath(`/documents/${ver.documentId}/versions/${input.versionId}`);
  revalidatePath("/audit");
  revalidatePath("/reviews");
  return { ok: true, id };
}

export async function removeUserChecklistItem(input: {
  itemId: string;
  actorId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const role = await getDemoRole();
  if (!canMutateChecklist(role)) {
    return { ok: false, error: "Viewer role cannot edit checklists." };
  }

  const [row] = await db
    .select({
      item: versionChecklistItems,
      documentId: documentVersions.documentId,
      status: documentVersions.status,
    })
    .from(versionChecklistItems)
    .innerJoin(
      documentVersions,
      eq(documentVersions.id, versionChecklistItems.documentVersionId),
    )
    .where(eq(versionChecklistItems.id, input.itemId))
    .limit(1);

  if (!row) {
    return { ok: false, error: "Checklist item not found." };
  }
  if (row.status === "approved") {
    return { ok: false, error: "Cannot remove rows from an approved version." };
  }
  if (row.item.completedAt) {
    return { ok: false, error: "Uncheck the item before removing it." };
  }
  if (!row.item.code.startsWith(USER_CHECKLIST_CODE_PREFIX)) {
    return {
      ok: false,
      error: "Only checklist rows you added from this workspace can be removed.",
    };
  }

  const actor = input.actorId?.trim() || "reviewer@demo.local";

  await db
    .delete(versionChecklistItems)
    .where(eq(versionChecklistItems.id, row.item.id));

  await appendAuditEvent({
    actorId: actor,
    action: "checklist_item_deleted",
    entityType: "checklist_item",
    entityId: row.item.id,
    payload: {
      documentVersionId: row.item.documentVersionId,
      code: row.item.code,
      label: row.item.label,
    },
  });

  revalidatePath(
    `/documents/${row.documentId}/versions/${row.item.documentVersionId}`,
  );
  revalidatePath("/audit");
  revalidatePath("/reviews");
  return { ok: true };
}

export async function submitVersionForApproval(input: {
  versionId: string;
  actorId?: string;
}): Promise<
  | { ok: true }
  | { ok: false; error: string; blockCount?: number }
  | { ok: true; alreadyInReview: true; workflowStarted?: boolean }
> {
  const role = await getDemoRole();
  if (!canMutateChecklist(role)) {
    return {
      ok: false,
      error: "Viewer role cannot submit for approval.",
    };
  }

  const [data] = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.id, input.versionId))
    .limit(1);
  if (!data) {
    return { ok: false, error: "Version not found" };
  }
  if (data.status === "approved") {
    return { ok: false, error: "Cannot submit an already approved version." };
  }
  if (data.status === "rejected") {
    return {
      ok: false,
      error:
        "This version was rejected — use “Reopen as draft” in the QA workspace, then fix and resubmit.",
    };
  }
  if (data.status !== "draft" && data.status !== "in_review") {
    return { ok: false, error: `Cannot submit from status ${data.status}.` };
  }

  const [row] = await db
    .select({ n: count() })
    .from(versionChecklistItems)
    .where(
      and(
        eq(versionChecklistItems.documentVersionId, input.versionId),
        eq(versionChecklistItems.required, true),
        isNull(versionChecklistItems.completedAt),
      ),
    );
  const blockCount = Number(row?.n ?? 0);
  if (blockCount > 0) {
    return {
      ok: false,
      error: `Complete all ${blockCount} required checklist item(s) before submitting.`,
      blockCount,
    };
  }

  const systemValidation = await loadSystemValidationForVersion(input.versionId);
  if (systemValidation && !systemValidation.ok) {
    const failed = systemValidation.checks
      .filter((c) => !c.ok)
      .map((c) => (c.detail ? `${c.label}: ${c.detail}` : c.label));
    return {
      ok: false,
      error: `System validation failed — ${failed.join(" · ")}`,
    };
  }

  const actor = input.actorId?.trim() || "reviewer@demo.local";

  /** Legacy rows: already in_review but no workflow run — create run + steps only. */
  if (data.status === "in_review") {
    const [existingRun] = await db
      .select({ id: workflowRuns.id })
      .from(workflowRuns)
      .where(eq(workflowRuns.documentVersionId, input.versionId))
      .limit(1);
    if (existingRun) {
      return { ok: true, alreadyInReview: true };
    }

    let wfMeta: { runId: string; templateId: string; templateName: string };
    try {
      wfMeta = await db.transaction(async (tx) => {
        const ins = await insertWorkflowRunWithSteps(tx, {
          versionId: input.versionId,
          actorId: actor,
        });
        if (!ins.ok) {
          throw new Error(ins.error);
        }
        return {
          runId: ins.runId,
          templateId: ins.templateId,
          templateName: ins.templateName,
        };
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start workflow run";
      return { ok: false, error: msg };
    }

    await appendAuditEvent({
      actorId: actor,
      action: "workflow_run_started",
      entityType: "workflow_run",
      entityId: wfMeta.runId,
      payload: {
        templateId: wfMeta.templateId,
        templateName: wfMeta.templateName,
        documentVersionId: input.versionId,
        trigger: "heal_in_review_without_run",
      },
    });

    const docId = data.documentId;
    revalidatePath(`/documents/${docId}`);
    revalidatePath(`/documents/${docId}/versions/${input.versionId}`);
    revalidatePath("/reviews");
    revalidatePath("/runs");
    revalidatePath(`/runs/${wfMeta.runId}`);
    revalidatePath("/audit");
    return {
      ok: true,
      alreadyInReview: true,
      workflowStarted: true,
    };
  }

  let wfMeta: { runId: string; templateId: string; templateName: string };
  try {
    wfMeta = await db.transaction(async (tx) => {
      await purgeWorkflowRunsForVersion(tx, data.id);

      const updated = await tx
        .update(documentVersions)
        .set({ status: "in_review" })
        .where(
          and(
            eq(documentVersions.id, input.versionId),
            eq(documentVersions.status, "draft"),
          ),
        )
        .returning({ id: documentVersions.id });

      if (updated.length === 0) {
        throw new Error("Version is no longer in draft — refresh and retry.");
      }

      const ins = await insertWorkflowRunWithSteps(tx, {
        versionId: data.id,
        actorId: actor,
      });
      if (!ins.ok) {
        throw new Error(ins.error);
      }
      return {
        runId: ins.runId,
        templateId: ins.templateId,
        templateName: ins.templateName,
      };
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Submit failed";
    return { ok: false, error: msg };
  }

  await appendAuditEvent({
    actorId: actor,
    action: "version_submitted_for_approval",
    entityType: "document_version",
    entityId: data.id,
    payload: {
      documentVersionId: data.id,
      documentId: data.documentId,
      priorStatus: "draft",
      newStatus: "in_review",
      workflowRunId: wfMeta.runId,
    },
  });

  await appendAuditEvent({
    actorId: actor,
    action: "workflow_run_started",
    entityType: "workflow_run",
    entityId: wfMeta.runId,
    payload: {
      templateId: wfMeta.templateId,
      templateName: wfMeta.templateName,
      documentVersionId: data.id,
      trigger: "submit_for_review",
    },
  });

  const docId = data.documentId;
  revalidatePath(`/documents/${docId}`);
  revalidatePath(`/documents/${docId}/versions/${input.versionId}`);
  revalidatePath("/reviews");
  revalidatePath("/runs");
  revalidatePath(`/runs/${wfMeta.runId}`);
  revalidatePath("/audit");
  return { ok: true };
}

const MIN_SIGNOFF_NOTE = 24;

export async function approveDocumentVersion(input: {
  versionId: string;
  actorId?: string;
  rationale: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const role = await getDemoRole();
  if (!canApproveDocumentVersion(role)) {
    return {
      ok: false,
      error:
        "Only the admin role may record formal document approval (demo segregation of duties).",
    };
  }

  const rationale = input.rationale.trim();
  if (rationale.length < MIN_SIGNOFF_NOTE) {
    return {
      ok: false,
      error: `Approval rationale must be at least ${MIN_SIGNOFF_NOTE} characters.`,
    };
  }

  const [v] = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.id, input.versionId))
    .limit(1);
  if (!v) {
    return { ok: false, error: "Version not found" };
  }
  if (v.status !== "in_review") {
    return {
      ok: false,
      error: "Only versions in_review can be approved.",
    };
  }

  const readiness = await getVersionApprovalReadiness(input.versionId);
  if (readiness.requiredOpen > 0) {
    return {
      ok: false,
      error: `Approval blocked: ${readiness.requiredOpen} required checklist item(s) still open.`,
    };
  }
  if (readiness.runId && !readiness.finalApprovalComplete) {
    return {
      ok: false,
      error: `Approval blocked: complete workflow step “${readiness.finalApprovalLabel ?? "Final approval"}” on the linked run before document sign-off.`,
    };
  }

  const systemValidation = await loadSystemValidationForVersion(input.versionId);
  if (systemValidation && !systemValidation.ok) {
    const failed = systemValidation.checks
      .filter((c) => !c.ok)
      .map((c) => (c.detail ? `${c.label}: ${c.detail}` : c.label));
    return {
      ok: false,
      error: `Approval blocked: system validation — ${failed.join(" · ")}`,
    };
  }

  const actor = input.actorId?.trim() || "admin@demo.local";

  const updated = await db
    .update(documentVersions)
    .set({ status: "approved" })
    .where(
      and(
        eq(documentVersions.id, input.versionId),
        eq(documentVersions.status, "in_review"),
      ),
    )
    .returning({ id: documentVersions.id });

  if (updated.length === 0) {
    return { ok: false, error: "Version state changed — refresh and retry." };
  }

  await appendAuditEvent({
    actorId: actor,
    action: "version_approved",
    entityType: "document_version",
    entityId: v.id,
    payload: {
      documentVersionId: v.id,
      documentId: v.documentId,
      priorStatus: "in_review",
      newStatus: "approved",
      rationale,
    },
  });

  revalidatePath(`/documents/${v.documentId}`);
  revalidatePath(`/documents/${v.documentId}/versions/${input.versionId}`);
  revalidatePath("/reviews");
  revalidatePath("/runs");
  revalidatePath("/audit");
  return { ok: true };
}

export async function rejectDocumentVersion(input: {
  versionId: string;
  actorId?: string;
  rationale: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const role = await getDemoRole();
  if (!canRejectDocumentVersion(role)) {
    return { ok: false, error: "Viewer cannot reject a version." };
  }

  const rationale = input.rationale.trim();
  if (rationale.length < MIN_SIGNOFF_NOTE) {
    return {
      ok: false,
      error: `Rejection rationale must be at least ${MIN_SIGNOFF_NOTE} characters.`,
    };
  }

  const [v] = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.id, input.versionId))
    .limit(1);
  if (!v) {
    return { ok: false, error: "Version not found" };
  }
  if (v.status !== "in_review") {
    return { ok: false, error: "Only versions in_review can be rejected." };
  }

  const actor = input.actorId?.trim() || "reviewer@demo.local";

  const updated = await db
    .update(documentVersions)
    .set({ status: "rejected" })
    .where(
      and(
        eq(documentVersions.id, input.versionId),
        eq(documentVersions.status, "in_review"),
      ),
    )
    .returning({ id: documentVersions.id });

  if (updated.length === 0) {
    return { ok: false, error: "Version state changed — refresh and retry." };
  }

  await appendAuditEvent({
    actorId: actor,
    action: "version_rejected",
    entityType: "document_version",
    entityId: v.id,
    payload: {
      documentVersionId: v.id,
      documentId: v.documentId,
      priorStatus: "in_review",
      newStatus: "rejected",
      rationale,
    },
  });

  revalidatePath(`/documents/${v.documentId}`);
  revalidatePath(`/documents/${v.documentId}/versions/${input.versionId}`);
  revalidatePath("/reviews");
  revalidatePath("/audit");
  return { ok: true };
}

export async function reopenRejectedVersion(input: {
  versionId: string;
  actorId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const role = await getDemoRole();
  if (!canReopenRejectedVersion(role)) {
    return { ok: false, error: "Viewer cannot reopen a rejected version." };
  }

  const [v] = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.id, input.versionId))
    .limit(1);
  if (!v) {
    return { ok: false, error: "Version not found" };
  }
  if (v.status !== "rejected") {
    return { ok: false, error: "Only rejected versions can be reopened as draft." };
  }

  const actor = input.actorId?.trim() || "reviewer@demo.local";

  const updated = await db
    .update(documentVersions)
    .set({ status: "draft" })
    .where(
      and(
        eq(documentVersions.id, input.versionId),
        eq(documentVersions.status, "rejected"),
      ),
    )
    .returning({ id: documentVersions.id });

  if (updated.length === 0) {
    return { ok: false, error: "Version state changed — refresh and retry." };
  }

  await appendAuditEvent({
    actorId: actor,
    action: "version_reopened_to_draft",
    entityType: "document_version",
    entityId: v.id,
    payload: {
      documentVersionId: v.id,
      documentId: v.documentId,
      priorStatus: "rejected",
      newStatus: "draft",
    },
  });

  revalidatePath(`/documents/${v.documentId}`);
  revalidatePath(`/documents/${v.documentId}/versions/${input.versionId}`);
  revalidatePath("/reviews");
  revalidatePath("/audit");
  return { ok: true };
}

export async function updateVersionDraftContent(input: {
  versionId: string;
  content: string;
  actorId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const role = await getDemoRole();
  if (!canMutateChecklist(role)) {
    return {
      ok: false,
      error: "Viewer role cannot edit the version body. Switch to reviewer or admin.",
    };
  }

  try {
    const [v] = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.id, input.versionId))
      .limit(1);
    if (!v) {
      return { ok: false, error: "Version not found" };
    }
    if (v.status === "approved") {
      return { ok: false, error: "Cannot edit approved versions." };
    }

    const actor = input.actorId.trim() || "reviewer@demo.local";
    const content = input.content;

    /** Cap stored bodies so audit JSONB + hash input stay bounded (demo). */
    const AUDIT_BODY_CAP = 80_000;
    const priorBody =
      v.content.length > AUDIT_BODY_CAP ? v.content.slice(0, AUDIT_BODY_CAP) : v.content;
    const newBody =
      content.length > AUDIT_BODY_CAP ? content.slice(0, AUDIT_BODY_CAP) : content;

    await db
      .update(documentVersions)
      .set({
        content,
        /** Enables redline vs prior save when there is no parent / older sibling version. */
        redlineAnchorContent: v.content,
      })
      .where(eq(documentVersions.id, input.versionId));

    await appendAuditEvent({
      actorId: actor,
      action: "document_version_content_updated",
      entityType: "document_version",
      entityId: v.id,
      payload: {
        documentVersionId: v.id,
        documentId: v.documentId,
        priorLength: v.content.length,
        newLength: content.length,
        priorBody,
        newBody,
        priorBodyTruncated: v.content.length > AUDIT_BODY_CAP,
        newBodyTruncated: content.length > AUDIT_BODY_CAP,
      },
    });

    const docId = v.documentId;
    revalidatePath(`/documents/${docId}`);
    revalidatePath(`/documents/${docId}/versions/${input.versionId}`);
    revalidatePath("/audit");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Save failed";
    return { ok: false, error: message };
  }
}

const QNAME_RE = /^[a-z][a-z0-9_-]*:[A-Z][a-zA-Z0-9._-]*$/;

export async function validateIxbrlDraftsForVersion(versionId: string): Promise<
  | { ok: true; allValid: boolean; results: { id: string; ok: boolean; message: string }[] }
  | { ok: false; error: string }
> {
  const role = await getDemoRole();
  if (!canMutateChecklist(role)) {
    return { ok: false, error: "Viewer role cannot run iXBRL validation." };
  }

  const facts = await db
    .select()
    .from(ixbrlFactDrafts)
    .where(eq(ixbrlFactDrafts.documentVersionId, versionId));

  const results: { id: string; ok: boolean; message: string }[] = [];

  for (const f of facts) {
    let ok = true;
    let message = "OK (demo rules)";
    if (!QNAME_RE.test(f.conceptQname)) {
      ok = false;
      message = "Invalid concept QName for Inline XBRL (demo XSD-style check).";
    }
    if (!f.factValue.trim()) {
      ok = false;
      message = "Empty fact value.";
    }
    if (f.contextRef && !/^c-[a-zA-Z0-9_-]+$/.test(f.contextRef)) {
      ok = false;
      message = "Context ref should match c-* pattern (demo).";
    }

    await db
      .update(ixbrlFactDrafts)
      .set({
        validatedOk: ok,
        validationMessage: message,
      })
      .where(eq(ixbrlFactDrafts.id, f.id));

    results.push({ id: f.id, ok, message });
  }

  const allValid = results.length > 0 && results.every((r) => r.ok);

  if (allValid) {
    const [ixItem] = await db
      .select()
      .from(versionChecklistItems)
      .where(
        and(
          eq(versionChecklistItems.documentVersionId, versionId),
          eq(versionChecklistItems.code, "ixbrl_validate"),
        ),
      )
      .limit(1);
    if (ixItem && !ixItem.completedAt) {
      await db
        .update(versionChecklistItems)
        .set({
          completedAt: new Date(),
          completedBy: "ixbrl-validator@demo.local",
          evidenceNote: "Auto-checked when all draft facts passed demo validation.",
        })
        .where(eq(versionChecklistItems.id, ixItem.id));
      await appendAuditEvent({
        actorId: "ixbrl-validator@demo.local",
        action: "checklist_item_updated",
        entityType: "checklist_item",
        entityId: ixItem.id,
        payload: {
          documentVersionId: versionId,
          code: ixItem.code,
          completed: true,
          automation: "ixbrl_demo_validate",
        },
      });
    }
  }

  const [doc] = await db
    .select({ documentId: documentVersions.documentId })
    .from(documentVersions)
    .where(eq(documentVersions.id, versionId))
    .limit(1);
  if (doc) {
    revalidatePath(`/documents/${doc.documentId}/versions/${versionId}`);
  }
  revalidatePath("/audit");
  return { ok: true, allValid, results };
}
