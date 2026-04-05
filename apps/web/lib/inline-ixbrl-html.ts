/**
 * Build a minimal Inline XBRL (iXBRL) 1.1-style HTML document for demo export.
 * Not submission-grade; uses placeholder CIK/context and taxonomy URIs for known prefixes.
 */

export type IxbrlFactRow = {
  conceptQname: string;
  contextRef: string;
  factValue: string;
  unitRef: string | null;
};

const TAXONOMY_NS: Record<string, string> = {
  dei: "http://xbrl.sec.gov/dei/2024",
  usgaap: "http://fasb.org/us-gaap/2024",
  "us-gaap": "http://fasb.org/us-gaap/2024",
};

function escapeXmlText(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeHtml(s: string): string {
  return escapeXmlText(s);
}

export function parseConceptQName(
  qname: string,
): { prefix: string; local: string } | null {
  const t = qname.trim();
  const i = t.indexOf(":");
  if (i <= 0 || i === t.length - 1) return null;
  const prefix = t.slice(0, i);
  const local = t.slice(i + 1);
  if (!/^[a-z][a-z0-9._-]*$/i.test(prefix) || !local) return null;
  return { prefix, local };
}

function taxonomyUriForPrefix(prefix: string): string {
  const key = prefix.toLowerCase();
  return (
    TAXONOMY_NS[key] ??
    `https://portcheck.local/xbrl/demo/${encodeURIComponent(prefix)}`
  );
}

function isNumericWithUnit(value: string, unitRef: string | null): boolean {
  if (!unitRef?.trim()) return false;
  return /^-?\d+(\.\d+)?$/.test(value.trim());
}

function unitIdForRef(unitRef: string): string {
  const u = unitRef.trim();
  if (/^[a-zA-Z0-9._-]+$/.test(u)) return u;
  return "u-demo";
}

function measureForUnit(unitRef: string): string {
  const u = unitRef.trim().toUpperCase();
  if (u === "USD" || u === "U-USD") return "iso4217:USD";
  if (u === "EUR" || u === "U-EUR") return "iso4217:EUR";
  if (u === "SHARES" || u === "U-SHARES") return "xbrli:shares";
  return "iso4217:USD";
}

function renderFact(f: IxbrlFactRow, index: number): string {
  const q = parseConceptQName(f.conceptQname);
  if (!q) {
    return `<!-- skipped invalid concept QName: ${escapeXmlText(f.conceptQname)} -->`;
  }
  const nameAttr = `${q.prefix}:${q.local}`;
  const ctx = escapeXmlText((f.contextRef || "c-1").trim());
  const id = `ix-demo-${index}`;
  const val = f.factValue;

  if (isNumericWithUnit(val, f.unitRef)) {
    const uid = escapeXmlText(unitIdForRef(f.unitRef!));
    const dec = val.trim().includes(".") ? "2" : "0";
    return `<ix:nonFraction name="${nameAttr}" contextRef="${ctx}" unitRef="${uid}" decimals="${dec}" id="${id}">${escapeXmlText(val.trim())}</ix:nonFraction>`;
  }

  return `<ix:nonNumeric name="${nameAttr}" contextRef="${ctx}" id="${id}">${escapeXmlText(val)}</ix:nonNumeric>`;
}

export function buildInlineIxbrlHtml(input: {
  documentTitle: string;
  versionLabel: string;
  slug: string;
  bodyPlainText: string;
  facts: IxbrlFactRow[];
}): string {
  const { documentTitle, versionLabel, slug, bodyPlainText, facts } = input;

  const prefixes = new Set<string>();
  for (const f of facts) {
    const q = parseConceptQName(f.conceptQname);
    if (q) prefixes.add(q.prefix);
  }

  const xmlnsAttrs = [
    'xmlns="http://www.w3.org/1999/xhtml"',
    'xmlns:ix="http://www.xbrl.org/2013/inlineXBRL"',
    'xmlns:ixt="http://www.xbrl.org/inlineXBRL/transformation/2015-02-26"',
    'xmlns:link="http://www.xbrl.org/2003/linkbase"',
    'xmlns:xlink="http://www.w3.org/1999/xlink"',
    'xmlns:xbrli="http://www.xbrl.org/2003/instance"',
    'xmlns:iso4217="http://www.xbrl.org/2003/iso4217"',
  ];
  for (const px of [...prefixes].sort()) {
    xmlnsAttrs.push(`xmlns:${px}="${taxonomyUriForPrefix(px)}"`);
  }

  const contextRefs = [
    ...new Set(
      facts.map((f) => (f.contextRef || "c-1").trim()).filter(Boolean),
    ),
  ];

  const unitRefs = [
    ...new Set(
      facts.map((f) => f.unitRef?.trim()).filter((u): u is string => Boolean(u)),
    ),
  ];

  const contextsXml = contextRefs
    .map(
      (cid) => `<xbrli:context id="${escapeXmlText(cid)}">
  <xbrli:entity>
    <xbrli:identifier scheme="http://www.sec.gov/CIK">0001999999</xbrli:identifier>
  </xbrli:entity>
  <xbrli:period>
    <xbrli:startDate>2025-01-01</xbrli:startDate>
    <xbrli:endDate>2025-03-31</xbrli:endDate>
  </xbrli:period>
</xbrli:context>`,
    )
    .join("\n");

  const unitsXml = unitRefs
    .map((uref) => {
      const id = escapeXmlText(unitIdForRef(uref));
      const meas = measureForUnit(uref);
      return `<xbrli:unit id="${id}"><xbrli:measure>${meas}</xbrli:measure></xbrli:unit>`;
    })
    .join("\n");

  const headerBlock =
    contextRefs.length > 0 || unitRefs.length > 0
      ? `
  <div style="display:none">
    <ix:header>
      <ix:hidden>
${contextsXml}
${unitsXml}
      </ix:hidden>
    </ix:header>
  </div>`
      : "";

  const factsSection =
    facts.length > 0
      ? `
    <section style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid #ccc" aria-label="Inline XBRL tagged facts">
      <h2 style="font-size:0.95rem;margin:0 0 0.75rem">Tagged facts (demo iXBRL)</h2>
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
        <thead>
          <tr>
            <th style="text-align:left;border:1px solid #ccc;padding:0.35rem;background:#f5f5f5">Concept</th>
            <th style="text-align:left;border:1px solid #ccc;padding:0.35rem;background:#f5f5f5">Context</th>
            <th style="text-align:left;border:1px solid #ccc;padding:0.35rem;background:#f5f5f5">Value</th>
          </tr>
        </thead>
        <tbody>
${facts
  .map((f, i) => {
    const cell = renderFact(f, i);
    return `          <tr>
            <td style="border:1px solid #ccc;padding:0.35rem;vertical-align:top"><code>${escapeHtml(f.conceptQname)}</code></td>
            <td style="border:1px solid #ccc;padding:0.35rem;vertical-align:top"><code>${escapeHtml(f.contextRef)}</code></td>
            <td style="border:1px solid #ccc;padding:0.35rem;vertical-align:top">${cell}</td>
          </tr>`;
  })
  .join("\n")}
        </tbody>
      </table>
    </section>`
      : `
    <p style="font-size:0.85rem;color:#666;margin-top:1rem">No rows in <code>ixbrl_fact_drafts</code> for this version — narrative only.</p>`;

  const title = escapeHtml(documentTitle);
  const ver = escapeHtml(versionLabel);
  const slugEsc = escapeHtml(slug);
  const body = escapeHtml(bodyPlainText);

  return `<!DOCTYPE html>
<html ${xmlnsAttrs.join("\n  ")} lang="en" xml:lang="en">
<head>
  <meta charset="utf-8" />
  <title>Demo exhibit — ${title} (${ver})</title>
  <meta name="robots" content="noindex" />
</head>
<body>
${headerBlock}
  <header style="font-family:system-ui,sans-serif;padding:1rem;border-bottom:1px solid #ccc">
    <h1 style="font-size:1.1rem;margin:0">${title}</h1>
    <p style="margin:0.35rem 0 0;font-size:0.85rem;color:#444">
      Version ${ver} · slug ${slugEsc} · <strong>DEMO ONLY — NOT FOR EDGAR LIVE</strong>
    </p>
  </header>
  <main style="font-family:system-ui,sans-serif;padding:1rem;max-width:52rem">
    <pre style="white-space:pre-wrap;word-break:break-word;font-size:0.9rem;line-height:1.45">${body}</pre>
${factsSection}
  </main>
  <footer style="font-family:system-ui,sans-serif;padding:1rem;border-top:1px solid #ccc;font-size:0.75rem;color:#666">
    Generated by PortCheck demo. This file uses Inline XBRL (iXBRL) 1.1-style markup for local testing;
    it is not a valid SEC submission package (no full taxonomy linkbase, no EDGAR Live checks).
  </footer>
</body>
</html>`;
}
