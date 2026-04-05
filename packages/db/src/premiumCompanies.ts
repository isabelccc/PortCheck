/**
 * First ten sponsors: short display names and stable slugs (no long company prose).
 */
export type PremiumCompany = {
  name: string;
  slug: string;
};

export const PREMIUM_COMPANIES: PremiumCompany[] = [
  { name: "Corgi Capital Advisors", slug: "corgi-capital-advisors" },
  { name: "Anchor Technology Advisers", slug: "anchor-technology-advisers" },
  { name: "Meridian Fiduciary Services", slug: "meridian-fiduciary-services" },
  { name: "HarborPoint Investment Advisers", slug: "harborpoint-investment-advisers" },
  { name: "Sterling Ridge Wealth Partners", slug: "sterling-ridge-wealth-partners" },
  { name: "Cartesian Global Advisors", slug: "cartesian-global-advisors" },
  { name: "Ironwood Compliance & Advisory", slug: "ironwood-compliance-advisory" },
  { name: "Bluewater Index Strategies", slug: "bluewater-index-strategies" },
  { name: "Founders Collective Asset Management", slug: "founders-collective-asset-management" },
  { name: "Vertex Street Capital", slug: "vertex-street-capital" },
];
