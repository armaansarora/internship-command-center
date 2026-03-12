Scaffold a new V2 agent.

$ARGUMENTS should be "AgentName DepartmentHead" (e.g., "EmailScanner COO").

Steps:
1. Create `src/lib/agents/<department>/<name>.ts` with:
   - System prompt defining role and constraints
   - Tool definitions using Zod schemas
   - generateText loop with maxSteps
   - Proper model selection (CEO=opus, C-suite=sonnet, Worker=haiku)
2. Create Inngest function at `src/lib/agents/<department>/<name>.inngest.ts`
3. Create test at `src/lib/agents/<department>/<name>.test.ts`
4. Register in the department's agent index
