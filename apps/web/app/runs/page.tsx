import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** List view merged into `/reviews`; detail pages stay at `/runs/[runId]`. */
export default function RunsIndexPage() {
  redirect("/reviews");
}
