import Link from "next/link";
import styles from "../disclosure.module.css";

export const DEFAULT_DOCUMENT_PAGE_SIZE = 10;

function buildHref(
  basePath: string,
  page: number,
  perPage: number,
  defaultPerPage: number,
  extraQuery?: Record<string, string>,
): string {
  const params = new URLSearchParams();
  if (extraQuery) {
    for (const [k, v] of Object.entries(extraQuery)) {
      if (v) params.set(k, v);
    }
  }
  if (page > 1) params.set("page", String(page));
  if (perPage !== defaultPerPage) {
    params.set("perPage", String(perPage));
  }
  const q = params.toString();
  return q ? `${basePath}?${q}` : basePath;
}

/** Shared query parser for any paginated list (funds, documents, …). */
export function parseListPagination(
  searchParams: { page?: string; perPage?: string },
  defaultPerPage: number = DEFAULT_DOCUMENT_PAGE_SIZE,
): { page: number; perPage: number } {
  const rawPage = Number.parseInt(searchParams.page ?? "1", 10);
  const rawPer = Number.parseInt(
    searchParams.perPage ?? String(defaultPerPage),
    10,
  );
  const perPage = Math.min(
    50,
    Math.max(5, Number.isFinite(rawPer) ? rawPer : defaultPerPage),
  );
  const page = Math.max(1, Number.isFinite(rawPage) ? rawPage : 1);
  return { page, perPage };
}

/** @deprecated Use `parseListPagination` — alias kept for existing imports. */
export const parseDocumentPagination = parseListPagination;

type DocumentPaginationProps = {
  basePath: string;
  page: number;
  perPage: number;
  total: number;
  /** Omit `perPage` from URLs when it matches this (must match `parseListPagination`’s default). */
  defaultPerPage?: number;
  /** Shown when `total === 0` (e.g. "No funds"). */
  zeroStateMessage?: string;
  /** Accessible name for the page-number nav. */
  navAriaLabel?: string;
  /** Preserved on every page link (e.g. audit filters: runId, entityType). */
  extraQuery?: Record<string, string>;
};

export function DocumentPagination({
  basePath,
  page,
  perPage,
  total,
  defaultPerPage = DEFAULT_DOCUMENT_PAGE_SIZE,
  zeroStateMessage = "No results",
  navAriaLabel = "Pages",
  extraQuery,
}: DocumentPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = Math.min(total, safePage * perPage);

  return (
    <div className={styles.pagination}>
      <p className={styles.paginationMeta}>
        {total === 0
          ? zeroStateMessage
          : `Showing ${from}–${to} of ${total}`}
        {totalPages > 1 ? ` · Page ${safePage} of ${totalPages}` : null}
      </p>
      {totalPages > 1 ? (
        <nav className={styles.paginationNav} aria-label={navAriaLabel}>
          {safePage <= 1 ? (
            <span
              className={`${styles.paginationLink} ${styles.paginationLinkDisabled}`}
            >
              Previous
            </span>
          ) : (
            <Link
              className={styles.paginationLink}
              href={buildHref(
                basePath,
                safePage - 1,
                perPage,
                defaultPerPage,
                extraQuery,
              )}
              scroll={false}
            >
              Previous
            </Link>
          )}
          <div className={styles.paginationPages}>
            {pageNumbers(safePage, totalPages).map((n, i) =>
              n === "…" ? (
                <span key={`e-${i}`} className={styles.paginationEllipsis}>
                  …
                </span>
              ) : (
                <Link
                  key={n}
                  href={buildHref(basePath, n, perPage, defaultPerPage, extraQuery)}
                  scroll={false}
                  className={
                    n === safePage
                      ? `${styles.paginationLink} ${styles.paginationLinkCurrent}`
                      : styles.paginationLink
                  }
                  aria-current={n === safePage ? "page" : undefined}
                >
                  {n}
                </Link>
              ),
            )}
          </div>
          {safePage >= totalPages ? (
            <span
              className={`${styles.paginationLink} ${styles.paginationLinkDisabled}`}
            >
              Next
            </span>
          ) : (
            <Link
              className={styles.paginationLink}
              href={buildHref(
                basePath,
                safePage + 1,
                perPage,
                defaultPerPage,
                extraQuery,
              )}
              scroll={false}
            >
              Next
            </Link>
          )}
        </nav>
      ) : null}
    </div>
  );
}

function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 9) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let n = current - 2; n <= current + 2; n++) {
    if (n >= 1 && n <= total) pages.add(n);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i]!;
    if (i > 0 && n - sorted[i - 1]! > 1) out.push("…");
    out.push(n);
  }
  return out;
}
