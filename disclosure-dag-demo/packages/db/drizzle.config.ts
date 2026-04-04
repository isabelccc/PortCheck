/**
 * Drizzle Kit CLI config (generate / push / migrate).
 *
 * Run from this directory (`platform/packages/persistence-drizzle`) so paths resolve.
 *
 * @see https://orm.drizzle.team/docs/drizzle-config-file
 */
import { defineConfig } from "drizzle-kit";
import "dotenv/config";
export default defineConfig({
  schema: "./src/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});