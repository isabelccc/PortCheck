import { describe, expect, it } from "vitest";
import {
  predecessorsFromEdges,
  validateWorkflowTransition,
} from "../lib/workflow-rules-engine";

describe("predecessorsFromEdges", () => {
  it("maps targets to source ids", () => {
    const m = predecessorsFromEdges([
      { source: "a", target: "b" },
      { source: "c", target: "b" },
    ]);
    expect(m.get("b")?.sort()).toEqual(["a", "c"]);
    expect(m.get("a")).toBeUndefined();
  });

  it("returns empty map for no edges", () => {
    expect([...predecessorsFromEdges([]).entries()]).toEqual([]);
  });
});

describe("validateWorkflowTransition", () => {
  const linearEdges = [{ source: "n1", target: "n2" }];

  it("rejects invalid next status", () => {
    const r = validateWorkflowTransition({
      edges: [],
      steps: [{ nodeId: "x", status: "pending" }],
      nodeId: "x",
      nextStatus: "nope",
    });
    expect(r).toEqual({ ok: false, message: "Invalid status." });
  });

  it("rejects unknown current step status", () => {
    const r = validateWorkflowTransition({
      edges: [],
      steps: [{ nodeId: "x", status: "weird" }],
      nodeId: "x",
      nextStatus: "running",
    });
    expect(r).toEqual({ ok: false, message: "Unknown current step status." });
  });

  it("allows no-op when from === next", () => {
    const r = validateWorkflowTransition({
      edges: [],
      steps: [{ nodeId: "x", status: "pending" }],
      nodeId: "x",
      nextStatus: "pending",
    });
    expect(r).toEqual({ ok: true });
  });

  it("blocks changes from completed or skipped", () => {
    for (const st of ["completed", "skipped"] as const) {
      const r = validateWorkflowTransition({
        edges: [],
        steps: [{ nodeId: "x", status: st }],
        nodeId: "x",
        nextStatus: "pending",
      });
      expect(r.ok).toBe(false);
      expect(r).toMatchObject({
        ok: false,
        message: "This step is already finalized and cannot change.",
      });
    }
  });

  it("pending → blocked without upstream checks", () => {
    const r = validateWorkflowTransition({
      edges: linearEdges,
      steps: [
        { nodeId: "n1", status: "pending" },
        { nodeId: "n2", status: "pending" },
      ],
      nodeId: "n2",
      nextStatus: "blocked",
    });
    expect(r).toEqual({ ok: true });
  });

  it("pending → running requires predecessors completed or skipped", () => {
    const steps = [
      { nodeId: "n1", status: "running" },
      { nodeId: "n2", status: "pending" },
    ];
    const blocked = validateWorkflowTransition({
      edges: linearEdges,
      steps,
      nodeId: "n2",
      nextStatus: "running",
    });
    expect(blocked.ok).toBe(false);
    expect(blocked).toMatchObject({
      message:
        "Upstream steps must be completed or skipped before this step can advance.",
    });

    const ok = validateWorkflowTransition({
      edges: linearEdges,
      steps: [
        { nodeId: "n1", status: "completed" },
        { nodeId: "n2", status: "pending" },
      ],
      nodeId: "n2",
      nextStatus: "running",
    });
    expect(ok).toEqual({ ok: true });
  });

  it("running → completed or blocked", () => {
    expect(
      validateWorkflowTransition({
        edges: [],
        steps: [{ nodeId: "x", status: "running" }],
        nodeId: "x",
        nextStatus: "completed",
      }),
    ).toEqual({ ok: true });
    expect(
      validateWorkflowTransition({
        edges: [],
        steps: [{ nodeId: "x", status: "running" }],
        nodeId: "x",
        nextStatus: "blocked",
      }),
    ).toEqual({ ok: true });
    const bad = validateWorkflowTransition({
      edges: [],
      steps: [{ nodeId: "x", status: "running" }],
      nodeId: "x",
      nextStatus: "skipped",
    });
    expect(bad.ok).toBe(false);
  });

  it("blocked → pending", () => {
    expect(
      validateWorkflowTransition({
        edges: [],
        steps: [{ nodeId: "x", status: "blocked" }],
        nodeId: "x",
        nextStatus: "pending",
      }),
    ).toEqual({ ok: true });
  });

  it("blocked → completed is rejected (must run first)", () => {
    const r = validateWorkflowTransition({
      edges: [],
      steps: [{ nodeId: "x", status: "blocked" }],
      nodeId: "x",
      nextStatus: "completed",
    });
    expect(r).toEqual({
      ok: false,
      message: "Move to running first, then complete.",
    });
  });

  it("blocked → running respects predecessor completion", () => {
    const bad = validateWorkflowTransition({
      edges: linearEdges,
      steps: [
        { nodeId: "n1", status: "pending" },
        { nodeId: "n2", status: "blocked" },
      ],
      nodeId: "n2",
      nextStatus: "running",
    });
    expect(bad.ok).toBe(false);

    const ok = validateWorkflowTransition({
      edges: linearEdges,
      steps: [
        { nodeId: "n1", status: "skipped" },
        { nodeId: "n2", status: "blocked" },
      ],
      nodeId: "n2",
      nextStatus: "running",
    });
    expect(ok).toEqual({ ok: true });
  });
});
