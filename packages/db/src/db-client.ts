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

function postgresOptions(url: string): NonNullable<Parameters<typeof postgres>[1]> {
  const lower = url.toLowerCase();
  const isLocal =
    lower.includes("localhost") ||
    lower.includes("127.0.0.1");
  const sslDisabled = lower.includes("sslmode=disable");
  const useSsl = !isLocal && !sslDisabled;
  return {
    max: process.env.VERCEL ? 1 : 10,
    ...(useSsl ? { ssl: "require" as const } : {}),
  };
}

let pgClient: ReturnType<typeof postgres> | undefined;
let dbInstance: AppDb | undefined;

function ensureDb(): AppDb {
  if (dbInstance) return dbInstance;
  const url = getDatabaseUrl();
  pgClient = postgres(url, postgresOptions(url));
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

export async function closeDb(): Promise<void> {
  await pgClient?.end({ timeout: 5 });
  pgClient = undefined;
  dbInstance = undefined;
}
