---
paths:
  - "src/lib/integrations/**"
---
# Integration Rules
- Each external API gets its own client file in src/lib/integrations/
- All API calls wrapped in try/catch with typed error handling
- Rate limiting: use token bucket or exponential backoff per service
- Cache responses in Turso when appropriate (company research, job listings)
- Log all API calls to agent_logs table for cost tracking
