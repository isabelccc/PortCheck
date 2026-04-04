export const DEMO_ROLES = ["viewer", "reviewer", "admin"] as const;
export type DemoRole = (typeof DEMO_ROLES)[number];

export function canMutateChecklist(role: DemoRole): boolean {
  return role === "reviewer" || role === "admin";
}

export function canMutateWorkflow(role: DemoRole): boolean {
  return role === "reviewer" || role === "admin";
}

export function canExportFiling(role: DemoRole): boolean {
  return role === "reviewer" || role === "admin";
}

/** Final document sign-off (segregated from line reviewers in this demo). */
export function canApproveDocumentVersion(role: DemoRole): boolean {
  return role === "admin";
}

/** Send back from review queue (compliance / counsel). */
export function canRejectDocumentVersion(role: DemoRole): boolean {
  return role === "reviewer" || role === "admin";
}

export function canReopenRejectedVersion(role: DemoRole): boolean {
  return role === "reviewer" || role === "admin";
}
