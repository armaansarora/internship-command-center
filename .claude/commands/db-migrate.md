Generate and apply a Drizzle database migration.

$ARGUMENTS should describe what the migration does.

Steps:
1. Read the current schema at src/db/schema.ts
2. Make the requested schema changes
3. Run `pnpm drizzle-kit generate` to create migration SQL
4. Review the generated SQL in src/db/migrations/
5. Run `pnpm db:push` to apply
6. Verify with `pnpm db:studio` or a test query
