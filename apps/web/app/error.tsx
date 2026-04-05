"use client";

import Link from "next/link";
import { useEffect } from "react";
import styles from "./disclosure.module.css";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const msg = error.message ?? "";
  const isDbConfig =
    msg.includes("DATABASE_URL") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("password authentication failed") ||
    msg.includes("does not exist");

  return (
    <div className={styles.shell}>
      <main className={styles.inner}>
        <h1 className={styles.display}>Something went wrong</h1>
        <p className={styles.subtitle}>
          {isDbConfig
            ? "This page talks to PostgreSQL. The deployment is probably missing a working database connection or schema."
            : "A server error occurred."}
        </p>
        {isDbConfig ? (
          <div
            className={styles.empty}
            style={{ textAlign: "left", maxWidth: "40rem" }}
          >
            <ul className={styles.subtitle} style={{ margin: 0, paddingLeft: "1.25rem" }}>
              <li style={{ marginBottom: "0.5rem" }}>
                In Vercel → Project → Settings → Environment Variables, set{" "}
                <code>DATABASE_URL</code> for <strong>Production</strong> (and Preview if you use
                it). Use your cloud Postgres URL (e.g. Neon <em>pooling</em> URL), not{" "}
                <code>localhost</code>.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                Run migrations and seed against that same database from your machine:{" "}
                <code>cd packages/db && npm run db:migrate && npm run db:seed</code> with{" "}
                <code>DATABASE_URL</code> pointing at the cloud instance.
              </li>
              <li>
                Redeploy after changing env vars.
              </li>
            </ul>
          </div>
        ) : null}
        <p
          style={{
            marginTop: "1.25rem",
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button type="button" className={styles.back} onClick={() => reset()}>
            Try again
          </button>
          <Link href="/" className={styles.back}>
            Home
          </Link>
        </p>
      </main>
    </div>
  );
}
