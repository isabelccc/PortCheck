import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

export type AppDb = PostgresJsDatabase<typeof schema>;

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(url, { max: 10 });
export const db = drizzle(client, { schema });
export * from "./schema.js";
