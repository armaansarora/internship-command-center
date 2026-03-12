# Turso Migration Research: better-sqlite3 to @libsql/client

**Project:** internship-command-center
**Researched:** 2026-03-09
**Mode:** Feasibility / Migration Guide
**Overall Confidence:** HIGH

---

## Executive Summary

Migrating from better-sqlite3 to Turso (via `@libsql/client`) with Drizzle ORM is a well-supported, straightforward migration. The Drizzle ecosystem has first-class Turso support with a dedicated `turso` dialect in drizzle-kit and a `drizzle-orm/libsql` driver. Your existing SQLite schema (using `drizzle-orm/sqlite-core` table builders) works 1:1 with Turso -- no schema changes required.

The **single largest code change** is converting all synchronous `.run()`, `.all()`, and `.get()` calls to `await`-prefixed async calls. The codebase has ~30 such call sites across 9 files. This is mechanical but touches every data access point.

Turso's embedded replicas provide a compelling local development story: you get a local SQLite file for fast reads with automatic sync to the cloud primary. For pure local dev without a cloud database, `@libsql/client` also supports `file:` URLs (local-only SQLite mode identical to better-sqlite3).

---

## 1. Package Changes

### Remove

```bash
npm uninstall better-sqlite3 @types/better-sqlite3
```

### Add

```bash
npm install @libsql/client
```

### Keep (unchanged)

- `drizzle-orm` -- same package, different import path
- `drizzle-kit` -- same package, change `dialect` in config
- All `drizzle-orm/sqlite-core` schema imports -- **no changes needed**

### Final Dependency Diff

```diff
  "dependencies": {
-   "better-sqlite3": "^12.6.2",
+   "@libsql/client": "^0.14.0",
    "drizzle-orm": "^0.45.1",
    ...
  },
  "devDependencies": {
-   "@types/better-sqlite3": "^7.6.13",
    "drizzle-kit": "^0.31.9",
    ...
  }
```

**Confidence:** HIGH -- verified via official Drizzle documentation and Turso SDK docs.

**Important version note:** drizzle-orm requires `@libsql/client@0.10.0` or higher if you use the `migrate` function. Current latest is 0.14.x which satisfies this.

---

## 2. Database Connection Changes

### Current Code (better-sqlite3)

```typescript
// src/db/index.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const DB_PATH = process.env.DATABASE_PATH || './data/internship.db';

function createDb() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  return drizzle(sqlite, { schema });
}

export const db = globalThis.__db ?? createDb();
```

### New Code (Turso / @libsql/client)

```typescript
// src/db/index.ts
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

function createDb() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return drizzle(client, { schema });
}

declare global {
  // eslint-disable-next-line no-var
  var __db: ReturnType<typeof createDb> | undefined;
}

export const db = globalThis.__db ?? createDb();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__db = db;
}

export { schema };
```

### Local Development Variant (no cloud needed)

For local-only development without a Turso Cloud account, `@libsql/client` supports `file:` protocol URLs:

```typescript
const client = createClient({
  url: 'file:./data/internship.db',
});
```

This behaves identically to better-sqlite3 -- same local SQLite file, no auth token needed. This is the simplest path for local development.

### Embedded Replica Variant (local + cloud sync)

For production-grade local development with cloud sync:

```typescript
const client = createClient({
  url: 'file:./data/local-replica.db',       // Local file for fast reads
  syncUrl: process.env.TURSO_DATABASE_URL!,   // Remote primary
  authToken: process.env.TURSO_AUTH_TOKEN!,
  syncInterval: 60,                           // Auto-sync every 60 seconds
});
```

**Confidence:** HIGH -- verified via official Drizzle Turso documentation and Turso embedded replicas docs.

---

## 3. Sync-to-Async Migration (CRITICAL)

This is the **most labor-intensive change**. better-sqlite3 uses synchronous APIs; `@libsql/client` is async-only.

