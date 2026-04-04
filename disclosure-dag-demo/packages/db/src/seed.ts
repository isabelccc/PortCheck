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

/** Demo DAG: draft → parallel legal + risk → join → final approval (UUIDs must be hex-only) */
const WF_TEMPLATE = "f1100001-0000-4000-8000-000000000001";
const WF_NODE_DRAFT = "f1110001-0000-4000-8000-000000000001";
const WF_NODE_LEGAL = "f1110002-0000-4000-8000-000000000002";
const WF_NODE_RISK = "f1110003-0000-4000-8000-000000000003";
const WF_NODE_JOIN = "f1110004-0000-4000-8000-000000000004";
const WF_NODE_FINAL = "f1110005-0000-4000-8000-000000000005";
const WF_EDGE_1 = "f1120001-0000-4000-8000-000000000001";
const WF_EDGE_2 = "f1120002-0000-4000-8000-000000000002";
const WF_EDGE_3 = "f1120003-0000-4000-8000-000000000003";
const WF_EDGE_4 = "f1120004-0000-4000-8000-000000000004";
const WF_EDGE_5 = "f1120005-0000-4000-8000-000000000005";
const WF_RUN_RISK_V2 = "f1130001-0000-4000-8000-000000000001";
const WF_STEP_DRAFT = "f1140001-0000-4000-8000-000000000001";
const WF_STEP_LEGAL = "f1140002-0000-4000-8000-000000000002";
const WF_STEP_RISK = "f1140003-0000-4000-8000-000000000003";
const WF_STEP_JOIN = "f1140004-0000-4000-8000-000000000004";
const WF_STEP_FINAL = "f1140005-0000-4000-8000-000000000005";
const WF_AUDIT_1 = "f1150001-0000-4000-8000-000000000001";
const WF_AUDIT_2 = "f1150002-0000-4000-8000-000000000002";

