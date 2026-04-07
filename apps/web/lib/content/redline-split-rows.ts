/** One row in a side-by-side view derived from `diff.diffLines` chunks. */
export type RedlineSplitRow = {
  left: string;
  right: string;
  leftTone: "neutral" | "remove" | "same";
  rightTone: "neutral" | "add" | "same";
};

export type RedlinePart = { type: "add" | "remove" | "same"; value: string };

/**
 * Expands sequential diff line-hunks into aligned left/right rows for a split pane.
 * Same as reconstructing baseline vs current, but row-aligned for UI.
 */
export function expandRedlinePartsToSideBySideRows(parts: RedlinePart[]): RedlineSplitRow[] {
  const rows: RedlineSplitRow[] = [];
  for (const p of parts) {
    const { value } = p;
    if (value === "") {
      continue;
    }
    const lines = value.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      if (p.type === "same") {
        rows.push({
          left: line,
          right: line,
          leftTone: "same",
          rightTone: "same",
        });
      } else if (p.type === "remove") {
        rows.push({
          left: line,
          right: "",
          leftTone: "remove",
          rightTone: "neutral",
        });
      } else {
        rows.push({
          left: "",
          right: line,
          leftTone: "neutral",
          rightTone: "add",
        });
      }
    }
  }
  return rows;
}
