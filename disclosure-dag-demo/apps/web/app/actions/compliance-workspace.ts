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
import { and, eq } from "drizzle-orm";
import {
  canEditVersionContent,
  canMutateChecklist,
} from "../../lib/demo-role-constants";
import { getDemoRole } from "../../lib/demo-role-server";

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

export async function updateVersionDraftContent(input: {
  versionId: string;
  content: string;
  actorId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const role = await getDemoRole();
  if (!canEditVersionContent(role)) {
    return { ok: false, error: "Only admin can edit version body in this demo." };
  }

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

  const actor = input.actorId.trim() || "admin@demo.local";
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