async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // seed.ts lives in packages/db/src — monorepo root is three levels up
  loadEnv({ path: path.join(__dirname, "../../../.env") });
  loadEnv({ path: path.join(__dirname, "../../.env") });

  const mod = await import("./index.js");
  const {
    db,
    documentVersions,
    documents,
    funds,
    workflowTemplates,
    workflowNodes,
    workflowEdges,
    workflowRuns,
    stepExecutions,
    auditEvents,
  } = mod;

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

  await db
    .insert(workflowTemplates)
    .values({
      id: WF_TEMPLATE,
      name: "Disclosure parallel review (demo)",
    })
    .onConflictDoNothing();

  await db.insert(workflowNodes).values([
    {
      id: WF_NODE_DRAFT,
      templateId: WF_TEMPLATE,
      nodeKey: "draft_complete",
      label: "Draft complete",
      nodeType: "start",
      roleRequired: null,
      positionX: 0,
      positionY: 0,
    },
    {
      id: WF_NODE_LEGAL,
      templateId: WF_TEMPLATE,
      nodeKey: "legal_review",
      label: "Legal review",
      nodeType: "task",
      roleRequired: "legal_counsel",
      positionX: -140,
      positionY: 110,
    },
    {
      id: WF_NODE_RISK,
      templateId: WF_TEMPLATE,
      nodeKey: "risk_review",
      label: "Risk review",
      nodeType: "task",
      roleRequired: "risk_officer",
      positionX: 140,
      positionY: 110,
    },
    {
      id: WF_NODE_JOIN,
      templateId: WF_TEMPLATE,
      nodeKey: "join_gate",
      label: "Join gate",
      nodeType: "join",
      roleRequired: null,
      positionX: 0,
      positionY: 220,
    },
    {
      id: WF_NODE_FINAL,
      templateId: WF_TEMPLATE,
      nodeKey: "final_approval",
      label: "Final approval",
      nodeType: "approval",
      roleRequired: "compliance_lead",
      positionX: 0,
      positionY: 330,
    },
  ]).onConflictDoNothing();

  await db.insert(workflowEdges).values([
    {
      id: WF_EDGE_1,
      templateId: WF_TEMPLATE,
      fromNodeId: WF_NODE_DRAFT,
      toNodeId: WF_NODE_LEGAL,
    },
    {
      id: WF_EDGE_2,
      templateId: WF_TEMPLATE,
      fromNodeId: WF_NODE_DRAFT,
      toNodeId: WF_NODE_RISK,
    },
    {
      id: WF_EDGE_3,
      templateId: WF_TEMPLATE,
      fromNodeId: WF_NODE_LEGAL,
      toNodeId: WF_NODE_JOIN,
    },
    {
      id: WF_EDGE_4,
      templateId: WF_TEMPLATE,
      fromNodeId: WF_NODE_RISK,
      toNodeId: WF_NODE_JOIN,
    },
    {
      id: WF_EDGE_5,
      templateId: WF_TEMPLATE,
      fromNodeId: WF_NODE_JOIN,
      toNodeId: WF_NODE_FINAL,
    },
  ]).onConflictDoNothing();

  /** Active run on CORGX Risk Factors v2 (in_review) */
  await db
    .insert(workflowRuns)
    .values({
      id: WF_RUN_RISK_V2,
      templateId: WF_TEMPLATE,
      documentVersionId: VER_RISK_V2,
      status: "running",
    })
    .onConflictDoNothing();

  await db.insert(stepExecutions).values([
    {
      id: WF_STEP_DRAFT,
      runId: WF_RUN_RISK_V2,
      nodeId: WF_NODE_DRAFT,
      status: "completed",
      actorId: "seed@demo.local",
      comment: "Draft marked ready for parallel review",
    },
    {
      id: WF_STEP_LEGAL,
      runId: WF_RUN_RISK_V2,
      nodeId: WF_NODE_LEGAL,
      status: "running",
      actorId: "legal@demo.local",
      comment: null,
    },
    {
      id: WF_STEP_RISK,
      runId: WF_RUN_RISK_V2,
      nodeId: WF_NODE_RISK,
      status: "pending",
      actorId: null,
      comment: null,
    },
    {
      id: WF_STEP_JOIN,
      runId: WF_RUN_RISK_V2,
      nodeId: WF_NODE_JOIN,
      status: "pending",
      actorId: null,
      comment: null,
    },
    {
      id: WF_STEP_FINAL,
      runId: WF_RUN_RISK_V2,
      nodeId: WF_NODE_FINAL,
      status: "pending",
      actorId: null,
      comment: null,
    },
  ]).onConflictDoNothing();

  await db.insert(auditEvents).values([
    {
      id: WF_AUDIT_1,
      actorId: "seed@demo.local",
      action: "workflow_run_started",
      entityType: "workflow_run",
      entityId: WF_RUN_RISK_V2,
      payload: {
        templateId: WF_TEMPLATE,
        documentVersionId: VER_RISK_V2,
      },
    },
    {
      id: WF_AUDIT_2,
      actorId: "legal@demo.local",
      action: "step_status_changed",
      entityType: "step_execution",
      entityId: WF_STEP_LEGAL,
      payload: { runId: WF_RUN_RISK_V2, status: "running" },
    },
  ]).onConflictDoNothing();

  const [
    fundCount,
    docCount,
    verCount,
    tmplCount,
    nodeCount,
    edgeCount,
    runCount,
    stepCount,
    auditCount,
  ] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(funds),
    db.select({ n: sql<number>`count(*)::int` }).from(documents),
    db.select({ n: sql<number>`count(*)::int` }).from(documentVersions),
    db.select({ n: sql<number>`count(*)::int` }).from(workflowTemplates),
    db.select({ n: sql<number>`count(*)::int` }).from(workflowNodes),
    db.select({ n: sql<number>`count(*)::int` }).from(workflowEdges),
    db.select({ n: sql<number>`count(*)::int` }).from(workflowRuns),
    db.select({ n: sql<number>`count(*)::int` }).from(stepExecutions),
    db.select({ n: sql<number>`count(*)::int` }).from(auditEvents),
  ]);

  console.log("Seed complete (idempotent inserts skipped conflicts).");
  console.log(
    `Counts — funds: ${fundCount[0]?.n}, documents: ${docCount[0]?.n}, document_versions: ${verCount[0]?.n}`,
  );
  console.log(
    `Workflow — templates: ${tmplCount[0]?.n}, nodes: ${nodeCount[0]?.n}, edges: ${edgeCount[0]?.n}, runs: ${runCount[0]?.n}, step_executions: ${stepCount[0]?.n}, audit_events: ${auditCount[0]?.n}`,
  );
  } finally {
    await mod.closeDb();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
