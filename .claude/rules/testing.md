---
paths:
  - "**/*.test.*"
  - "**/*.spec.*"
---
# Testing Rules
- Vitest for all tests
- Test files: `*.test.ts` or `*.test.tsx` next to source
- Use `describe/it/expect` pattern
- Mock external APIs (Gmail, Anthropic, Turso) with vi.mock()
- Integration tests hit real Turso dev DB
- Component tests: @testing-library/react (install when needed)