### What Changes

| better-sqlite3 (sync) | @libsql/client (async) |
|------------------------|------------------------|
| `db.select().from(t).all()` | `await db.select().from(t).all()` |
| `db.select().from(t).get()` | `await db.select().from(t).get()` |
| `db.insert(t).values(v).run()` | `await db.insert(t).values(v).run()` |
| `db.update(t).set(v).where(w).run()` | `await db.update(t).set(v).where(w).run()` |
| `db.delete(t).where(w).run()` | `await db.delete(t).where(w).run()` |

### Affected Files (30 call sites across 9 files)

| File | Call Sites | Notes |
|------|-----------|-------|
| `src/db/seed.ts` | 2 | `.run()` for delete and insert |
| `src/lib/actions.ts` | 3 | `.run()` for insert/update/delete |
| `src/lib/research.ts` | 3 | `.get()` and `.run()` |
| `src/lib/dashboard.ts` | 4 | `.all()` for selects |
| `src/lib/follow-ups.ts` | 4 | `.all()` for selects |
| `src/lib/follow-up-actions.ts` | 5 | `.run()` for mutations |
| `src/lib/cover-letter-actions.ts` | 1 | `.all()` for select |
| `src/app/applications/page.tsx` | 1 | `.all()` for select |
| `src/app/applications/[id]/page.tsx` | 1 | `.get()` for select |
| `src/app/cover-letters/page.tsx` | 1 | `.all()` for select |
| `src/__tests__/seed.test.ts` | 4 | `.get()` and `.all()` |
| `src/__tests__/db.test.ts` | 3 | `.all()` for selects |

### Migration Pattern

Most functions in the codebase are already `async` (Next.js Server Actions, page components). The change is mechanical: add `await` before each database call.

For Server Components (page.tsx files), the components are already async:
```typescript
// Already async -- just add await
export default async function ApplicationsPage() {
  const apps = await db.select().from(applications).all();  // add await
}
```

For the seed script, the `seed()` function is already `async` but currently calls `.run()` synchronously. Change to `await`.

**Confidence:** HIGH -- this is the standard Drizzle pattern difference between sync/async drivers.

---

## 4. Turso Embedded Replicas

### How They Work

1. You configure a **local SQLite file** as your database via the `url` parameter
2. You specify a **remote Turso Cloud database** via `syncUrl`
3. **Reads** always hit the local replica (microsecond latency)
4. **Writes** go to the remote primary, then automatically sync back to the local replica
5. The writing replica sees its own writes immediately (read-your-writes guarantee)

### Configuration

```typescript
import { createClient } from '@libsql/client';

const client = createClient({
  url: 'file:./data/local-replica.db',
  syncUrl: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
  syncInterval: 60,  // seconds
});

// Manual sync when needed
await client.sync();
```

### When to Use Embedded Replicas

| Environment | Recommendation | Why |
|-------------|---------------|-----|
| Local dev (no cloud) | `file:` URL only | Simplest, no account needed |
| Local dev (with cloud) | Embedded replica | Test sync behavior |
| VPS / long-lived server | Embedded replica | Best read performance |
| Vercel serverless | Remote only (no replica) | Stateless -- no persistent file |
| Edge runtime | Remote only | No filesystem access |

### Vercel Deployment Warning

Embedded replicas are **NOT suitable for Vercel/Netlify serverless** because:
- Serverless functions are stateless -- no persistent local file
- Each invocation may run on a different instance
- The local replica file would be recreated each cold start

For Vercel deployment, use the remote-only connection:
```typescript
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
```

**Confidence:** HIGH -- verified via Turso embedded replicas documentation.

---

## 5. Migrating Existing Data from Local SQLite to Turso Cloud

### Method 1: Turso CLI Import (Recommended)

