import { inngest } from "@/lib/inngest/client";
import { generateText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod/v4";
import { agentLogger } from "@/lib/agents/logger";
import { eventBus } from "@/lib/agents/event-bus";
import {
  queryApplications,
  updateApplicationStatus,
  suggestFollowUp,
  analyzeConversionRates,
} from "./tools";

const CRO_DEFINITION = {
  department: "cro" as const,
  name: "Chief Revenue Officer",
  codename: "Revenue",
  model: "claude-sonnet-4-20250514",
  maxTokens: 4096,
  temperature: 0.3,
};

export const croAgent = inngest.createFunction(
  {
    id: "cro-agent",
    retries: 3,
  },
  { event: "ceo/dispatch" },
  async ({ event, step }) => {
    if (event.data.department !== "cro") return;

    const { executionId, taskId, instructions, priority } = event.data;
    const startTime = Date.now();

    const logId = await step.run("log-start", async () => {
      return agentLogger.start({
        agent: "cro",
        action: "pipeline-analysis",
        inputSummary: instructions.slice(0, 200),
      });
    });

    await step.run("publish-start", async () => {
      eventBus.publish(executionId, {
        type: "agent_start",
        department: "cro",
        taskId,
        timestamp: new Date().toISOString(),
      });
    });

    try {
      const result = await step.run("cro-generate", async () => {
        eventBus.publish(executionId, {
          type: "agent_progress",
          department: "cro",
          step: "Analyzing pipeline...",
          progress: 30,
          timestamp: new Date().toISOString(),
        });

        return generateText({
          model: anthropic(CRO_DEFINITION.model),
          maxTokens: CRO_DEFINITION.maxTokens,
          temperature: CRO_DEFINITION.temperature,
          system: `You are the Chief Revenue Officer (CRO) of an internship command center.
Your job is to analyze the application pipeline, identify action items, suggest follow-ups for stale applications, and track conversion rates.
Be concise and actionable. Focus on what needs attention NOW.`,
          prompt: instructions,
          tools: {
            queryApplications: tool({
              description: "Query the applications table with filters",
              parameters: z.object({
                status: z.array(z.string()).optional(),
                tier: z.array(z.number()).optional(),
                companyId: z.string().optional(),
                createdAfter: z.string().optional(),
                limit: z.number().default(50),
              }),
              execute: async (params) => queryApplications(params),
            }),
            updateApplicationStatus: tool({
              description: "Update an application's status",
              parameters: z.object({
                applicationId: z.string(),
                newStatus: z.string(),
                reason: z.string(),
              }),
              execute: async (params) => updateApplicationStatus(params),
            }),
            suggestFollowUp: tool({
              description: "Draft a follow-up outreach for stale applications",
              parameters: z.object({
                applicationId: z.string(),
                contactId: z.string().optional(),
                suggestedSubject: z.string(),
                suggestedBody: z.string(),
              }),
              execute: async (params) => suggestFollowUp(params),
            }),
            analyzeConversionRates: tool({
              description: "Calculate conversion rates between pipeline stages",
              parameters: z.object({
                fromDate: z.string().optional(),
                toDate: z.string().optional(),
              }),
              execute: async (params) => analyzeConversionRates(params),
            }),
          },
          maxSteps: 5,
        });
      });

      const durationMs = Date.now() - startTime;
      const tokenUsage = {
        input: result.usage?.promptTokens ?? 0,
        output: result.usage?.completionTokens ?? 0,
      };

      await step.run("log-complete", async () => {
        await agentLogger.complete(logId, {
          outputSummary: result.text.slice(0, 500),
          tokensUsed: tokenUsage.input + tokenUsage.output,
          durationMs,
        });
      });

      await step.run("publish-complete", async () => {
        eventBus.publish(executionId, {
          type: "agent_complete",
          department: "cro",
          summary: result.text.slice(0, 300),
          timestamp: new Date().toISOString(),
        });
      });

      await step.run("send-complete-event", async () => {
        await inngest.send({
          name: "agent/complete",
          data: {
            executionId,
            department: "cro",
            taskId,
            result: { summary: result.text, toolCalls: result.toolCalls?.length ?? 0 },
            tokenUsage,
            durationMs,
            timestamp: new Date().toISOString(),
          },
        });
      });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      await step.run("log-fail", async () => {
        await agentLogger.fail(logId, { error: errorMsg, durationMs });
      });

      await step.run("publish-error", async () => {
        eventBus.publish(executionId, {
          type: "agent_error",
          department: "cro",
          error: errorMsg,
          retryable: true,
          timestamp: new Date().toISOString(),
        });
      });

      await step.run("send-error-event", async () => {
        await inngest.send({
          name: "agent/error",
          data: {
            executionId,
            department: "cro",
            taskId,
            error: errorMsg,
            retryable: true,
            attempt: 1,
            timestamp: new Date().toISOString(),
          },
        });
      });

      throw error;
    }
  }
);
