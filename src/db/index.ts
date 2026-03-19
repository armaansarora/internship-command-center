import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.SUPABASE_DB_URL!;

// Use a single connection for serverless (Vercel)
const client = postgres(connectionString, {
  prepare: false, // Required for Supabase transaction-mode pooler
});

export const db = drizzle(client, { schema });
