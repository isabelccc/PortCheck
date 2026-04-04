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
