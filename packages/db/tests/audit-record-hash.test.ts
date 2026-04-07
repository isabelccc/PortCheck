import { describe, expect, it } from "vitest";
import { computeAuditRecordHash } from "../src/audit/audit-append";

const baseFields = {
  actorId: "actor-1",
  action: "version_submitted",
  entityType: "document_version",
  entityId: "ver-1",
  payload: { foo: 1 },
  createdAt: new Date("2025-01-15T12:00:00.000Z"),
};

describe("computeAuditRecordHash", () => {
  it("is deterministic for the same inputs", () => {
    const a = computeAuditRecordHash(null, baseFields);
    const b = computeAuditRecordHash(null, baseFields);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("uses GENESIS when prev is null", () => {
    const h0 = computeAuditRecordHash(null, baseFields);
    const h1 = computeAuditRecordHash("GENESIS", baseFields);
    expect(h0).toBe(h1);
  });

  it("changes when prev hash changes (chain link)", () => {
    const h1 = computeAuditRecordHash(null, baseFields);
    const h2 = computeAuditRecordHash(h1, {
      ...baseFields,
      action: "version_approved",
    });
    const h2Again = computeAuditRecordHash(null, {
      ...baseFields,
      action: "version_approved",
    });
    expect(h2).not.toBe(h2Again);
  });

  it("canonicalizes payload key order (stable stringify)", () => {
    const t = new Date("2025-01-15T12:00:00.000Z");
    const a = computeAuditRecordHash(null, {
      ...baseFields,
      createdAt: t,
      payload: { z: 1, a: 2 },
    });
    const b = computeAuditRecordHash(null, {
      ...baseFields,
      createdAt: t,
      payload: { a: 2, z: 1 },
    });
    expect(a).toBe(b);
  });

  it("changes when createdAt changes", () => {
    const a = computeAuditRecordHash(null, {
      ...baseFields,
      createdAt: new Date("2025-01-15T12:00:00.000Z"),
    });
    const b = computeAuditRecordHash(null, {
      ...baseFields,
      createdAt: new Date("2025-01-15T12:00:01.000Z"),
    });
    expect(a).not.toBe(b);
  });
});
