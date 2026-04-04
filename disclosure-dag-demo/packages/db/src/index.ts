import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as compliance from "./compliance";
import * as schemaCore from "./schema";
import * as workflow from "./workflow";

const schema = { ...schemaCore, ...workflow, ...compliance };

export type AppDb = PostgresJsDatabase<typeof schema>;

/** Postgres connection string from the environment (set `DATABASE_URL` in monorepo root `.env`). */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

const client = postgres(getDatabaseUrl(), { max: 10 });
export const db = drizzle(client, { schema });

/** Call from CLI scripts (e.g. seed) so Node can exit; Next.js keeps the process alive anyway. */
export async function closeDb(): Promise<void> {
  await client.end({ timeout: 5 });
}

export * from "./compliance";
export * from "./schema";
export * from "./workflow";
