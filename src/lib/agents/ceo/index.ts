import { inngest } from "@/lib/inngest/client";
import { agentLogger } from "@/lib/agents/logger";
import { eventBus } from "@/lib/agents/event-bus";

const randomHex = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

const DEPARTMENTS = ["cro", "cio", "coo"] as const;
type Department = (typeof DEPARTMENTS)[number];

function buildInstructions(
  department: Department,
  prompt: string | undefined,
  trigger: string
): string {
  if (prompt) {
    const prefixes: Record<Department, string> = {
      cro: `User request: "${prompt}". Analyze the internship application pipeline accordingly.`,
      cio: `User request: "${prompt}". Analyze the technical landscape — research companies, roles, and technology stacks.`,
      coo: `User request: "${prompt}". Review operational status — deadlines, scheduling conflicts, and process efficiency.`,
    };
    return prefixes[department];
  }

  const defaults: Record<Department, string> = {
    cro: "Perform a comprehensive pipeline analysis: check for stale applications, identify action items, analyze conversion rates, and suggest follow-ups for applications that haven't been touched in 7+ days.",
    cio: "Analyze the technical landscape: research target companies' tech stacks, identify skill gaps, and surface relevant technical preparation items.",
    coo: "Review operational status: check upcoming deadlines, identify scheduling conflicts, verify follow-up cadences, and flag any process bottlenecks.",
  };
  return defaults[department];
}

export const ceoOrchestrator = inngest.createFunction(
  { id: "ceo-orchestrator", retries: 2 },
  { event: "bell/ring" },
  async ({ event, step }) => {
    const { executionId, userId, prompt, trigger, priority } = event.data;
    const startTime = Date.now();

    const logId = await step.run("log-start", async () => {
      return agentLogger.start({
        agent: "ceo",
        action: "orchestrate",
        inputSummary: prompt?.slice(0, 200) ?? `${trigger} bell ring`,
      });
    });

    await step.run("publish-ceo-start", async () => {
      eventBus.publish(executionId, {
        type: "agent_start",
        department: "cro",
        taskId: "ceo-planning",
        timestamp: new Date().toISOString(),
      });
    });

    // Phase 1: Decide which departments to dispatch
    const decision = await step.run("ceo-decide", async () => {
      eventBus.publish(executionId, {
        type: "agent_progress",
        department: "cro",
        step: "CEO is planning...",
        progress: 10,
        timestamp: new Date().toISOString(),
      });

      return {
        departments: DEPARTMENTS.map((dept) => ({
          department: dept,
          instructions: buildInstructions(dept, prompt, trigger),
          priority: priority,
          dependsOn: [] as string[],
        })),
        reasoning:
          "Dispatching CRO (pipeline), CIO (research), and COO (operations) in parallel.",
      };
    });

    // Generate a unique taskId per department
    const taskIds: Record<Department, string> = {
      cro: randomHex(),
      cio: randomHex(),
      coo: randomHex(),
    };

    // Dispatch all 3 departments in parallel
    for (const dept of DEPARTMENTS) {
      const deptEntry = decision.departments.find(
        (d) => d.department === dept
      )!;
      await step.run(`dispatch-${dept}`, async () => {
        await inngest.send({
          name: "ceo/dispatch",
          data: {
            executionId,
            department: dept,
            taskId: taskIds[dept],
            instructions: deptEntry.instructions,
            priority: deptEntry.priority,
          },
        });
      });
    }

    // Wait for all 3 departments to complete (or timeout)
    type DeptResult = {
      department: Department;
      taskId: string;
      status: "complete" | "error" | "timeout";
      result?: Record<string, unknown>;
    };

    const departmentResults: DeptResult[] = [];

    for (const dept of DEPARTMENTS) {
      const result = await step.waitForEvent(`wait-${dept}-complete`, {
        event: "agent/complete",
        if: `async.data.executionId == '${executionId}' && async.data.department == '${dept}'`,
        timeout: "5m",
      });

      if (!result) {
        // Timed out — check for error
        const errorResult = await step.waitForEvent(`wait-${dept}-error`, {
          event: "agent/error",
          if: `async.data.executionId == '${executionId}' && async.data.department == '${dept}'`,
          timeout: "10s",
        });

        departmentResults.push({
          department: dept,
          taskId: taskIds[dept],
          status: errorResult ? "error" : "timeout",
          result: errorResult
            ? { error: errorResult.data.error }
            : undefined,
        });
      } else {
        departmentResults.push({
          department: dept,
          taskId: taskIds[dept],
          status: "complete",
          result: result.data.result,
        });
      }
    }

    // Compile briefing with all department results
    await step.run("compile-briefing", async () => {
      await inngest.send({
        name: "briefing/compile",
        data: {
          executionId,
          departmentResults,
          timestamp: new Date().toISOString(),
        },
      });
    });

    const durationMs = Date.now() - startTime;
    const deptSummary = departmentResults
      .map((r) => `${r.department.toUpperCase()}:${r.status}`)
      .join(", ");

    await step.run("log-complete", async () => {
      await agentLogger.complete(logId, {
        outputSummary: `Dispatched ${DEPARTMENTS.length} depts (${deptSummary}). Duration: ${durationMs}ms`,
        durationMs,
      });
    });
  }
);
