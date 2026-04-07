import {
  bigint,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { documentVersions, documents, funds } from "./core";

/**
 * Binary or generated filing artifacts stored out-of-row (object storage key + hashes).
 * `document_version_id` is the primary anchor; `document_id` / `fund_id` are optional
 * denormalized FKs for cheaper list/filter queries when populated at insert time.
 */
export const fileArtifacts = pgTable("file_artifacts", {
  id: uuid("id").primaryKey().defaultRandom(),

  documentVersionId: uuid("document_version_id")
    .references(() => documentVersions.id)
    .notNull(),

  documentId: uuid("document_id").references(() => documents.id),

  fundId: uuid("fund_id").references(() => funds.id),

  /** Actor id / email — same convention as `audit_events.actor_id`, not a row id. */
  uploadedBy: text("uploaded_by").notNull(),

  storageKey: text("storage_key").notNull(),
  contentSha256: text("content_sha256").notNull(),
  byteSize: bigint("byte_size", { mode: "number" }).notNull(),

  mimeType: text("mime_type").notNull(),
  originalFilename: text("original_filename"),

  artifactType: text("artifact_type"),
  source: text("source"),

  /** e.g. pending | processing | ready | failed | rejected */
  status: text("status").notNull().default("pending"),

  errorCode: text("error_code"),
  errorMessage: text("error_message"),

  processedAt: timestamp("processed_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  /** Soft delete — null means active. */
  deletedAt: timestamp("deleted_at", { withTimezone: true }),

  checksumVerifiedAt: timestamp("checksum_verified_at", { withTimezone: true }),
});
