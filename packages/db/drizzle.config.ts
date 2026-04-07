/**
 * Drizzle Kit CLI config (generate / push / migrate).
 * Loads monorepo root `.env` so `DATABASE_URL` matches Next.js / apps.
 *
 * @see https://orm.drizzle.team/docs/drizzle-config-file
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, "../../.env") });
loadEnv({ path: path.join(__dirname, ".env") });
export default defineConfig({
  schema: [
    "./src/schema/core.ts",
    "./src/schema/workflow.ts",
    "./src/schema/compliance.ts",
    "./src/schema/file.ts",
  ],
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});