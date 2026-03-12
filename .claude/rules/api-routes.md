---
paths:
  - "src/app/api/**"
---
# API Route Rules
- Use Next.js Route Handlers (GET, POST, etc.)
- Auth check: `const session = await auth(); if (!session) return Response.json({error}, {status: 401})`
- SSE streaming: `new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })`
- Inngest webhook: single `/api/inngest` route serves all functions
- Error responses: `{ error: string, code: string }` with appropriate HTTP status