```bash
# 1. Install Turso CLI
brew install tursodatabase/tap/turso   # macOS
# or: curl -sSfL https://get.tur.so/install.sh | bash

# 2. Authenticate
turso auth signup   # first time
turso auth login    # subsequent

# 3. Ensure your database is in WAL mode (yours already is -- set in db/index.ts)
sqlite3 ./data/internship.db "PRAGMA journal_mode;"
# Should return: wal

# 4. Checkpoint the WAL file
sqlite3 ./data/internship.db "PRAGMA wal_checkpoint(truncate);"

# 5. Import the database
turso db import ./data/internship.db
# Creates a database named "internship" on Turso Cloud

# 6. Get your connection details
turso db show internship --url
turso db tokens create internship
```

### Method 2: SQL Dump + Shell

```bash
# Dump your local database
sqlite3 ./data/internship.db .dump > dump.sql

# Create a new Turso database
turso db create internship-command-center

# Import the dump
turso db shell internship-command-center < dump.sql
```

### Method 3: Platform API (Programmatic)

For CI/CD pipelines, Turso provides an HTTP upload API. Not recommended for a one-time migration.

### Post-Migration Validation

```bash
# Connect to your Turso database and verify
turso db shell internship

# Check tables exist
.tables

# Verify row counts
SELECT COUNT(*) FROM applications;
SELECT COUNT(*) FROM company_research;
SELECT COUNT(*) FROM follow_ups;
```

**Confidence:** HIGH -- verified via official Turso migration documentation.

---

## 6. Schema Compatibility

### Do SQLite schemas work 1:1 with Turso?

**YES.** Your schema uses standard SQLite types and Drizzle's `sqlite-core` builders. No changes needed.

| Feature Used | Turso Compatible | Notes |
|-------------|-----------------|-------|
| `sqliteTable()` | YES | Same builder |
| `integer().primaryKey({ autoIncrement: true })` | YES | Standard AUTOINCREMENT |
| `text()` with enums | YES | Text columns with app-level validation |
| `integer('col', { mode: 'timestamp' })` | YES | Stored as Unix epoch integer |
| `integer('col', { mode: 'boolean' })` | YES | Stored as 0/1 integer |
| `text('col', { mode: 'json' })` | YES | Stored as text, parsed by Drizzle |
| `.references()` with `onDelete: 'cascade'` | YES | Standard foreign keys |
| `index()` | YES | Standard indexes |
| `unique()` | YES | Standard unique constraints |

### JSON Column Behavior

Your `companyResearch` table uses `text('research_json', { mode: 'json' })`. This is **fully compatible** because:
- Drizzle stores JSON mode text columns as plain text strings (using `JSON.stringify()` / `JSON.parse()`)
- The data is a regular TEXT column in SQLite/Turso -- no special JSON extension needed
- If you ever use SQL-level JSON functions (`json_extract`, `json_object`, etc.), those are also supported in libSQL/Turso (confirmed working since April 2023)

### Timestamp Column Behavior

Your schema uses `integer('col', { mode: 'timestamp' })` throughout. This stores Unix epoch seconds as plain integers. **Fully compatible** -- no conversion needed. Drizzle handles the `Date <-> integer` mapping identically across both drivers.

### Schema Import Path (NO CHANGE)

```typescript
// This import stays exactly the same
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
```

**Confidence:** HIGH -- schema uses only standard SQLite types, verified against Turso compatibility docs.

---

## 7. Drizzle-kit Migrations with Turso

### Configuration Change

```typescript
// drizzle.config.ts -- BEFORE
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './src/db/migrations',
  schema: './src/db/schema.ts',
  dialect: 'sqlite',                                          // OLD
  dbCredentials: {
    url: process.env.DATABASE_PATH || './data/internship.db',  // OLD
  },
});

// drizzle.config.ts -- AFTER
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './src/db/migrations',
  schema: './src/db/schema.ts',
  dialect: 'turso',                                            // NEW
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,                      // NEW
    authToken: process.env.TURSO_AUTH_TOKEN,                   // NEW
  },
});
```

