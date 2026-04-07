import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/** Sponsor / legal entity behind one or more funds (demo data). */
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const funds = pgTable("funds", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id),
  name: text("name").notNull(),
  ticker: text("ticker"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fundId: uuid("fund_id")
      .references(() => funds.id)
      .notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.fundId, t.slug)],
);

/** One row per saved revision; link optional parent for lineage (first version has no parent). */
export const documentVersions = pgTable("document_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .references(() => documents.id)
    .notNull(),
  version: text("version").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("draft"),
  /** Null for the first version in a chain. */
  parentVersionId: uuid("parent_version_id").references(
    (): AnyPgColumn => documentVersions.id,
  ),
  /**
   * Snapshot of `content` before the most recent body save. Used for redlines when this row is
   * the only (or first) version on the document so there is no parent / prior sibling baseline.
   */
  redlineAnchorContent: text("redline_anchor_content"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
