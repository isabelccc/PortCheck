export type { AppDb } from "./client/db-client";
export { closeDb, db, getDatabaseUrl } from "./client/db-client";
export * from "./schema";
export {
  appendAuditEvent,
  backfillAuditIntegrityChain,
  computeAuditRecordHash,
  verifyAuditIntegrityChain,
  type AppendAuditInput,
  type AuditChainVerifyResult,
} from "./audit/audit-append";
