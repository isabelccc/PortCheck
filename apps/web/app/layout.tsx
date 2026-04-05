import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import styles from "./disclosure.module.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "PortCheck — disclosure control",
  description:
    "Reference operating model for fund disclosure: versioned documents, QA gates, DAG workflow, and append-only audit trail — enforced on the server.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <header className={styles.topBar}>
          <a href="/" className={styles.topBarBrand}>
            PortCheck
          </a>
          <nav className={styles.topBarNav} aria-label="Main">
            <a href="/" className={styles.topBarLink}>
              Home
            </a>
            <a href="/documents" className={styles.topBarLink}>
              Documents
            </a>
            <a href="/reviews" className={styles.topBarLink}>
              Workflow
            </a>
            <a href="/compliance" className={styles.topBarLink}>
              Compliance
            </a>
          </nav>
          <div className={styles.topBarRight}>
            <a href="/documents" className={styles.topBarCta}>
              Browse documents
            </a>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
