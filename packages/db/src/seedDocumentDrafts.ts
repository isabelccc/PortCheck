/**
 * Long-form fictional disclosure *draft* bodies for seed `document_versions.content`.
 * Demo only — not legal or investment advice.
 */

export {
  corgiAiDraft,
  corgiFeesDraft,
  corgiRiskFactorsDraftV1,
  corgiRiskFactorsDraftV2,
} from "./corgiInnovationEtfDrafts.js";

function section(title: string, body: string): string {
  return `${title}\n\n${body.trim()}`;
}

export function tanchRiskDraft(): string {
  return [
    section(
      "Summary of principal risks",
      [
        "Investing in the Fund involves risks, including possible loss of principal. Equity securities are subject to general market risk, issuer-specific risk, and the risk that overall market sentiment may decline irrespective of individual company fundamentals.",
        "The Fund may invest in foreign securities, which involve additional risks including currency fluctuation, political and economic instability, differing accounting and reporting standards, less liquid markets, and the potential for expropriation, sanctions, or restrictions on repatriation of capital.",
      ].join("\n\n"),
    ),
    section(
      "Currency and foreign investment risk",
      [
        "Changes in currency exchange rates may negatively affect the U.S. dollar value of foreign investments. The Fund may hedge currency exposure from time to time, but hedging may not eliminate currency risk and may reduce gains as well as losses. Foreign governments may impose taxes or controls that adversely affect the Fund’s ability to invest or repatriate proceeds.",
      ].join("\n\n"),
    ),
    section(
      "Liquidity risk",
      [
        "Certain foreign markets may be less liquid than U.S. markets, which may affect the Fund’s ability to execute transactions at desired prices or sizes. During market stress, liquidity may deteriorate across asset classes simultaneously.",
      ].join("\n\n"),
    ),
  ].join("\n\n---\n\n");
}

export function bulkDocumentDraft(kindTitle: string, fundIndex: number): string {
  return [
    section(
      `${kindTitle} — working draft (Fund series ${fundIndex})`,
      [
        `This section is a long-form working draft for "${kindTitle}" as it might appear in a preliminary filing package. It is seeded for UI testing of scroll length, version history, and workflow states.`,
        "The Adviser expects to revise definitions, cross-references, and risk factor ordering following internal legal review and comparison to prior filing cycles. Numerical examples, fee tables, and index descriptions may be updated before any effective date.",
      ].join("\n\n"),
    ),
    section(
      "General considerations",
      [
        "Investors should consider their investment objectives, time horizon, tax situation, and risk tolerance before investing. Past performance does not guarantee future results. This draft does not list every risk that may affect an investment in the fund complex.",
      ].join("\n\n"),
    ),
    section(
      "Operational and disclosure mechanics (placeholder)",
      [
        "Final disclosure will incorporate defined terms used consistently across the prospectus, summary prospectus, and SAI. Defined terms relating to the index, portfolio holdings disclosure, and pricing conventions will be synchronized with service provider agreements and board materials.",
        "The Trust’s officers will coordinate updates to risk factors when material changes occur in portfolio strategy, service provider arrangements, regulatory requirements, or market structure affecting fund operations.",
      ].join("\n\n"),
    ),
    section(
      "Additional draft paragraphs for length",
      Array.from({ length: 8 }, (_, k) =>
        [
          `Paragraph ${k + 1}: Coordinating editors will track outstanding comments from compliance, portfolio management, and fund accounting. Resolution of open items will be documented in a change log maintained for each document slug.`,
          "Cross-functional review meetings are scheduled at milestones leading to filing. Redline comparisons against the prior effective version will highlight additions, deletions, and reordered sections for trustee briefing.",
        ].join(" "),
      ).join("\n\n"),
    ),
  ].join("\n\n---\n\n");
}
