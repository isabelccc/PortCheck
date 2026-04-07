import { db, documentVersions, documents, ixbrlFactDrafts } from "@repo/db";
import { asc, eq } from "drizzle-orm";
import { canExportFiling } from "../../../../lib/roles/demo-role-constants";
import { getDemoRole } from "../../../../lib/roles/demo-role-server";
import { buildInlineIxbrlHtml } from "../../../../lib/filing/inline-ixbrl-html";

export async function GET(
  _request: Request,
  context: { params: Promise<{ versionId: string }> },
) {
  const { versionId } = await context.params;
  const role = await getDemoRole();
  if (!canExportFiling(role)) {
    return new Response("Forbidden — switch to reviewer or admin on /compliance", {
      status: 403,
    });
  }

  const [row] = await db
    .select({
      version: documentVersions,
      document: documents,
    })
    .from(documentVersions)
    .innerJoin(documents, eq(documents.id, documentVersions.documentId))
    .where(eq(documentVersions.id, versionId))
    .limit(1);

  if (!row) {
    return new Response("Not found", { status: 404 });
  }

  const factRows = await db
    .select({
      conceptQname: ixbrlFactDrafts.conceptQname,
      contextRef: ixbrlFactDrafts.contextRef,
      factValue: ixbrlFactDrafts.factValue,
      unitRef: ixbrlFactDrafts.unitRef,
    })
    .from(ixbrlFactDrafts)
    .where(eq(ixbrlFactDrafts.documentVersionId, versionId))
    .orderBy(asc(ixbrlFactDrafts.createdAt));

  const html = buildInlineIxbrlHtml({
    documentTitle: row.document.title,
    versionLabel: row.version.version,
    slug: row.document.slug,
    bodyPlainText: row.version.content,
    facts: factRows,
  });

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="demo-edgar-exhibit-${versionId.slice(0, 8)}.html"`,
    },
  });
}
