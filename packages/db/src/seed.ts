/**
 * Idempotent seed for local dev. Run:
 *   cd packages/db && npm run db:seed
 *
 * Loads monorepo root `.env` before opening the DB connection.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { eq, sql } from "drizzle-orm";
import { PREMIUM_COMPANIES } from "./premiumCompanies.js";
import {
  bulkDocumentDraft,
  corgiAiDraft,
  corgiFeesDraft,
  corgiRiskFactorsDraftV1,
  corgiRiskFactorsDraftV2,
  tanchRiskDraft,
} from "./seedDocumentDrafts.js";

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

const POLICY_CC_1 = "f1160001-0000-4000-8000-000000000001";
const POLICY_EV_1 = "f1160002-0000-4000-8000-000000000002";
const POLICY_RQ_1 = "f1160003-0000-4000-8000-000000000003";
const POLICY_AC_1 = "f1160004-0000-4000-8000-000000000004";

const CHK_V2_QA1 = "f1170001-0000-4000-8000-000000000001";
const CHK_V2_QA2 = "f1170002-0000-4000-8000-000000000002";
const CHK_V2_IX1 = "f1170003-0000-4000-8000-000000000003";
const CHK_V2_ED1 = "f1170004-0000-4000-8000-000000000004";
const CHK_V2_SC1 = "f1170005-0000-4000-8000-000000000005";
const CHK_V1_QA1 = "f1170011-0000-4000-8000-000000000011";

const IXB_V2_1 = "f1180001-0000-4000-8000-000000000001";
const IXB_V2_2 = "f1180002-0000-4000-8000-000000000002";
const IXB_V2_3 = "f1180003-0000-4000-8000-000000000003";

const BULK_FUND_START = 3;
const BULK_FUND_END = 100;

function companyUuid(i: number): string {
  return `cccc${i.toString(16).padStart(4, "0")}-0000-4000-8000-${i.toString(16).padStart(12, "0")}`;
}

function bulkFundUuid(i: number): string {
  return `dddd${i.toString(16).padStart(4, "0")}-0000-4000-8000-${i.toString(16).padStart(12, "0")}`;
}

function bulkDocUuid(i: number): string {
  return `eeee${i.toString(16).padStart(4, "0")}-0000-4000-8000-${i.toString(16).padStart(12, "0")}`;
}

function bulkVersionUuid(i: number): string {
  return `b2ee${i.toString(16).padStart(4, "0")}-0000-4000-8000-${i.toString(16).padStart(12, "0")}`;
}

const ADJECTIVES = [
  "Northbridge",
  "Harbor",
  "Summit",
  "Pinnacle",
  "Riverstone",
  "Crescent",
  "Meridian",
  "Highland",
  "Granite",
  "Silverline",
  "Ironwood",
  "Bluewater",
  "Oakfield",
  "Clearview",
  "Beacon",
  "Sterling",
  "Apex",
  "Founders",
  "Latitude",
  "Cartesian",
  "Velocity",
  "Horizon",
  "Compass",
  "Vertex",
];

const NOUNS = [
  "Capital Partners",
  "Advisors",
  "Asset Management",
  "Trust Company",
  "Investment Group",
  "Wealth Management",
  "Fund Services",
  "Holdings",
  "Management LLC",
  "Strategic Advisors",
  "Financial Group",
  "Partners",
  "Advisory LLC",
  "Capital LLC",
  "Investments",
  "Global Advisors",
];

const FUND_FLAVORS = [
  "Equity ETF",
  "Core Bond Fund",
  "Global Growth Fund",
  "Dividend Fund",
  "Sustainable ETF",
  "Tech Sector Fund",
  "Income Fund",
  "Balanced Fund",
  "International ETF",
  "Short Duration Bond",
  "Small-Cap Growth",
  "Target-Date 2045",
];

const DOC_KINDS = [
  { slug: "risk-factors", title: "Risk factors" },
  { slug: "fees-and-expenses", title: "Fees and expenses" },
  { slug: "summary-prospectus", title: "Summary prospectus" },
  { slug: "sai", title: "Statement of additional information" },
  { slug: "portfolio-holdings", title: "Portfolio holdings disclosure" },
  { slug: "use-of-ai", title: "Use of artificial intelligence" },
];

/** Unique label per synthetic fund — base name alone repeats (small adjective × flavor grid). */
function bulkFundDisplayName(i: number): string {
  const base = `${ADJECTIVES[(i * 5) % ADJECTIVES.length]} ${FUND_FLAVORS[i % FUND_FLAVORS.length]}`;
  return `${base} · Series ${i}`;
}

