/**
 * Full-length fictional prospectus-style drafts for Corgi Innovation ETF documents only.
 * Demo / portfolio use — not a real filing; not legal or investment advice.
 */

const FUND = "Corgi Innovation ETF";
const INDEX = "Corgi Global Innovation & Technology Index";

function s(title: string, ...paragraphs: string[]): string {
  return `${title}\n\n${paragraphs.map((p) => p.trim()).join("\n\n")}`;
}

/** Risk factors — March 2025 draft (prior version in lineage). */
export function corgiRiskFactorsDraftV1(): string {
  return [
    s(
      "Summary",
      `An investment in shares of the ${FUND} (the “Fund”) involves investment risks. This section describes principal risks that the Trust believes may affect the value of your investment. The order of presentation is not indicative of relative importance, and additional risks not described here may be significant under particular market conditions. You should consider these risks together with all other information in this prospectus and the Statement of Additional Information (“SAI”) before investing.`,
      `The Fund is an exchange-traded fund (“ETF”) that seeks investment results that, before fees and expenses, correspond generally to the price and yield performance of the ${INDEX} (the “Index”). The Index is designed to measure the performance of U.S. and non-U.S. equity securities of companies that derive a significant portion of revenue from technology, digital services, software, semiconductor, cloud infrastructure, and adjacent innovation-oriented business activities, as described in the Index methodology published by the Index provider. There is no assurance the Fund will achieve its investment objective or that the Index will continue to be published.`,
    ),
    s(
      "Risks of equity securities",
      `The Fund invests primarily in equity securities, which are subject to stock market risk. Stock markets have experienced periods of substantial volatility and may decline sharply and suddenly in response to general economic and market conditions, interest rate movements, inflation expectations, geopolitical developments, public health events, changes in fiscal or monetary policy, or investor behavior unrelated to the fundamentals of individual issuers held by the Fund.`,
      `Individual issuers may experience adverse developments, including earnings disappointments, management turnover, litigation, regulatory enforcement, product recalls, or loss of major customers. Such events may cause the market price of an issuer’s securities to decline independently of broader market movements.`,
    ),
    s(
      "Market and volatility risk",
      `Technology and innovation-oriented equity securities have historically exhibited higher volatility than the broader U.S. equity market as measured by certain broad-based indices. Volatility may be driven by rapid changes in growth expectations, sensitivity to interest rates and discount rates applied to long-duration cash flows, competitive disruption, and concentration of returns in a relatively small number of large-capitalization issuers.`,
      `During periods of market stress, correlations among securities held by the Fund may increase, reducing the benefits of diversification within the portfolio. High-frequency trading, social media-driven sentiment, and coordinated trading among institutional participants may amplify short-term price swings.`,
    ),
    s(
      "Sector concentration risk",
      `The Fund’s investments may be concentrated in the technology sector and related industries, including software, semiconductors, IT services, internet and direct marketing retail, and communication services. Concentration increases the Fund’s sensitivity to regulatory changes, antitrust investigations, export controls, supply chain disruptions, labor actions, intellectual property disputes, and demand cycles affecting those industries.`,
      `A technology-sector downturn may occur even when other sectors of the economy are stable or improving. Conversely, the Fund may underperform diversified broad market indices during periods when technology-oriented sectors lag.`,
    ),
    s(
      "Non-diversification risk",
      `The Fund is classified as “non-diversified” under the Investment Company Act of 1940, as amended (the “1940 Act”), which means it may invest a greater percentage of its assets in fewer issuers than a diversified fund. As a result, the Fund may be more susceptible to adverse events affecting any one issuer or a small group of issuers.`,
    ),
    s(
      "Foreign investment risk",
      `The Fund may invest in depositary receipts and equity securities of non-U.S. issuers, including issuers in emerging markets. Foreign investments involve risks not typically associated with U.S. investments, including less transparent regulatory regimes, weaker corporate governance practices, currency fluctuation, withholding taxes, settlement and custody risk, nationalization or expropriation risk, and restrictions on repatriation of capital.`,
      `Emerging market securities may be less liquid and more volatile than securities of developed market issuers. Political instability, sanctions, embargoes, or abrupt changes in local law may materially impair the value or liquidity of such investments.`,
    ),
    s(
      "Currency risk",
      `Because the Fund’s shares are denominated in U.S. dollars, changes in foreign currency exchange rates may affect the U.S. dollar value of securities denominated or quoted in other currencies. The Fund may not hedge currency exposure, and any hedging strategy used in the future may not eliminate currency risk and may reduce potential gains.`,
    ),
    s(
      "Small- and mid-capitalization risk",
      `The Fund may invest in securities of small- and mid-capitalization companies. Such companies may have limited product lines, management depth, financial resources, or trading liquidity. Their securities may be more volatile and harder to buy or sell at favorable prices, particularly during periods of market stress.`,
    ),
    s(
      "Large-capitalization risk",
      `The Index and the Fund may be heavily weighted in large-capitalization issuers. Returns may be influenced by performance of a relatively small number of stocks. Negative developments affecting one or more large constituents may have an outsized impact on Fund performance.`,
    ),
    s(
      "Growth-style investing risk",
      `The Index’s methodology may emphasize growth-oriented companies, which may trade at elevated valuation multiples relative to earnings, book value, or cash flow. Growth stocks may underperform value stocks for extended periods and may decline sharply if investor sentiment shifts or if growth expectations are not realized.`,
    ),
    s(
      "Index tracking / correlation risk",
      `There is no guarantee that the Fund will achieve a high degree of correlation with the Index. Tracking error may result from rounding of share quantities, cash drag, market illiquidity, timing of cash flows, regulatory constraints, sampling techniques (if used), expenses and fees, fair valuation of portfolio holdings, and changes to the Index composition or methodology.`,
      `If the Index provider makes unanticipated methodology changes, the Fund may need to rebalance its portfolio quickly, potentially increasing transaction costs and realization of taxable gains for shareholders who hold Fund shares in taxable accounts.`,
    ),
    s(
      "Index provider risk",
      `The Fund depends on the Index provider to maintain, calculate, and publish the Index. Errors in Index construction, data inputs, or corporate action adjustments may adversely affect Fund performance. If the Index provider discontinues the Index or materially changes its objective, the Fund may need to seek shareholder approval to track a different index, liquidate, or merge, any of which could be disadvantageous to shareholders.`,
    ),
    s(
      "Authorized participation / creation and redemption risk",
      `Only certain financial institutions (“Authorized Participants”) may create or redeem large blocks of Fund shares (“Creation Units”) directly with the Fund. If Authorized Participants exit the business or reduce activity, the spread between the market price of Fund shares and NAV may widen. During stressed market conditions, the Fund may trade at a significant premium or discount to NAV.`,
    ),
    s(
      "Secondary market trading risk",
      `Fund shares are listed on a national securities exchange; however, the listing does not guarantee an active trading market. Low trading volume, exchange halts, or operational issues may impair liquidity. Investors buying or selling shares in the secondary market will typically pay brokerage commissions and may transact at prices above or below NAV.`,
    ),
    s(
      "Cybersecurity and operational risk",
      `The Fund and its service providers, including the Adviser, administrator, custodian, transfer agent, and index provider, rely on information technology systems that may be vulnerable to cyberattacks, ransomware, denial-of-service events, insider threats, or third-party vendor failures. Such events could disrupt trading, pricing, recordkeeping, or shareholder servicing and could negatively affect Fund operations or portfolio valuation.`,
      `Portfolio companies may also suffer cybersecurity incidents that impair operations, reduce revenues, or result in legal liability, any of which may adversely affect the market prices of securities held by the Fund.`,
    ),
    s(
      "Intellectual property and innovation risk",
      `Many companies in the Index rely on patents, trade secrets, trademarks, and copyrights. Adverse litigation outcomes, patent expirations, or failure to protect proprietary technology may erode competitive advantages and reduce issuer profitability.`,
    ),
    s(
      "Regulatory and legislative risk",
      `Technology and data-oriented businesses are subject to evolving regulation concerning privacy, consumer protection, content moderation, competition, artificial intelligence, cross-border data flows, and industry-specific licensing. New laws or enforcement priorities in the United States or abroad may increase compliance costs, restrict business models, or result in fines or structural remedies that adversely affect issuers held by the Fund.`,
    ),
    s(
      "Geopolitical and sanctions risk",
      `Export controls, tariffs, sanctions, and trade disputes may disrupt supply chains for semiconductors, hardware, and cloud infrastructure. Issuers with significant sales or operations in affected regions may experience revenue declines or increased costs.`,
    ),
    s(
      "Interest rate and discount-rate risk",
      `Even though the Fund does not primarily invest in debt securities, equity valuations—particularly for longer-duration growth equities—may be sensitive to changes in interest rates and inflation expectations. Rapid increases in risk-free rates may compress valuation multiples and contribute to equity market volatility.`,
    ),
    s(
      "Liquidity risk",
      `Although the Fund invests primarily in publicly traded securities, market liquidity may deteriorate during periods of stress. The Fund may receive large purchase or redemption orders that require rapid trading, potentially affecting execution prices and increasing transaction costs. Rule 22e-4 under the 1940 Act requires the Fund to manage liquidity risk; however, liquidity classification methodologies may not perfectly predict realized liquidity under stress.`,
    ),
    s(
      "Securities lending risk",
      `To the extent the Fund engages in securities lending, it will be subject to counterparty default risk with respect to collateral and lent securities, operational risk, and the risk that lending income may not offset losses from reinvestment of collateral or borrower default. The Fund may also bear indemnification obligations under the securities lending agreement.`,
    ),
    s(
      "Tax risk",
      `The federal tax treatment of Fund distributions and sales of shares may be affected by future legislation, Treasury regulations, or IRS guidance. The tax consequences to you of an investment in the Fund depend on your individual circumstances; you should consult your tax adviser.`,
    ),
    s(
      "Cash and cash equivalents risk",
      `The Fund may hold cash or cash equivalents for liquidity, pending investment, or during rebalancing. Such holdings may dilute returns relative to the Index during periods when equity markets rise and may expose the Fund to inflation risk and low yields on short-term instruments.`,
    ),
    s(
      "Fluctuation of net asset value",
      `The NAV of the Fund will fluctuate based on changes in the value of portfolio securities. You may lose money, including near-term loss of principal, even if the broader stock market is rising.`,
    ),
    s(
      "Fund shares are not deposits or obligations of a bank",
      `Shares of the Fund are not bank deposits and are not insured or guaranteed by the Federal Deposit Insurance Corporation or any other agency of the U.S. government. There can be no assurance that the Fund will be able to maintain a stable net asset value per share.`,
    ),
  ].join("\n\n---\n\n");
}

