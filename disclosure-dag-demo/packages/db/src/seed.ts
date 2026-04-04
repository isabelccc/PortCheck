/**
 * Idempotent seed for local dev. Run:
 *   cd packages/db && npm run db:seed
 *
 * Loads monorepo root `.env` before opening the DB connection.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { sql } from "drizzle-orm";

const FUND_CORGX = "f0000001-0000-4000-8000-000000000001";
const FUND_TANCH = "f0000002-0000-4000-8000-000000000002";

const DOC_CORGX_RISK = "d0000001-0000-4000-8000-000000000001";
const DOC_CORGX_FEES = "d0000002-0000-4000-8000-000000000002";
const DOC_CORGX_AI = "d0000003-0000-4000-8000-000000000003";
const DOC_TANCH_RISK = "d0000004-0000-4000-8000-000000000004";

const VER_RISK_V1 = "b0000001-0000-4000-8000-000000000001";
const VER_RISK_V2 = "b0000002-0000-4000-8000-000000000002";
const VER_FEES_V1 = "b0000003-0000-4000-8000-000000000003";
const VER_AI_V1 = "b0000004-0000-4000-8000-000000000004";
const VER_TANCH_V1 = "b0000005-0000-4000-8000-000000000005";

async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // seed.ts lives in packages/db/src — monorepo root is three levels up
  loadEnv({ path: path.join(__dirname, "../../../.env") });
  loadEnv({ path: path.join(__dirname, "../../.env") });

  const mod = await import("./index.js");
  const { db, documentVersions, documents, funds } = mod;

  try {
  await db.insert(funds).values([
    {
      id: FUND_CORGX,
      name: "Corgi Innovation ETF",
      ticker: "CORGX",
    },
    {
      id: FUND_TANCH,
      name: "Tech Anchor Fund",
      ticker: "TANCH",
    },
  ]).onConflictDoNothing();

  await db.insert(documents).values([
    {
      id: DOC_CORGX_RISK,
      fundId: FUND_CORGX,
      slug: "risk-factors",
      title: "Risk Factors",
    },
    {
      id: DOC_CORGX_FEES,
      fundId: FUND_CORGX,
      slug: "fees-and-expenses",
      title: "Fees and Expenses",
    },
    {
      id: DOC_CORGX_AI,
      fundId: FUND_CORGX,
      slug: "ai-use-disclosure",
      title: "Use of Artificial Intelligence",
    },
    {
      id: DOC_TANCH_RISK,
      fundId: FUND_TANCH,
      slug: "risk-factors",
      title: "Risk Factors",
    },
  ]).onConflictDoNothing({
    target: [documents.fundId, documents.slug],
  });

  await db.insert(documentVersions).values([
    {
      id: VER_RISK_V1,
      documentId: DOC_CORGX_RISK,
      version: "2025.03.1",
      status: "draft",
      parentVersionId: null,
      content: [
        "Principal risks include market risk, sector concentration in technology and innovation themes,",
        "and the possibility of greater volatility than broad market indices. The Fund may invest in",
        "smaller-capitalization companies, which can be more volatile and less liquid.",
        "",
        "Cybersecurity incidents affecting issuers or service providers may disrupt operations and",
        "adversely affect Fund performance.",
      ].join("\n"),
    },
    {
      id: VER_RISK_V2,
      documentId: DOC_CORGX_RISK,
      version: "2025.04.1",
      status: "in_review",
      parentVersionId: VER_RISK_V1,
      content: [
        "Principal risks include market risk, sector concentration in technology and innovation themes,",
        "and the possibility of greater volatility than broad market indices. The Fund may invest in",
        "smaller-capitalization companies, which can be more volatile and less liquid.",
        "",
        "Cybersecurity incidents affecting issuers or service providers may disrupt operations and",
        "adversely affect Fund performance.",
        "",
        "Added April 2025: The Fund may obtain exposure to digital asset-linked instruments where",
        "permitted by the prospectus; such exposure may amplify volatility and liquidity risk.",
      ].join("\n"),
    },
    {
      id: VER_FEES_V1,
      documentId: DOC_CORGX_FEES,
      version: "2025.04.1",
      status: "approved",
      parentVersionId: null,
      content: [
        "Management fee: 0.49% per annum of average daily net assets.",
        "Other expenses (estimated): 0.05%. Total annual fund operating expenses: 0.54%.",
        "",
        "Example: A $10,000 investment with a 5% annual return would pay approximately $55 in expenses",
        "in the first year under the stated assumptions in the prospectus fee table.",
      ].join("\n"),
    },
    {
      id: VER_AI_V1,
      documentId: DOC_CORGX_AI,
      version: "2025.04.1",
      status: "draft",
      parentVersionId: null,
      content: [
        "The adviser may use internally developed tools that incorporate statistical and language models",
        "to support research workflows. Human portfolio managers remain responsible for investment",
        "decisions, and model outputs are subject to internal validation and documentation controls.",
        "",
        "There is no guarantee that model-assisted processes will improve results or avoid error.",
      ].join("\n"),
    },
    {
      id: VER_TANCH_V1,
      documentId: DOC_TANCH_RISK,
      version: "2025.01.1",
      status: "approved",
      parentVersionId: null,
      content: [
        "Investing involves risk, including possible loss of principal. The Fund is subject to equity",
        "securities risk, foreign investment risk, and currency risk where applicable.",
      ].join("\n"),
    },
  ]).onConflictDoNothing();

  const [fundCount, docCount, verCount] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(funds),
    db.select({ n: sql<number>`count(*)::int` }).from(documents),
    db.select({ n: sql<number>`count(*)::int` }).from(documentVersions),
  ]);

  console.log("Seed complete (idempotent inserts skipped conflicts).");
  console.log(
    `Counts — funds: ${fundCount[0]?.n}, documents: ${docCount[0]?.n}, document_versions: ${verCount[0]?.n}`,
  );
  } finally {
    await mod.closeDb();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
