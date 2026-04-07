/**
 * Automatic “system validation” before submit / approve (demo).
 * Pure functions — safe to run in Client Components for live preview.
 */

export type SystemValidationCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
};

export type SystemValidationResult = {
  ok: boolean;
  checks: SystemValidationCheck[];
};

/** Minimum characters in trimmed body (after save). */
export const SYSTEM_VALIDATION_MIN_CHARS = 100;

/** Fee-like lines: percentages on these lines are sanity-checked (mock control). */
const FEE_LINE_HINT =
  /(expense|fee|MER|operating|management|annual\s+fund|acquired\s+fund)/i;

function extractPercentsOnFeeLines(text: string): number[] {
  const out: number[] = [];
  for (const line of text.split("\n")) {
    if (!FEE_LINE_HINT.test(line)) continue;
    const matches = line.matchAll(/(\d+(?:\.\d+)?)\s*%/g);
    for (const m of matches) {
      out.push(Number.parseFloat(m[1]!));
    }
  }
  return out;
}

function isFeesSlug(slug: string): boolean {
  const s = slug.toLowerCase();
  return s.includes("fee") || s.includes("expense");
}

function isAiSlug(slug: string): boolean {
  const s = slug.toLowerCase();
  return s.includes("ai") || s.includes("artificial");
}

/**
 * Optional machine-readable demo metrics (if present, must be sane).
 * Example line: PORTCHECK_DEMO_BPS: 54
 */
function parseOptionalDemoBps(text: string): number | null {
  const m = text.match(/^\s*PORTCHECK_DEMO_BPS:\s*(\d+)\s*$/im);
  if (!m) return null;
  return Number.parseInt(m[1]!, 10);
}

export type SystemValidationInput = {
  content: string;
  documentSlug: string;
  documentTitle: string;
};

export function evaluateSystemValidation(
  input: SystemValidationInput,
): SystemValidationResult {
  const raw = input.content ?? "";
  const trimmed = raw.trim();
  const slug = input.documentSlug.trim();
  const checks: SystemValidationCheck[] = [];

  checks.push({
    id: "min_length",
    label: `Document body length ≥ ${SYSTEM_VALIDATION_MIN_CHARS} characters`,
    ok: trimmed.length >= SYSTEM_VALIDATION_MIN_CHARS,
    detail:
      trimmed.length < SYSTEM_VALIDATION_MIN_CHARS
        ? `Currently ${trimmed.length} characters after trim.`
        : undefined,
  });

  const paragraphBreaks = (raw.match(/\n\n+/g) ?? []).length;
  const nonEmptyLines = raw.split("\n").filter((l) => l.trim().length > 0).length;
  checks.push({
    id: "structure",
    label: "Structured body (multiple paragraphs or sections)",
    ok: paragraphBreaks >= 2 || nonEmptyLines >= 4,
    detail:
      paragraphBreaks < 2 && nonEmptyLines < 4
        ? "Add section breaks or additional paragraphs."
        : undefined,
  });

  const title = input.documentTitle.trim();
  checks.push({
    id: "title_present",
    label: "Document title available for filing context",
    ok: title.length >= 2,
    detail: title.length < 2 ? "Title is missing or too short." : undefined,
  });

  if (isFeesSlug(slug)) {
    const percents = extractPercentsOnFeeLines(raw);
    const bad = percents.find((p) => !Number.isFinite(p) || p < 0 || p > 25);
    checks.push({
      id: "fee_numeric_sanity",
      label: "Fee / expense lines contain percentages within 0–25% (demo band)",
      ok: percents.length > 0 && !bad,
      detail:
        percents.length === 0
          ? "No percentages found on fee/expense-related lines."
          : bad !== undefined
            ? `Out-of-range value: ${bad}%`
            : undefined,
    });
  }

  if (isAiSlug(slug)) {
    checks.push({
      id: "ai_topic",
      label: "Body references AI / automation (slug expects AI disclosure)",
      ok: /\bai\b|artificial intelligence|machine learning|model/i.test(raw),
      detail: "Include AI, artificial intelligence, or model language.",
    });
  }

  const bps = parseOptionalDemoBps(raw);
  if (bps != null) {
    checks.push({
      id: "demo_bps",
      label: "PORTCHECK_DEMO_BPS in valid range (0–500)",
      ok: bps >= 0 && bps <= 500,
      detail: `Parsed ${bps} bps.`,
    });
  }

  const ok = checks.every((c) => c.ok);
  return { ok, checks };
}
