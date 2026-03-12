---
paths:
  - "src/db/**"
  - "drizzle.config.ts"
---
# Database Rules
- Turso/libSQL via Drizzle ORM
- TEXT primary keys: `text('id').primaryKey().$defaultFn(() => randomHex())`
- TEXT timestamps: `text('created_at').$defaultFn(() => new Date().toISOString())`
- Vectors: `F32_BLOB(1536)` with `libsql_vector_idx`
- Always add indexes for frequently queried columns
- Use `eq()`, `and()`, `or()` from drizzle-orm for queries
