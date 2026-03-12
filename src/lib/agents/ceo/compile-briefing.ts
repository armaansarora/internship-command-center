import { inngest } from "@/lib/inngest/client";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { agentLogger } from "@/lib/agents/logger";
import { eventBus } from "@/lib/agents/event-bus";
import { routeNotification } from "@/lib/agents/notification-router";

const randomHex = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

export const compileBriefing = inngest.createFunction(
  { id: "compile-briefing", retries: 1 },
  { event: "briefing/compile" },
  async ({ event, step }) => {
    const { executionId, departmentResults } = event.data;
    const briefingId = randomHex();
    const startTime = Date.now();

    const logId = await step.run("log-start", async () => {
      return agentLogger.start({
        agent: "ceo",
        action: "briefing-compile",
        inputSummary: `Compiling ${departmentResults.length} department results`,
      });
    });

    const briefing = await step.run("compile", async () => {
      const departmentSummaries = departmentResults
        .map((r) => {
          if (r.status === "complete") {
            return `## ${r.department.toUpperCase()}\nStatus: Complete\nResult: ${JSON.stringify(r.result)}`;
          }
          return `## ${r.department.toUpperCase()}\nStatus: ${r.status}\n${r.result ? JSON.stringify(r.result) : "No data"}`;
        })
        .join("\n\n");

      const result = await generateText({
        model: anthropic("claude-sonnet-4-20250514"),
        maxOutputTokens: 2048,
        temperature: 0.2,
        system: `You are compiling a daily briefing for an internship applicant.
Synthesize the department reports into a clear, actionable briefing.
Output valid JSON matching this structure:
{
  "headline": "Brief 1-line summary",
  "sections": [{ "department": "cro", "title": "...", "content": "...", "highlights": ["..."], "pendingActions": [{ "description": "...", "actionType": "...", "entityId": "..." }] }]
}`,
        prompt: `Compile this briefing:\n\n${departmentSummaries}`,
      });

      try {
        return JSON.parse(result.text) as {
          headline: string;
          sections: Array<{
            department: string;
            title: string;
            content: string;
            highlights: string[];
            pendingActions: Array<{
              description: string;
              actionType: string;
              entityId?: string;
            }>;
          }>;
        };
      } catch {
        return {
          headline: "Briefing compiled with partial data",
          sections: departmentResults.map((r) => ({
            department: r.department,
            title: `${r.department.toUpperCase()} Report`,
            content:
              r.status === "complete"
                ? JSON.stringify(r.result)
                : `Status: ${r.status}`,
            highlights: [] as string[],
            pendingActions: [] as Array<{
              description: string;
              actionType: string;
              entityId?: string;
            }>,
          })),
        };
      }
    });

    const durationMs = Date.now() - startTime;

    await step.run("store-briefing", async () => {
      const fullBriefing = {
        executionId,
        briefingId,
        headline: briefing.headline,
        sections: briefing.sections,
        metrics: {
          totalTokensUsed: 0,
          totalDurationMs: durationMs,
          departmentsInvolved: departmentResults.map((r) => r.department),
        },
        createdAt: new Date().toISOString(),
      };

      await agentLogger.complete(logId, {
        outputSummary: JSON.stringify(fullBriefing),
        durationMs,
      });
    });

    await step.run("publish-briefing-ready", async () => {
      eventBus.publish(executionId, {
        type: "briefing_ready",
        briefingId,
        headline: briefing.headline,
        timestamp: new Date().toISOString(),
      });
    });

    await step.run("send-briefing-ready", async () => {
      await inngest.send({
        name: "briefing/ready",
        data: {
          executionId,
          briefingId,
          summary: briefing.headline,
          timestamp: new Date().toISOString(),
        },
      });
    });

    await step.run("notify", async () => {
      await routeNotification({
        type: "briefing_ready",
        priority: "high",
        title: "Briefing Ready",
        body: briefing.headline,
        sourceAgent: "cro",
        channels: ["in_app", "push"],
        timestamp: new Date().toISOString(),
      });
    });
  }
);
