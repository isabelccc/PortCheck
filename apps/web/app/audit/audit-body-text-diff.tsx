import { diffLines } from "diff";
import styles from "../disclosure.module.css";

type Props = {
  prior: string;
  next: string;
};

/** Redline diff for audit body saves: only added/removed lines (no unchanged context). */
export function AuditBodyTextDiff({ prior, next }: Props) {
  const parts = diffLines(prior, next, { newlineIsToken: true });
  const changed = parts.filter((p) => p.added || p.removed);

  if (changed.length === 0) {
    return (
      <div className={styles.auditDiffWrap} aria-label="Body text diff">
        <p className={styles.auditDiffEmpty}>No line-level additions or removals.</p>
      </div>
    );
  }

  return (
    <div className={styles.auditDiffWrap} aria-label="Body text diff (changed lines only)">
      {changed.map((p, i) =>
        p.added ? (
          <pre key={i} className={styles.auditDiffAdd}>
            + {p.value}
          </pre>
        ) : (
          <pre key={i} className={styles.auditDiffRemove}>
            - {p.value}
          </pre>
        ),
      )}
    </div>
  );
}
