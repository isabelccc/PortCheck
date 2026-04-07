/** ILIKE pattern: %query% with % and _ escaped for PostgreSQL LIKE. */
export function listSearchIlikePattern(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  return `%${t.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
}
