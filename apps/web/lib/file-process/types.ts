import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { fileArtifacts } from "@repo/db";

export type FileArtifact = InferSelectModel<typeof fileArtifacts>;

export type FileArtifactInsert = InferInsertModel<typeof fileArtifacts>;

/** Lifecycle values stored in `file_artifacts.status`. */
export const FILE_ARTIFACT_STATUSES = [
  "pending",
  "processing",
  "ready",
  "failed",
  "rejected",
] as const;

export type FileArtifactStatus = (typeof FILE_ARTIFACT_STATUSES)[number];

/** Business role stored in `file_artifacts.artifact_type`. */
export const FILE_ARTIFACT_TYPES = [
  "user_upload",
  "generated_ixbrl",
  "edgar_pack_stub",
  "imported_source",
] as const;

export type FileArtifactType = (typeof FILE_ARTIFACT_TYPES)[number];
