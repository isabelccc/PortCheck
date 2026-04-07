import { describe, expect, it } from "vitest";
import {
  evaluateSystemValidation,
  SYSTEM_VALIDATION_MIN_CHARS,
} from "../lib/validation/system-validation";

const filler = "word ".repeat(30);

describe("evaluateSystemValidation", () => {
  it("fails short content", () => {
    const r = evaluateSystemValidation({
      content: "short",
      documentSlug: "risk-factors",
      documentTitle: "Risk",
    });
    expect(r.ok).toBe(false);
    expect(r.checks.find((c) => c.id === "min_length")?.ok).toBe(false);
  });

  it("passes long structured risk body", () => {
    const body = [
      "Summary\n\n" + filler,
      "Risks\n\n" + filler,
      "More\n\n" + filler,
    ].join("\n\n---\n\n");
    const r = evaluateSystemValidation({
      content: body,
      documentSlug: "risk-factors",
      documentTitle: "Risk Factors",
    });
    expect(r.checks.find((c) => c.id === "min_length")?.ok).toBe(true);
    expect(r.checks.find((c) => c.id === "structure")?.ok).toBe(true);
    expect(r.ok).toBe(true);
  });

  it("requires fee percentages for fees slug", () => {
    const noPct = [
      "Fees\n\n" + filler + "\n\n" + filler,
      "More\n\n" + filler,
    ].join("\n\n");
    const bad = evaluateSystemValidation({
      content: noPct,
      documentSlug: "fees-and-expenses",
      documentTitle: "Fees",
    });
    expect(bad.checks.find((c) => c.id === "fee_numeric_sanity")?.ok).toBe(false);

    const good = evaluateSystemValidation({
      content:
        noPct +
        "\n\nAnnual fund operating expenses ......................... 0.54%\n",
      documentSlug: "fees-and-expenses",
      documentTitle: "Fees",
    });
    expect(good.checks.find((c) => c.id === "fee_numeric_sanity")?.ok).toBe(true);
  });

  it("rejects absurd fee percentage", () => {
    const r = evaluateSystemValidation({
      content: [
        "Fees\n\n" + filler,
        "Line\n\nManagement fee ................................ 99%\n",
      ].join("\n\n"),
      documentSlug: "fees-and-expenses",
      documentTitle: "Fees",
    });
    expect(r.checks.find((c) => c.id === "fee_numeric_sanity")?.ok).toBe(false);
  });

  it("validates optional PORTCHECK_DEMO_BPS", () => {
    const base = "A\n\n" + filler + "\n\nB\n\n" + filler + "\n\nC\n\n" + filler;
    expect(
      evaluateSystemValidation({
        content: base + "\nPORTCHECK_DEMO_BPS: 9999\n",
        documentSlug: "x",
        documentTitle: "T",
      }).checks.find((c) => c.id === "demo_bps")?.ok,
    ).toBe(false);
    expect(
      evaluateSystemValidation({
        content: base + "\nPORTCHECK_DEMO_BPS: 54\n",
        documentSlug: "x",
        documentTitle: "T",
      }).checks.find((c) => c.id === "demo_bps")?.ok,
    ).toBe(true);
  });

  it("exports sensible minimum length constant", () => {
    expect(SYSTEM_VALIDATION_MIN_CHARS).toBeGreaterThanOrEqual(80);
  });
});
