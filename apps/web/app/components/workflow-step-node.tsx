"use client";

import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

export type WorkflowStepData = {
  label: string;
  status: string;
  nodeKey: string;
  nodeId: string;
  nodeType: string;
};

function statusBorder(status: string): string {
  switch (status) {
    case "completed":
      return "#22c55e";
    case "running":
      return "#c4f542";
    case "blocked":
      return "#f97316";
    case "skipped":
      return "#94a3b8";
    case "pending":
    default:
      return "#a3a3a3";
  }
}

export function WorkflowStepNode({ data }: NodeProps) {
  const d = data as WorkflowStepData;
  return (
    <div
      style={{
        border: `3px solid ${statusBorder(d.status)}`,
        padding: "0.65rem 0.85rem",
        borderRadius: 6,
        background: "#fff",
        minWidth: 128,
        maxWidth: 200,
        boxShadow: "2px 2px 0 #000",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: "-0.02em" }}>
        {d.label}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#525252",
          marginTop: 4,
          textTransform: "capitalize",
        }}
      >
        {d.status.replaceAll("_", " ")}
      </div>
      <div style={{ fontSize: 10, color: "#a3a3a3", marginTop: 2 }}>
        {d.nodeKey} · {d.nodeType}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
