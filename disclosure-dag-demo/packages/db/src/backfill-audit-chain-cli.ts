/**
 * One-time: populate integrity_prev_hash / integrity_record_hash for existing audit_events.
 * Run after migration 0011: `npm run db:backfill-audit-chain`
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, "../../../.env") });
loadEnv({ path: path.join(__dirname, "../../.env") });

const { backfillAuditIntegrityChain, closeDb } = await import("./index.js");

await backfillAuditIntegrityChain();
console.log("Audit integrity chain backfill complete.");
await closeDb();
