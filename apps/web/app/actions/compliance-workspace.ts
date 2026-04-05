"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  auditEvents,
  db,
  documentVersions,
  ixbrlFactDrafts,
  versionChecklistItems,
} from "@repo/db";
import { and, count, eq, isNull } from "drizzle-orm";
import {
  canApproveDocumentVersion,
  canMutateChecklist,
  canRejectDocumentVersion,
  canReopenRejectedVersion,
} from "../../lib/demo-role-constants";
import { getDemoRole } from "../../lib/demo-role-server";
import { getVersionApprovalReadiness } from "../../lib/version-approval-readiness";

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
        error: `Required checklist items need an evidence note of at least ${minLen} characters (Series B–style attestation).`,
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

  await db.insert(auditEvents).values({
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

export async function submitVersionForApproval(input: {
  versionId: string;
  actorId?: string;
}): Promise<
  | { ok: true }
  | { ok: false; error: string; blockCount?: number }
  | { ok: true; alreadyInReview: true }
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
  if (data.status === "in_review") {
    return { ok: true, alreadyInReview: true };
  }
  if (data.status !== "draft") {
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

  const actor = input.actorId?.trim() || "reviewer@demo.local";

  await db
    .update(documentVersions)
    .set({ status: "in_review" })
    .where(
      and(
        eq(documentVersions.id, input.versionId),
        eq(documentVersions.status, "draft"),
      ),
    );

  await db.insert(auditEvents).values({
    actorId: actor,
    action: "version_submitted_for_approval",
    entityType: "document_version",
    entityId: data.id,
    payload: {
      documentVersionId: data.id,
      documentId: data.documentId,
      priorStatus: "draft",
      newStatus: "in_review",
    },
  });

  const docId = data.documentId;
  revalidatePath(`/documents/${docId}`);
  revalidatePath(`/documents/${docId}/versions/${input.versionId}`);
  revalidatePath("/reviews");
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

  await db.insert(auditEvents).values({
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

  await db.insert(auditEvents).values({
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

  await db.insert(auditEvents).values({
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

    await db
      .update(documentVersions)
      .set({ content })
      .where(eq(documentVersions.id, input.versionId));

    await db.insert(auditEvents).values({
      actorId: actor,
      action: "document_version_content_updated",
      entityType: "document_version",
      entityId: v.id,
      payload: {
        documentVersionId: v.id,
        documentId: v.documentId,
        priorLength: v.content.length,
        newLength: content.length,
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
      await db.insert(auditEvents).values({
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