### Push vs Migrate

| Command | Use When | What It Does |
|---------|----------|-------------|
| `npx drizzle-kit push` | Local dev, prototyping | Directly applies schema changes to the database. No migration files. Fast iteration. |
| `npx drizzle-kit generate` | Pre-deploy | Generates SQL migration files in `./src/db/migrations` |
| `npx drizzle-kit migrate` | Deploy / CI | Applies generated migration files to the database |

### Recommendation for This Project

Use **`push`** for local development and **`generate` + `migrate`** for production deployments. This matches the existing pattern (you already have a `migrations` directory with generated SQL files).

### Enhanced ALTER TABLE Support

The `turso` dialect in drizzle-kit supports more ALTER TABLE operations than the `sqlite` dialect:
- Change data types
- Set and drop default values
- Set and drop NOT NULL constraints
- Add references to existing columns

This is because libSQL extends SQLite's limited ALTER TABLE support. This makes schema evolution easier with Turso than with vanilla SQLite.

### Known Issue: Statement Breakpoints

There is a known drizzle-kit bug where migration files ending with `-->` statement-breakpoint (or having consecutive breakpoints) cause a `LibsqlError: SQLITE_OK: not an error` during migration. Your existing migration file (`0000_late_wild_pack.sql`) uses these breakpoints but should work fine since it was generated for the initial schema. Be aware of this for future migrations.

### Existing Migrations Compatibility

Your existing migration files (`./src/db/migrations/`) will continue to work with the `turso` dialect. The SQL is standard SQLite DDL that Turso supports. However, the meta snapshots may need to be regenerated if drizzle-kit detects dialect differences. Safest approach: after switching to Turso, run `npx drizzle-kit push` once to establish the schema, then use `generate`/`migrate` going forward.

**Confidence:** HIGH -- verified via official Drizzle-kit documentation and Turso integration docs.

---

## 8. Environment Variables

### Required Variables

```env
# .env.local (Next.js)
TURSO_DATABASE_URL=libsql://your-database-name-your-org.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZDI1NTE5...
```

### URL Formats

| Format | Use Case |
|--------|----------|
| `libsql://db-name-org.turso.io` | Remote Turso Cloud (production) |
| `file:./data/internship.db` | Local file (development, no cloud) |
| `http://localhost:8080` | Local Turso dev server (`turso dev`) |

### Getting Credentials

```bash
# Get database URL
turso db show <database-name> --url

# Create auth token
turso db tokens create <database-name>

# Create non-expiring token (for production)
turso db tokens create <database-name> --expiration none
```

### Multi-Environment Setup

```env
# .env.development.local
TURSO_DATABASE_URL=file:./data/internship.db
# No auth token needed for local file

# .env.production.local
TURSO_DATABASE_URL=libsql://internship-yourorg.turso.io
TURSO_AUTH_TOKEN=eyJ...
```

**Confidence:** HIGH -- standard Turso setup, verified via docs.

---

## 9. Gotchas and Pitfalls

### CRITICAL: Sync-to-Async API Change

**Impact:** Every database call site must add `await`. Missing one causes the return type to be a Promise instead of data, leading to subtle runtime bugs (rendering `[object Promise]` or silently failing).

**Mitigation:** TypeScript will catch most issues. If a function is not `async`, calling `await` inside it will produce a compile error. However, in `.tsx` Server Components that are already async, a missing `await` may only surface at runtime.

**Recommendation:** After migration, `grep -r "\.all()\|\.get()\|\.run()" src/` and verify every hit has `await`.

### WAL Mode Pragma

**Impact:** Your current code sets `sqlite.pragma('journal_mode = WAL')` and `sqlite.pragma('synchronous = NORMAL')`. These are better-sqlite3 APIs. `@libsql/client` does not expose a `.pragma()` method.

