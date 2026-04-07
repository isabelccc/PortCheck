import { createHash } from "node:crypto";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../client/db-client";
import { auditEvents } from "../schema/workflow";

/** Advisory lock id — serializes hash-chain appends across connections. */
const AUDIT_CHAIN_LOCK_KEY = 5849271;

export type AppendAuditInput = {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  /** Optional fixed id (e.g. seed reproducibility). */
  id?: string;
  /** Must match stored `created_at` for verification; defaults to `new Date()`. */
  createdAt?: Date;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

/** Deterministic SHA-256 for one audit row in the append-only chain. */
export function computeAuditRecordHash(
  prevRecordHash: string | null,
  fields: {
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    payload: Record<string, unknown>;
    createdAt: Date;
  },
): string {
  const prev = prevRecordHash ?? "GENESIS";
  const pipe = [
    prev,
    fields.actorId,
    fields.action,
    fields.entityType,
    fields.entityId,
    stableStringify(fields.payload),
    fields.createdAt.toISOString(),
  ].join("|");
  return createHash("sha256").update(pipe, "utf8").digest("hex");
}

/**
 * Append one audit row with hash-chain fields. Uses a transaction + Postgres advisory
 * lock so concurrent writers share a single chain head.
 */
export async function appendAuditEvent(input: AppendAuditInput): Promise<void> {
  const createdAt = input.createdAt ?? new Date();

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${AUDIT_CHAIN_LOCK_KEY})`);
    const [last] = await tx
      .select({ h: auditEvents.integrityRecordHash })
      .from(auditEvents)
      .orderBy(desc(auditEvents.createdAt), desc(auditEvents.id))
      .limit(1);

    const prevHash = last?.h ?? null;
    const recordHash = computeAuditRecordHash(prevHash, {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: input.payload,
      createdAt,
    });

    await tx.insert(auditEvents).values({
      ...(input.id ? { id: input.id } : {}),
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: input.payload,
      createdAt,
      integrityPrevHash: prevHash,
      integrityRecordHash: recordHash,
    });
  });
}

export type AuditChainVerifyResult =
  | { ok: true }
  | { ok: false; reason: string; eventId?: string };

/** Recompute the chain in DB order; detects altered rows or broken links. */
export async function verifyAuditIntegrityChain(): Promise<AuditChainVerifyResult> {
  const rows = await db
    .select()
    .from(auditEvents)
    .orderBy(asc(auditEvents.createdAt), asc(auditEvents.id));

  let prev: string | null = null;
  for (const r of rows) {
    if (r.integrityRecordHash == null) {
      return {
        ok: false,
        reason: "Row missing integrity_record_hash (run db:backfill-audit-chain)",
        eventId: r.id,
      };
    }
    if (r.integrityPrevHash !== prev) {
      return {
        ok: false,
        reason: "integrity_prev_hash does not match prior row's record hash",
        eventId: r.id,
      };
    }
    const expected = computeAuditRecordHash(prev, {
      actorId: r.actorId,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      payload: r.payload as Record<string, unknown>,
      createdAt: r.createdAt,
    });
    if (expected !== r.integrityRecordHash) {
      return {
        ok: false,
        reason: "integrity_record_hash does not match recomputed digest (tamper or schema drift)",
        eventId: r.id,
      };
    }
    prev = r.integrityRecordHash;
  }
  return { ok: true };
}

/** Recompute chain fields for all rows (e.g. after adding columns to an existing DB). */
export async function backfillAuditIntegrityChain(): Promise<void> {
  const rows = await db
    .select()
    .from(auditEvents)
    .orderBy(asc(auditEvents.createdAt), asc(auditEvents.id));

  let prev: string | null = null;
  for (const r of rows) {
    const recordHash = computeAuditRecordHash(prev, {
      actorId: r.actorId,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      payload: r.payload as Record<string, unknown>,
      createdAt: r.createdAt,
    });
    await db
      .update(auditEvents)
      .set({
        integrityPrevHash: prev,
        integrityRecordHash: recordHash,
      })
      .where(eq(auditEvents.id, r.id));
    prev = recordHash;
  }
}
