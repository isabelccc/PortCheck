import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { documentVersions } from "./schema";

/** Codified policy / control statements for the compliance hub (demo). */
export const compliancePolicies = pgTable("compliance_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  /** e.g. access_control | change_control | evidence | review_queue */
  controlCategory: text("control_category").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Per-version QA / filing checklist (content QA, iXBRL, EDGAR pack, SEC-aligned controls).
 */
export const versionChecklistItems = pgTable(
  "version_checklist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentVersionId: uuid("document_version_id")
      .references(() => documentVersions.id)
      .notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    code: text("code").notNull(),
    label: text("label").notNull(),
    /** qa_content | ixbrl | edgar_pack | sec_control */
    category: text("category").notNull(),
    required: boolean("required").notNull().default(true),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: text("completed_by"),
    evidenceNote: text("evidence_note"),
  },
  (t) => [unique().on(t.documentVersionId, t.code)],
);

/** Demo Inline XBRL fact rows attached to a version (not EDGAR-submission grade). */
export const ixbrlFactDrafts = pgTable("ixbrl_fact_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentVersionId: uuid("document_version_id")
    .references(() => documentVersions.id)
    .notNull(),
  conceptQname: text("concept_qname").notNull(),
  contextRef: text("context_ref").notNull().default("c-1"),
  factValue: text("fact_value").notNull(),
  unitRef: text("unit_ref"),
  validatedOk: boolean("validated_ok").notNull().default(false),
  validationMessage: text("validation_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
