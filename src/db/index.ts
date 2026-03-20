import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// ---------------------------------------------------------------------------
// Validate required environment variable at startup.
// Fail fast with a clear message rather than a cryptic connection error.
// ---------------------------------------------------------------------------
const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  throw new Error(
    "Missing env var: SUPABASE_DB_URL\n" +
    "Copy .env.example to .env.local and set your Supabase database URL."
  );
}

// ---------------------------------------------------------------------------
// Serverless-optimised postgres client (Vercel / edge-compatible).
//
// Key settings for Supabase transaction-mode pooler (pgBouncer):
//   prepare: false   — named prepared statements are not supported in
//                      transaction-mode pooling.
//   max: 1           — each serverless invocation should own at most one
//                      connection; the pooler handles multiplexing.
//   idle_timeout: 20 — release the connection after 20 s of inactivity so
//                      the pooler slot is returned promptly.
//   connect_timeout: 10 — surface slow/broken connections early.
// ---------------------------------------------------------------------------
const client = postgres(connectionString, {
  prepare: false,
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

// Re-export schema so callers can do:
//   import { db, schema } from "@/db"
export { schema };

// Re-export all inferred types for convenience so consumers don't need to
// import from "@/db/schema" directly.
export type {
  UserProfile,
  NewUserProfile,
  Company,
  NewCompany,
  Application,
  NewApplication,
  Contact,
  NewContact,
  Email,
  NewEmail,
  Document,
  NewDocument,
  Interview,
  NewInterview,
  CalendarEvent,
  NewCalendarEvent,
  OutreachItem,
  NewOutreachItem,
  Notification,
  NewNotification,
} from "./schema";
