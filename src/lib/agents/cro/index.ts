import { inngest } from "@/lib/inngest/client";
import { generateText, zodSchema, stepCountIs } from "ai";
import type { ToolSet } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { agentLogger } from "@/lib/agents/logger";
import { CroTools } from "@/contracts/departments/cro";
import { eventBus } from "@/lib/agents/event-bus";
import {
  queryApplications,
  updateApplicationStatus,
  suggestFollowUp,
  analyzeConversionRates,
  searchJobs,
  lookupAtsJob,
} from "./tools";

const CRO_DEFINITION = {
  department: "cro" as const,
  name: "Chief Revenue Officer",
  codename: "Revenue",
  model: "claude-sonnet-4-20250514",
  maxOutputTokens: 4096,
  temperature: 0.3,
};

const croTools = {
  queryApplications: {
    description: "Query the applications table with filters",
    inputSchema: zodSchema(CroTools.queryApplications.shape.parameters),
    execute: async (
      params: {
        status?: string[];
        tier?: number[];
        companyId?: string;
        createdAfter?: string;
        limit?: number;
      }
    ) => queryApplications(params),
  },
  updateApplicationStatus: {
    description: "Update an application's status",
    inputSchema: zodSchema(CroTools.updateApplicationStatus.shape.parameters),
    execute: async (params: {
      applicationId: string;
      newStatus: string;
      reason: string;
    }) => updateApplicationStatus(params),
  },
  suggestFollowUp: {
    description: "Draft a follow-up outreach for stale applications",
    inputSchema: zodSchema(CroTools.suggestFollowUp.shape.parameters),
    execute: async (params: {
      applicationId: string;
      contactId?: string;
      suggestedSubject: string;
      suggestedBody: string;
    }) => suggestFollowUp(params),
  },
  analyzeConversionRates: {
    description: "Calculate conversion rates between pipeline stages",
    inputSchema: zodSchema(CroTools.analyzeConversionRates.shape.parameters),
    execute: async (params: { fromDate?: string; toDate?: string }) =>
      analyzeConversionRates(params),
  },
  searchJobs: {
    description: "Search for internship job listings using JSearch API",
    inputSchema: zodSchema(CroTools.searchJobs.shape.parameters),
    execute: async (params: {
      query: string;
      location?: string;
      datePosted?: "today" | "3days" | "week" | "month";
      remoteOnly?: boolean;
      limit?: number;
    }) => searchJobs(params),
  },
  lookupAtsJob: {
    description: "Look up a specific job on Lever or Greenhouse ATS",
    inputSchema: zodSchema(CroTools.lookupAtsJob.shape.parameters),
    execute: async (params: {
      company: string;
      atsType: "lever" | "greenhouse";
      jobId?: string;
    }) => lookupAtsJob(params),
  },
} satisfies ToolSet;

export const croAgent = inngest.createFunction(
  {
    id: "cro-agent",
    retries: 3,
  },
  { event: "ceo/dispatch" },
  async ({ event, step }) => {
    if (event.data.department !== "cro") return;

    const { executionId, taskId, instructions } = event.data;
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
          maxOutputTokens: CRO_DEFINITION.maxOutputTokens,
          temperature: CRO_DEFINITION.temperature,
          system: `You are the Chief Revenue Officer (CRO) of an internship command center.
Your job is to analyze the application pipeline, identify action items, suggest follow-ups for stale applications, and track conversion rates.
Be concise and actionable. Focus on what needs attention NOW.`,
          prompt: instructions,
          tools: croTools,
          stopWhen: stepCountIs(5),
        });
      });

      const durationMs = Date.now() - startTime;
      const tokenUsage = {
        input: result.usage?.inputTokens ?? 0,
        output: result.usage?.outputTokens ?? 0,
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
            result: {
              summary: result.text,
              toolCalls: result.toolCalls?.length ?? 0,
            },
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
