import { db, documentVersions, documents } from "@repo/db";
import { eq } from "drizzle-orm";
import {
  evaluateSystemValidation,
  type SystemValidationResult,
} from "./system-validation";

/** Runs automatic checks on the persisted version body + document slug. */
export async function loadSystemValidationForVersion(
  versionId: string,
): Promise<SystemValidationResult | null> {
  const [row] = await db
    .select({
      content: documentVersions.content,
      documentSlug: documents.slug,
      documentTitle: documents.title,
    })
    .from(documentVersions)
    .innerJoin(documents, eq(documents.id, documentVersions.documentId))
    .where(eq(documentVersions.id, versionId))
    .limit(1);

  if (!row) return null;
  return evaluateSystemValidation({
    content: row.content,
    documentSlug: row.documentSlug,
    documentTitle: row.documentTitle,
  });
}