function corgiDigitalAssetSupplement(): string {
  return s(
    "Digital asset-linked exposure and related risks (April 2025 supplement — draft)",
    `The Adviser and the Board of Trustees are evaluating an amendment to the Fund’s principal investment strategies that would permit limited exposure to digital asset-linked instruments, including equity securities of companies with material revenue or balance-sheet exposure to digital assets, exchange-traded products registered under the 1940 Act that seek to track digital asset markets (if eligible for investment under the Fund’s policies), and exchange-traded futures and cleared swaps referencing digital asset prices where consistent with applicable law and the Fund’s risk management program, subject to concentration, liquidity, and derivatives use limitations described in the registration statement.`,
    `Digital asset markets have exhibited extreme historical volatility, limited operating history for certain instruments, fragmented liquidity across trading venues, susceptibility to fraud and manipulation, cybersecurity risks affecting wallets and custodians, and evolving regulatory treatment across jurisdictions. Regulatory agencies have brought enforcement actions against trading platforms, issuers, and promoters; adverse developments may reduce market participation or impair the valuation of related securities held by the Fund.`,
    `Exposure to digital asset-linked instruments may increase correlation among Fund holdings during stress episodes and may cause the Fund’s performance to diverge meaningfully from broad technology indices for extended periods. Custody, settlement, and valuation practices for certain instruments may be less standardized than for traditional equity securities. The Fund may experience heightened tracking error relative to the Index if the Index methodology is not amended to incorporate digital asset-linked components or if the Fund’s portfolio constraints differ from Index composition during transition periods.`,
    `This supplement is marked as a draft for internal legal, compliance, and portfolio management review. Final disclosure, including risk factor ordering, numerical limits, and defined terms, will be coordinated across the prospectus, summary prospectus, and SAI prior to any effectiveness determination.`,
  );
}

