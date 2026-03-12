import { inngest } from "@/lib/inngest/client";
import { agentLogger } from "@/lib/agents/logger";
import { eventBus } from "@/lib/agents/event-bus";

const randomHex = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

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

    // Phase 1: Always dispatch CRO for pipeline analysis
    const decision = await step.run("ceo-decide", async () => {
      eventBus.publish(executionId, {
        type: "agent_progress",
        department: "cro",
        step: "CEO is planning...",
        progress: 10,
        timestamp: new Date().toISOString(),
      });

      const defaultInstructions = prompt
        ? `User request: "${prompt}". Analyze the internship application pipeline accordingly.`
        : "Perform a comprehensive pipeline analysis: check for stale applications, identify action items, analyze conversion rates, and suggest follow-ups for applications that haven't been touched in 7+ days.";

      return {
        departments: [
          {
            department: "cro" as const,
            instructions: defaultInstructions,
            priority: priority,
            dependsOn: [] as string[],
          },
        ],
        reasoning: "Phase 1: CRO pipeline analysis is the primary department.",
      };
    });

    const taskId = randomHex();
    await step.run("dispatch-cro", async () => {
      await inngest.send({
        name: "ceo/dispatch",
        data: {
          executionId,
          department: "cro",
          taskId,
          instructions: decision.departments[0]!.instructions,
          priority: decision.departments[0]!.priority,
        },
      });
    });

    // Wait for CRO to complete (or error)
    const croResult = await step.waitForEvent("wait-cro-complete", {
      event: "agent/complete",
      match: "data.executionId",
      timeout: "5m",
    });

    if (!croResult) {
      // Timed out — check for error
      const croError = await step.waitForEvent("wait-cro-error", {
        event: "agent/error",
        match: "data.executionId",
        timeout: "10s",
      });

      await step.run("compile-partial", async () => {
        await inngest.send({
          name: "briefing/compile",
          data: {
            executionId,
            departmentResults: [{
              department: "cro",
              taskId,
              status: croError ? "error" as const : "timeout" as const,
              result: croError ? { error: croError.data.error } : undefined,
            }],
            timestamp: new Date().toISOString(),
          },
        });
      });
    } else {
      await step.run("compile-full", async () => {
        await inngest.send({
          name: "briefing/compile",
          data: {
            executionId,
            departmentResults: [{
              department: "cro",
              taskId,
              status: "complete" as const,
              result: croResult.data.result,
            }],
            timestamp: new Date().toISOString(),
          },
        });
      });
    }

    const durationMs = Date.now() - startTime;
    await step.run("log-complete", async () => {
      await agentLogger.complete(logId, {
        outputSummary: `Dispatched CRO. Duration: ${durationMs}ms`,
        durationMs,
      });
    });
  }
);