async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // seed.ts lives in packages/db/src — monorepo root is three levels up
  loadEnv({ path: path.join(__dirname, "../../../.env") });
  loadEnv({ path: path.join(__dirname, "../../.env") });

  const mod = await import("./index.js");
  const {
    db,
    appendAuditEvent,
    companies,
    documentVersions,
    documents,
    funds,
    workflowTemplates,
    workflowNodes,
    workflowEdges,
    workflowRuns,
    stepExecutions,
    auditEvents,
    compliancePolicies,
    ixbrlFactDrafts,
    versionChecklistItems,
  } = mod;

  try {
  const companyRows = Array.from({ length: 100 }, (_, j) => {
    const i = j + 1;
    const premium = PREMIUM_COMPANIES[j];
    if (premium) {
      return {
        id: companyUuid(i),
        name: premium.name,
        slug: premium.slug,
      };
    }
    const name = `${ADJECTIVES[i % ADJECTIVES.length]} ${NOUNS[(i * 3) % NOUNS.length]}`;
    return {
      id: companyUuid(i),
      name,
      slug: `sponsor-${i}`,
    };
  });

  await db
    .insert(companies)
    .values(companyRows)
    .onConflictDoNothing({ target: companies.id });

  for (let j = 0; j < PREMIUM_COMPANIES.length; j++) {
    const p = PREMIUM_COMPANIES[j]!;
    const i = j + 1;
    await db
      .update(companies)
      .set({ name: p.name, slug: p.slug })
      .where(eq(companies.id, companyUuid(i)));
  }

  await db.insert(funds).values([
    {
      id: FUND_CORGX,
      companyId: companyUuid(1),
      name: "Corgi Innovation ETF",
      ticker: "CORGX",
    },
    {
      id: FUND_TANCH,
      companyId: companyUuid(2),
      name: "Tech Anchor Fund",
      ticker: "TANCH",
    },
  ]).onConflictDoNothing();

  await db
    .update(funds)
    .set({ companyId: companyUuid(1) })
    .where(eq(funds.id, FUND_CORGX));
  await db
    .update(funds)
    .set({ companyId: companyUuid(2) })
    .where(eq(funds.id, FUND_TANCH));

  const bulkFunds = [];
  for (let i = BULK_FUND_START; i <= BULK_FUND_END; i++) {
    bulkFunds.push({
      id: bulkFundUuid(i),
      companyId: companyUuid(i),
      name: bulkFundDisplayName(i),
      ticker: `D${i.toString(16).toUpperCase().padStart(4, "0")}`,
    });
  }
  await db.insert(funds).values(bulkFunds).onConflictDoNothing();

  for (let i = BULK_FUND_START; i <= BULK_FUND_END; i++) {
    await db
      .update(funds)
      .set({ name: bulkFundDisplayName(i) })
      .where(eq(funds.id, bulkFundUuid(i)));
  }

  const bulkDocuments = [];
  const bulkVersions = [];
  for (let i = BULK_FUND_START; i <= BULK_FUND_END; i++) {
    const kind = DOC_KINDS[i % DOC_KINDS.length]!;
    const slug = `${kind.slug}-fund-${i}`;
    bulkDocuments.push({
      id: bulkDocUuid(i),
      fundId: bulkFundUuid(i),
      slug,
      title: `${kind.title} (Fund ${i})`,
    });
    const statuses = ["draft", "in_review", "approved"] as const;
    bulkVersions.push({
      id: bulkVersionUuid(i),
      documentId: bulkDocUuid(i),
      version: `2025.${String((i % 12) + 1).padStart(2, "0")}.1`,
      status: statuses[i % 3],
      parentVersionId: null,
      content: bulkDocumentDraft(kind.title, i),
    });
  }

  await db.insert(documents).values(bulkDocuments).onConflictDoNothing({
    target: [documents.fundId, documents.slug],
  });
  await db.insert(documentVersions).values(bulkVersions).onConflictDoNothing();

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
      content: corgiRiskFactorsDraftV1(),
    },
    {
      id: VER_RISK_V2,
      documentId: DOC_CORGX_RISK,
      version: "2025.04.1",
      status: "in_review",
      parentVersionId: VER_RISK_V1,
      content: corgiRiskFactorsDraftV2(),
    },
    {
      id: VER_FEES_V1,
      documentId: DOC_CORGX_FEES,
      version: "2025.04.1",
      status: "approved",
      parentVersionId: null,
      content: corgiFeesDraft(),
    },
    {
      id: VER_AI_V1,
      documentId: DOC_CORGX_AI,
      version: "2025.04.1",
      status: "draft",
      parentVersionId: null,
      content: corgiAiDraft(),
    },
    {
      id: VER_TANCH_V1,
      documentId: DOC_TANCH_RISK,
      version: "2025.01.1",
      status: "approved",
      parentVersionId: null,
      content: tanchRiskDraft(),
    },
  ]).onConflictDoNothing();

  for (const [id, content] of [
    [VER_RISK_V1, corgiRiskFactorsDraftV1()] as const,
    [VER_RISK_V2, corgiRiskFactorsDraftV2()] as const,
    [VER_FEES_V1, corgiFeesDraft()] as const,
    [VER_AI_V1, corgiAiDraft()] as const,
    [VER_TANCH_V1, tanchRiskDraft()] as const,
  ]) {
    await db
      .update(documentVersions)
      .set({ content })
      .where(eq(documentVersions.id, id));
  }

  for (let i = BULK_FUND_START; i <= BULK_FUND_END; i++) {
    const kind = DOC_KINDS[i % DOC_KINDS.length]!;
    await db
      .update(documentVersions)
      .set({ content: bulkDocumentDraft(kind.title, i) })
      .where(eq(documentVersions.id, bulkVersionUuid(i)));
  }

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

  const [seedAuditHead] = await db
    .select({ id: auditEvents.id })
    .from(auditEvents)
    .where(eq(auditEvents.id, WF_AUDIT_1))
    .limit(1);
  if (!seedAuditHead) {
    await appendAuditEvent({
      id: WF_AUDIT_1,
      actorId: "seed@demo.local",
      action: "workflow_run_started",
      entityType: "workflow_run",
      entityId: WF_RUN_RISK_V2,
      payload: {
        templateId: WF_TEMPLATE,
        documentVersionId: VER_RISK_V2,
      },
    });
    await appendAuditEvent({
      id: WF_AUDIT_2,
      actorId: "legal@demo.local",
      action: "step_status_changed",
      entityType: "step_execution",
      entityId: WF_STEP_LEGAL,
      payload: {
        runId: WF_RUN_RISK_V2,
        nodeId: WF_NODE_LEGAL,
        previousStatus: "pending",
        newStatus: "running",
        comment: null,
      },
    });
  }

  await db
    .insert(compliancePolicies)
    .values([
      {
        id: POLICY_CC_1,
        code: "CC-17A",
        title: "Change control for registration statements",
        summary:
          "Material changes to disclosure documents require documented review, approval, and an immutable audit trail before external filing.",
        controlCategory: "change_control",
      },
      {
        id: POLICY_EV_1,
        code: "EV-SEC",
        title: "Evidence of supervisory review",
        summary:
          "Approvals must record actor, timestamp, and rationale sufficient to reconstruct who certified what and why.",
        controlCategory: "evidence",
      },
      {
        id: POLICY_RQ_1,
        code: "RQ-WIP",
        title: "Review queue for in-flight versions",
        summary:
          "Versions in review remain in a controlled queue until workflow completion or explicit escalation.",
        controlCategory: "review_queue",
      },
      {
        id: POLICY_AC_1,
        code: "AC-RBAC",
        title: "Role-based access (demo)",
        summary:
          "Production systems map entitlements to roles; this demo uses a cookie role for viewer / reviewer / admin.",
        controlCategory: "access_control",
    },
  ])
    .onConflictDoNothing({ target: compliancePolicies.id });

  await db.insert(versionChecklistItems).values([
    {
      id: CHK_V2_QA1,
      documentVersionId: VER_RISK_V2,
      sortOrder: 1,
      code: "qa_cross_refs",
      label: "Cross-references and defined terms consistent with prior risk factors section",
      category: "qa_content",
      required: true,
      completedAt: null,
      completedBy: null,
      evidenceNote: null,
    },
    {
      id: CHK_V2_QA2,
      documentVersionId: VER_RISK_V2,
      sortOrder: 2,
      code: "qa_ai_disclosure",
      label: "AI / model use disclosure matches adviser practices described elsewhere",
      category: "qa_content",
      required: true,
      completedAt: null,
      completedBy: null,
      evidenceNote: null,
    },
    {
      id: CHK_V2_IX1,
      documentVersionId: VER_RISK_V2,
      sortOrder: 10,
      code: "ixbrl_validate",
      label: "Inline XBRL draft facts validated (demo validator — not EDGAR Live)",
      category: "ixbrl",
      required: true,
      completedAt: null,
      completedBy: null,
      evidenceNote: null,
    },
    {
      id: CHK_V2_ED1,
      documentVersionId: VER_RISK_V2,
      sortOrder: 20,
      code: "edgar_html_shell",
      label: "EDGAR HTML export generated with exhibit metadata (demo package)",
      category: "edgar_pack",
      required: false,
      completedAt: null,
      completedBy: null,
      evidenceNote: null,
    },
    {
      id: CHK_V2_SC1,
      documentVersionId: VER_RISK_V2,
      sortOrder: 30,
      code: "sec_control_signoff",
      label: "Supervisory review checklist acknowledged for this version",
      category: "sec_control",
      required: true,
      completedAt: null,
      completedBy: null,
      evidenceNote: null,
    },
    {
      id: CHK_V1_QA1,
      documentVersionId: VER_RISK_V1,
      sortOrder: 1,
      code: "qa_baseline",
      label: "Initial risk factors draft reviewed for material omissions",
      category: "qa_content",
      required: true,
      completedAt: new Date(),
      completedBy: "seed@demo.local",
      evidenceNote: "Seeded as satisfied for baseline v1.",
    },
  ]).onConflictDoNothing({ target: versionChecklistItems.id });

  await db.insert(ixbrlFactDrafts).values([
    {
      id: IXB_V2_1,
      documentVersionId: VER_RISK_V2,
      conceptQname: "dei:EntityRegistrantName",
      contextRef: "c-1",
      factValue: "Corgi Capital Advisors, LLC",
      unitRef: null,
      validatedOk: false,
      validationMessage: null,
    },
    {
      id: IXB_V2_2,
      documentVersionId: VER_RISK_V2,
      conceptQname: "dei:TradingSymbol",
      contextRef: "c-1",
      factValue: "CORGX",
      unitRef: null,
      validatedOk: false,
      validationMessage: null,
    },
    {
      id: IXB_V2_3,
      documentVersionId: VER_RISK_V2,
      conceptQname: "dei:invalidBecauseLocalNameMustStartUpperCase",
      contextRef: "c-1",
      factValue: "Demo fact with invalid concept QName",
      unitRef: null,
      validatedOk: false,
      validationMessage: null,
    },
  ]).onConflictDoNothing({ target: ixbrlFactDrafts.id });

  const [
    companyCount,
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
    db.select({ n: sql<number>`count(*)::int` }).from(companies),
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
    `Counts — companies: ${companyCount[0]?.n}, funds: ${fundCount[0]?.n}, documents: ${docCount[0]?.n}, document_versions: ${verCount[0]?.n}`,
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