/** Risk factors — April 2025 draft = full prior text plus supplement (full replacement version). */
export function corgiRiskFactorsDraftV2(): string {
  return [corgiRiskFactorsDraftV1(), "---", corgiDigitalAssetSupplement()].join("\n\n");
}

/** Fees and expenses — statutory-style narrative for CORGX. */
export function corgiFeesDraft(): string {
  return [
    s(
      "Shareholder fees (fees paid directly from your investment)",
      `The Fund does not impose any sales load, deferred sales charge, or redemption fee on purchases or sales of Fund shares in the primary market through Creation Unit transactions. Certain financial intermediaries may impose account fees, commissions, or service charges on your transactions in secondary market purchases and sales of Fund shares; those charges are retained by the intermediary and are not paid to the Fund, the Adviser, or the Trust.`,
    ),
    s(
      "Annual fund operating expenses (expenses that you pay each year as a percentage of the value of your investment)",
      [
        "Management fee.................................................... 0.49%",
        "Distribution and/or service (12b-1) fees.......................... None",
        "Other expenses (including administration, custody, transfer agency,",
        "  legal, audit, registration, printing, and Trustees’ fees)....... 0.05%",
        "Acquired fund fees and expenses (underlying funds in which the",
        "  Fund may invest from time to time, if any)...................... 0.00%",
        "-------------------------------------------------------------------------",
        "Total annual fund operating expenses.............................. 0.54%",
      ].join("\n"),
    ),
    s(
      "Expense example",
      `The following example is intended to help you compare the cost of investing in the Fund with the cost of investing in other mutual funds. The example assumes that you invest $10,000 in the Fund for the time periods indicated and then redeem all of your shares at the end of those periods. The example also assumes that your investment has a 5% return each year and that the Fund’s operating expenses remain the same. Although your actual costs may be higher or lower, based on these assumptions your costs would be:`,
      [
        "1 year........... $ 55",
        "3 years.......... $173",
        "5 years.......... $302",
        "10 years......... $674",
      ].join("\n"),
      `This example does not reflect brokerage commissions that you may pay when purchasing or selling Fund shares in the secondary market. The example also does not reflect any account-level fees charged by your financial intermediary.`,
    ),
    s(
      "Portfolio turnover",
      `The Fund pays transaction costs, such as brokerage commissions, when it buys and sells securities (or “turns over” its portfolio). A higher portfolio turnover rate may indicate higher transaction costs and may result in higher taxes when Fund shares are held in a taxable account. These costs, which are not reflected in annual fund operating expenses or in the expense example, affect the Fund’s performance. During the most recent fiscal period, the Fund’s portfolio turnover rate was approximately [__]% of the average value of its portfolio (exclusive of securities with maturities of one year or less). A number will be provided after the Fund has operated for a complete fiscal year.`,
    ),
    s(
      "Payments to financial intermediaries",
      `The Adviser, out of its own resources and not from Fund assets, may compensate broker-dealers, banks, trust companies, and other intermediaries for shareholder servicing, sub-accounting, networking, platform access, and participation in educational seminars. These payments create a conflict of interest for an intermediary to favor the Fund over other funds. Intermediaries may also receive revenue sharing or other payments from unaffiliated fund complexes; ask your financial intermediary for details.`,
    ),
    s(
      "Management fee; contractual fee waiver and/or expense reimbursement (if applicable)",
      `The Trust and the Adviser have entered into an investment advisory agreement under which the Adviser receives a unified management fee at the annual rate of 0.49% of the Fund’s average daily net assets. Out of this fee, the Adviser pays substantially all expenses of the Fund, including custody, transfer agency, fund accounting, administrative services, registration fees, legal, audit, Trustees’ ordinary expenses, and routine operational costs, other than interest, taxes, brokerage commissions and other transaction costs, litigation expenses, extraordinary expenses, and acquired fund fees and expenses, if any.`,
      `The Adviser has contractually agreed to waive its fee and/or reimburse Fund expenses to limit Total Annual Fund Operating Expenses After Fee Waiver and/or Expense Reimbursement to 0.54% of average daily net assets through [date], unless sooner terminated by the Board. This agreement may be terminated only by the Board. Fee waivers and reimbursements are subject to possible recoupment by the Adviser within three years from the date the expense was waived or reimbursed, if such recoupment would not cause the Fund to exceed the lesser of the expense limitation in place at the time of waiver/reimbursement or the expense limitation in place at the time of recoupment.`,
    ),
    s(
      "Brokerage allocation",
      `Decisions regarding the selection of broker-dealers and the negotiation of commission rates are made by the Adviser subject to Board oversight and policies designed to seek best execution. The Adviser may cause the Fund to pay a broker-dealer providing research and other services that constitute “soft dollars” under Section 28(e) of the Securities Exchange Act of 1934, where permitted.`,
    ),
  ].join("\n\n---\n\n");
}

