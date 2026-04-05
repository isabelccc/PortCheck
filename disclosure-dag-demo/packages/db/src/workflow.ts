import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { documentVersions } from "./schema";

export const workflowTemplates = pgTable("workflow_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const workflowNodes = pgTable(
  "workflow_nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .references(() => workflowTemplates.id)
      .notNull(),
    nodeKey: text("node_key").notNull(),
    label: text("label").notNull(),
    nodeType: text("node_type").notNull(),
    roleRequired: text("role_required"),
    positionX: integer("position_x"),
    positionY: integer("position_y"),
  },
  (t) => [unique().on(t.templateId, t.nodeKey)],
);

export const workflowEdges = pgTable("workflow_edges", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id")
    .references(() => workflowTemplates.id)
    .notNull(),
  fromNodeId: uuid("from_node_id")
    .references(() => workflowNodes.id)
    .notNull(),
  toNodeId: uuid("to_node_id")
    .references(() => workflowNodes.id)
    .notNull(),
});

export const workflowRuns = pgTable("workflow_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id")
    .references(() => workflowTemplates.id)
    .notNull(),
  documentVersionId: uuid("document_version_id")
    .references(() => documentVersions.id)
    .notNull(),
  status: text("status").default("running"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Matches migrated columns (single `created_at`; legacy `actorId` name in DB). */
export const stepExecutions = pgTable(
  "step_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .references(() => workflowRuns.id)
      .notNull(),
    nodeId: uuid("node_id")
      .references(() => workflowNodes.id)
      .notNull(),
    status: text("status").notNull(),
    actorId: text("actorId"),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.runId, t.nodeId)],
);

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: text("actor_id").notNull(),
  /** DB column is `actor` (historical name); stores action verb. */
  action: text("actor").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  /** Previous row's `integrity_record_hash` in chronological chain order (null = chain genesis). */
  integrityPrevHash: text("integrity_prev_hash"),
  /** SHA-256 of canonical event fields chained with `integrity_prev_hash` (tamper-evident). */
  integrityRecordHash: text("integrity_record_hash"),
});
