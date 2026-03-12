Run a health check on all ICC integrations and infrastructure.

Steps:
1. Turso DB: Run `SELECT COUNT(*) FROM applications` (5s timeout)
2. TypeScript: Run `pnpm tsc --noEmit` (30s timeout)
3. ESLint: Run `pnpm lint` (15s timeout)
4. Vercel: Check latest deployment status via Vercel MCP
5. Output a pass/fail table with timing for each check