/** Use of AI / models — disclosure draft for CORGX. */
export function corgiAiDraft(): string {
  return [
    s(
      "Introduction",
      `Corgi Capital Advisors, LLC (the “Adviser”) and its affiliates may use computational tools, including statistical models, machine learning techniques, natural language processing (“NLP”), and large language model (“LLM”)-based assistants, in connection with research support, document summarization, idea screening, risk monitoring, and operational workflows for the ${FUND} (the “Fund”). This section summarizes the scope of those uses, governance practices, and limitations. It does not describe every technology used by the Adviser’s service providers (such as custodians or index providers), which maintain their own systems and disclosures.`,
    ),
    s(
      "Human decision-making",
      `Portfolio management decisions for the Fund remain subject to human judgment by the Adviser’s investment personnel. Automated outputs, scores, or summaries do not by themselves cause purchases or sales of securities for the Fund. Personnel are expected to exercise professional skepticism, corroborate material facts using independent sources where practicable, and document rationales for material decisions in accordance with the Adviser’s policies.`,
    ),
    s(
      "Permitted categories of use (illustrative)",
      `Without limitation, the following categories describe representative uses that may apply from time to time: (i) parsing and tagging unstructured text from issuer filings, news, and research vendor feeds to flag topics for analyst follow-up; (ii) constructing factor or risk dashboards that summarize exposures at the portfolio or issuer level; (iii) assisting in the preparation of first drafts of internal memoranda, checklists, and compliance questionnaires, which are reviewed and edited by personnel before reliance; (iv) monitoring operational metrics related to trade settlement fails, corporate action processing, and cash management alerts; and (v) supporting cybersecurity log analysis and anomaly detection in coordination with information technology staff.`,
    ),
    s(
      "Data sources and data quality",
      `Models may rely on third-party datasets, vendor estimates, crowdsourced information, and publicly available regulatory filings. Such data may contain errors, omissions, stale values, or biases. The Adviser seeks to use data vendors that maintain contractual representations and, where available, independent verification; however, no assurance can be given that data will be accurate or complete. Use of web-scraped or user-generated content may increase the risk of misinformation or manipulation.`,
    ),
    s(
      "Model risk and limitations",
      `Statistical and machine learning models are typically calibrated using historical relationships that may not persist. Overfitting, regime change, structural breaks, and correlation breakdowns may cause model signals to be misleading. NLP and LLM systems may “hallucinate” facts, mis-cite sources, or produce internally inconsistent reasoning. Model outputs should be treated as hypotheses rather than definitive conclusions unless validated through independent procedures.`,
    ),
    s(
      "Third-party and cloud services",
      `Certain tools may be hosted by third-party cloud providers or software vendors. Use of such services may involve transmission and temporary storage of data outside the Adviser’s premises. The Adviser maintains vendor diligence procedures, security reviews, and contractual protections designed to address confidentiality, data retention, subprocessors, and incident notification; however, no security program can eliminate all risk of unauthorized access.`,
    ),
    s(
      "Confidentiality and material nonpublic information",
      `The Adviser maintains policies addressing insider trading, information barriers, and handling of confidential issuer information. Personnel are trained not to input material nonpublic information into vendor tools that are not approved for confidential data. Breaches of policy may result in disciplinary action and referral to regulators.`,
    ),
    s(
      "Recordkeeping and supervision",
      `The Adviser maintains books and records in accordance with applicable Advisers Act and 1940 Act requirements. Supervisory procedures address approval of new tools, periodic review of vendor relationships, and escalation pathways when model behavior appears anomalous. The Chief Compliance Officer oversees testing of policies designed to prevent violations of federal securities laws.`,
    ),
    s(
      "No guarantee of outcome",
      `There is no assurance that the use of models or AI-assisted workflows will improve investment performance, reduce risk, or increase operational efficiency. The Adviser may modify or discontinue specific tools without shareholder approval except to the extent such change constitutes a material change requiring an update to the Fund’s registration statement.`,
    ),
    s(
      "Shareholder inquiries",
      `This disclosure is a working draft for internal review. Additional detail regarding specific vendors, model classes, and governance testing may be included in the SAI or in responses to Board requests. Shareholders should read the final prospectus and SAI when available.`,
    ),
  ].join("\n\n---\n\n");
}