**Mitigation:** Turso databases use WAL mode by default. You do not need to set it. Remove the pragma calls entirely. If you need to run a pragma, use `client.execute('PRAGMA journal_mode')`.

### Native Module Removal (Next.js Benefit)

**Impact:** better-sqlite3 is a native Node.js addon (C++ binding). It requires:
- `node-gyp` and a C++ compiler at install time
- `serverExternalPackages` config in Next.js (auto-included but still a bundling concern)
- Platform-specific binaries (breaks in Docker if architectures mismatch)

**Benefit:** `@libsql/client` is pure JavaScript/TypeScript with optional native components. It eliminates native compilation issues entirely. This is a significant deployment simplification.

### Foreign Key Dropping Causes Table Recreation

**Impact:** If you ever need to DROP a foreign key in a future migration, libSQL/Turso does not support `ALTER TABLE DROP FOREIGN KEY`. Drizzle-kit will work around this by recreating the entire table (copy data, drop old, rename new).

**Mitigation:** Avoid dropping foreign keys when possible. If necessary, be aware it involves a table rebuild.

### Edge Runtime Compatibility

**Impact:** `@libsql/client` has a web-compatible variant (`@libsql/client/web`) for edge runtimes. The default Node.js client uses native TCP connections.

**Mitigation:** For Next.js Server Components and Server Actions running on Node.js, use the default `@libsql/client`. Only use `@libsql/client/web` if you explicitly opt into edge runtime with `export const runtime = 'edge'`. Drizzle auto-selects the right sub-driver if you use `drizzle-orm/libsql`.

### Turso Free Tier Limits

| Resource | Free Tier Limit |
|----------|----------------|
| Databases | 500 |
| Locations | 3 |
| Storage | 9 GB total |
| Rows read | 1 billion / month |
| Rows written | 25 million / month |

For an internship tracking app, these limits are more than sufficient.

### No `better-sqlite3` Backup API

**Impact:** If you were using better-sqlite3's `.backup()` API, that is not available in `@libsql/client`. Turso manages backups on the cloud side.

**Mitigation:** Not relevant to this project (no `.backup()` usage found).

### Test Files Need Updates

Both test files (`src/__tests__/seed.test.ts`, `src/__tests__/db.test.ts`) import from `better-sqlite3` or use synchronous APIs. These need the same sync-to-async migration and import changes.

**Confidence:** HIGH -- based on code analysis and verified documentation.

---

## 10. Complete Migration Checklist

### Phase 1: Setup (5 min)

- [ ] `npm uninstall better-sqlite3 @types/better-sqlite3`
- [ ] `npm install @libsql/client`
- [ ] Add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to `.env.local`

### Phase 2: Connection (5 min)

- [ ] Rewrite `src/db/index.ts` (see Section 2 above)
- [ ] Remove WAL/synchronous pragma calls
- [ ] Update `drizzle.config.ts` dialect from `'sqlite'` to `'turso'`

### Phase 3: Async Migration (30-45 min)

- [ ] Add `await` to all `.all()`, `.get()`, `.run()` calls across 9+ files
- [ ] Ensure all calling functions are `async`
- [ ] Update seed script (`src/db/seed.ts`)
- [ ] Verify TypeScript compiles cleanly (`npx tsc --noEmit`)

### Phase 4: Data Migration (10 min)

- [ ] Install Turso CLI: `brew install tursodatabase/tap/turso`
- [ ] `turso auth login`
- [ ] `sqlite3 ./data/internship.db "PRAGMA wal_checkpoint(truncate);"`
- [ ] `turso db import ./data/internship.db`
- [ ] Get URL: `turso db show internship --url`
- [ ] Create token: `turso db tokens create internship`
- [ ] Verify: `turso db shell internship` then `SELECT COUNT(*) FROM applications;`

### Phase 5: Test (15 min)

