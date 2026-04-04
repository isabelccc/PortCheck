import Link from "next/link";
import styles from "../disclosure.module.css";

export default function DocumentsIndexPage() {
  return (
    <div className={styles.shell}>
      <main className={styles.inner}>
        <Link href="/funds" className={styles.back}>
          ← Funds
        </Link>
        <h1 className={styles.display}>Documents</h1>
        <p className={styles.subtitle}>
          Disclosure files are opened from a fund’s list. Start at{" "}
          <Link href="/funds" className={styles.inlineLink}>
            Funds
          </Link>
          , then choose <strong>Documents</strong> for a fund.
        </p>
        <div className={styles.empty} style={{ textAlign: "left" }}>
          <p style={{ marginBottom: "0.5rem" }}>
            Direct URL pattern:
          </p>
          <code className={styles.slug}>/documents/[documentId]</code>
        </div>
      </main>
    </div>
  );
}
