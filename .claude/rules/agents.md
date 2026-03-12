---
paths:
  - "src/lib/agents/**"
---
# Agent Rules
- Use `generateText` from 'ai' with `maxSteps` for tool loops
- Define tools with Zod schemas using `tool()` from 'ai'
- Each agent: system prompt + tools + model selection
- CEO=opus, C-suite=sonnet, Workers=haiku
- Register Inngest functions for background execution
- Store results in Turso, emit completion events
