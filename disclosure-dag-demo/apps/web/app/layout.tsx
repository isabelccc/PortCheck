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
  title: "Disclosure DAG demo",
  description: "ETF-style disclosure documents (demo)",
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
            disclosure-demo
          </a>
          <nav className={styles.topBarNav} aria-label="Main">
            <a href="/" className={styles.topBarLink}>
              Home
            </a>
            <a href="/funds" className={styles.topBarLink}>
              Funds
            </a>
            <a href="/documents" className={styles.topBarLink}>
              Documents
            </a>
          </nav>
          <div className={styles.topBarRight}>
            <span className={styles.topBarHint}>localhost:3000</span>
            <a href="/funds" className={styles.topBarCta}>
              Open data
            </a>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
