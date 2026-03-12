Run the full deployment readiness check. This is a sequential gate — each step must pass before the next runs.

Steps:
1. Run `pnpm lint` — must pass with zero errors
2. Run `pnpm tsc --noEmit` — must pass with zero type errors
3. Run `pnpm build` — must succeed
4. Run `pnpm test` — must pass
5. Output a pass/fail summary table
