import "server-only";

import { cookies } from "next/headers";
import type { DemoRole } from "./demo-role-constants";

const COOKIE = "demo_role";

export async function getDemoRole(): Promise<DemoRole> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (raw === "viewer" || raw === "reviewer" || raw === "admin") {
    return raw;
  }
  return "reviewer";
}
