/**
 * Long-form fictional disclosure *draft* bodies for seed `document_versions.content`.
 * Demo only — not legal or investment advice.
 */

export {
  corgiAiDraft,
  corgiFeesDraft,
  corgiRiskFactorsDraftV1,
  corgiRiskFactorsDraftV2,
} from "./corgi-innovation-etf-drafts.js";

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
      `${kindTitle} (series ${fundIndex})`,
      [
        "Working draft body for QA, redline, and workflow demos — not filing language.",
        "Edits to definitions, cross-references, and risk ordering are expected after legal review.",
      ].join("\n\n"),
    ),
    section(
      "General considerations",
      [
        "Investors should consider objectives, horizon, taxes, and risk tolerance. Past performance does not guarantee future results.",
      ].join("\n\n"),
    ),
    section(
      "Operations",
      [
        "Defined terms will align across prospectus, summary prospectus, and SAI. Officers coordinate risk-factor updates when strategy, providers, or regulation change materially.",
      ].join("\n\n"),
    ),
    section(
      "Draft continuation",
      Array.from({ length: 2 }, (_, k) =>
        [
          `Block ${k + 1}: Open comments are tracked in a per-slug change log; redlines vs the prior effective version support trustee review.`,
        ].join(" "),
      ).join("\n\n"),
    ),
  ].join("\n\n---\n\n");
}