- [ ] Update test files for async patterns
- [ ] Run `npm run build` (Next.js build succeeds)
- [ ] Run `npm run dev` and verify pages load
- [ ] Run test suite

### Total Estimated Time: ~1-1.5 hours

---

## 11. Recommended Development Workflow

### Option A: Local-Only Development (Simplest)

Use `file:` URL for development, remote URL for production.

```env
# .env.development.local
TURSO_DATABASE_URL=file:./data/internship.db

# .env.production
TURSO_DATABASE_URL=libsql://internship-yourorg.turso.io
TURSO_AUTH_TOKEN=eyJ...
```

This lets you develop without internet, with zero behavior change from better-sqlite3 (aside from the async API). Your local SQLite file is the same format.

### Option B: Cloud-Synced Development

Use embedded replicas for development to test sync behavior.

```env
# .env.development.local
TURSO_DATABASE_URL=file:./data/local-replica.db
TURSO_SYNC_URL=libsql://internship-yourorg.turso.io
TURSO_AUTH_TOKEN=eyJ...
```

### Recommendation: Start with Option A

Option A gives you the smoothest migration path. You can adopt embedded replicas later when you deploy to production and need cloud sync. The local `file:` mode means your development experience is nearly identical to today.

---

## 12. next.config.ts Changes

**None required.** Both `better-sqlite3` and `@libsql/client` are on Next.js's default `serverExternalPackages` list. They are automatically excluded from Server Component bundling.

The only change is removing `better-sqlite3` from your dependencies, which actually simplifies your build (no more native C++ module compilation).

---

## Sources

### Official Documentation (HIGH confidence)
- [Drizzle ORM -- Get Started with Turso](https://orm.drizzle.team/docs/get-started/turso-new)
- [Drizzle ORM -- Connect to Turso](https://orm.drizzle.team/docs/connect-turso)
- [Drizzle ORM -- Drizzle with Turso Tutorial](https://orm.drizzle.team/docs/tutorials/drizzle-with-turso)
- [Drizzle ORM -- SQLite Column Types](https://orm.drizzle.team/docs/column-types/sqlite)
- [Turso + Drizzle Integration](https://docs.turso.tech/sdk/ts/orm/drizzle)
- [Turso Embedded Replicas](https://docs.turso.tech/features/embedded-replicas/introduction)
- [Turso Migration Guide](https://docs.turso.tech/cloud/migrate-to-turso)
- [Turso SQLite Compatibility](https://docs.turso.tech/sql-reference/compatibility)
- [Next.js serverExternalPackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages)

### Community / Secondary Sources (MEDIUM confidence)
- [libsql/sqld JSON Support Issue #346](https://github.com/libsql/sqld/issues/346) -- confirmed JSON functions work
- [drizzle-kit 0.25.0 Release Notes](https://github.com/drizzle-team/drizzle-orm/releases/tag/drizzle-kit@0.25.0) -- turso dialect details
- [Turso Embedded Replicas Blog Post](https://turso.tech/blog/introducing-embedded-replicas-deploy-turso-anywhere-2085aa0dc242)
- [Turso Import Blog Post](https://turso.tech/blog/migrating-and-importing-sqlite-to-turso-just-got-easier)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Package changes | HIGH | Verified via official Drizzle + Turso docs |
| Connection code | HIGH | Verified via official docs, multiple examples |
| Schema compatibility | HIGH | Standard SQLite types, no Turso-specific issues |
| Async migration | HIGH | Well-documented driver difference, TypeScript catches errors |
| Data migration | HIGH | Turso CLI import is well-documented |
| drizzle-kit config | HIGH | `turso` dialect is first-class in drizzle-kit |
| Embedded replicas | HIGH | GA feature with good documentation |
| JSON columns | HIGH | Confirmed working; Drizzle stores as plain TEXT anyway |
| Gotchas | MEDIUM | Some edge cases (statement breakpoint bug) may have been fixed |
