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

let pgClient: ReturnType<typeof postgres> | undefined;
let dbInstance: AppDb | undefined;

function ensureDb(): AppDb {
  if (dbInstance) return dbInstance;
  pgClient = postgres(getDatabaseUrl(), { max: 10 });
  dbInstance = drizzle(pgClient, { schema });
  return dbInstance;
}

/**
 * Lazy connection: avoids throwing during module load when `DATABASE_URL` is not yet
 * in the environment (e.g. tooling). First query still requires `DATABASE_URL`.
 */
export const db: AppDb = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    const real = ensureDb();
    const value = Reflect.get(real, prop, receiver);
    if (typeof value === "function") {
      return value.bind(real);
    }
    return value;
  },
});

/** Call from CLI scripts (e.g. seed) so Node can exit; Next.js keeps the process alive anyway. */
export async function closeDb(): Promise<void> {
  await pgClient?.end({ timeout: 5 });
  pgClient = undefined;
  dbInstance = undefined;
}

export * from "./compliance";
export * from "./schema";
export * from "./workflow";
