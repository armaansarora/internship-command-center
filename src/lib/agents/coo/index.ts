import { inngest } from "@/lib/inngest/client";
import { generateText, zodSchema, stepCountIs } from "ai";
import type { ToolSet } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { agentLogger } from "@/lib/agents/logger";
import { CooTools } from "@/contracts/departments/coo";
import { eventBus } from "@/lib/agents/event-bus";
import {
  fetchRecentEmails,
  classifyEmail,
  createCalendarEvent,
  updateApplicationFromEmail,
} from "./tools";

const COO_DEFINITION = {
  department: "coo" as const,
  name: "Chief Operating Officer",
  codename: "Operations",
  model: "claude-sonnet-4-20250514",
  maxOutputTokens: 4096,
  temperature: 0.2,
};

const cooTools = {
  fetchRecentEmails: {
    description: "Fetch recent emails from Gmail API",
    inputSchema: zodSchema(CooTools.fetchRecentEmails.shape.parameters),
    execute: async (params: {
      maxResults?: number;
      query?: string;
      after?: string;
    }) => fetchRecentEmails(params),
  },
  classifyEmail: {
    description: "Classify an email and store metadata",
    inputSchema: zodSchema(CooTools.classifyEmail.shape.parameters),
    execute: async (params: {
      gmailId: string;
      threadId: string;
      subject: string;
      from: string;
      snippet: string;
      bodyText: string;
      classification?: string;
      urgency?: string;
      suggestedAction?: string;
      linkedApplicationId?: string;
    }) => classifyEmail(params),
  },
  createCalendarEvent: {
    description: "Create a Google Calendar event for an interview",
    inputSchema: zodSchema(CooTools.createCalendarEvent.shape.parameters),
    execute: async (params: {
      title: string;
      startAt: string;
      endAt: string;
      description?: string;
      location?: string;
      interviewId?: string;
    }) => createCalendarEvent(params),
  },
  updateApplicationFromEmail: {
    description: "Update application status based on email content",
    inputSchema: zodSchema(CooTools.updateApplicationFromEmail.shape.parameters),
    execute: async (params: {
      applicationId: string;
      newStatus: string;
      reason: string;
      emailGmailId: string;
    }) => updateApplicationFromEmail(params),
  },
} satisfies ToolSet;

export const cooAgent = inngest.createFunction(
  {
    id: "coo-agent",
    retries: 3,
  },
  { event: "ceo/dispatch" },
  async ({ event, step }) => {
    if (event.data.department !== "coo") return;

    const { executionId, taskId, instructions } = event.data;
    const startTime = Date.now();

    const logId = await step.run("log-start", async () => {
      return agentLogger.start({
        agent: "coo",
        action: "email-processing",
        inputSummary: instructions.slice(0, 200),
      });
    });

    await step.run("publish-start", async () => {
      eventBus.publish(executionId, {
        type: "agent_start",
        department: "coo",
        taskId,
        timestamp: new Date().toISOString(),
      });
    });

    try {
      const result = await step.run("coo-generate", async () => {
        eventBus.publish(executionId, {
          type: "agent_progress",
          department: "coo",
          step: "Processing emails...",
          progress: 30,
          timestamp: new Date().toISOString(),
        });

        return generateText({
          model: anthropic(COO_DEFINITION.model),
          maxOutputTokens: COO_DEFINITION.maxOutputTokens,
          temperature: COO_DEFINITION.temperature,
          system: `You are the Chief Operating Officer (COO) of an internship command center. Your job is to process incoming emails, classify them by relevance to internship applications, and manage the calendar. 1. Fetch recent emails using fetchRecentEmails 2. For each relevant email (from recruiters, companies, etc.), classify it using classifyEmail 3. If an email contains an interview invite, create a calendar event using createCalendarEvent 4. If an email indicates a status change (rejection, offer, etc.), update the application using updateApplicationFromEmail. Skip newsletters and irrelevant emails. Focus on actionable items.`,
          prompt: instructions,
          tools: cooTools,
          stopWhen: stepCountIs(10),
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
          department: "coo",
          summary: result.text.slice(0, 300),
          timestamp: new Date().toISOString(),
        });
      });

      await step.run("send-complete-event", async () => {
        await inngest.send({
          name: "agent/complete",
          data: {
            executionId,
            department: "coo",
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
          department: "coo",
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
            department: "coo",
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
