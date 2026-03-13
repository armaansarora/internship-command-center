import { inngest } from "@/lib/inngest/client";
import { generateText, zodSchema, stepCountIs } from "ai";
import type { ToolSet } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod/v4";
import { agentLogger } from "@/lib/agents/logger";
import { eventBus } from "@/lib/agents/event-bus";
import {
  searchCompany,
  scrapeUrl,
  lookupSecFilings,
  getEconomicData,
  upsertCompany,
} from "./tools";

const CIO_DEFINITION = {
  department: "cio" as const,
  name: "Chief Information Officer",
  codename: "Intelligence",
  model: "claude-sonnet-4-20250514",
  maxOutputTokens: 4096,
  temperature: 0.3,
};

const cioTools = {
  searchCompany: {
    description: "Search for company information using Tavily",
    inputSchema: zodSchema(
      z.object({
        query: z.string(),
        maxResults: z.number().default(5),
      })
    ),
    execute: async (params: { query: string; maxResults?: number }) =>
      searchCompany(params),
  },
  scrapeUrl: {
    description: "Scrape a specific URL for company data using Firecrawl",
    inputSchema: zodSchema(
      z.object({
        url: z.string().url(),
        extractFields: z.array(z.string()).optional(),
      })
    ),
    execute: async (params: { url: string; extractFields?: string[] }) =>
      scrapeUrl(params),
  },
  lookupSecFilings: {
    description: "Look up SEC EDGAR filings for a public company",
    inputSchema: zodSchema(
      z.object({
        companyName: z.string(),
        cik: z.string().optional(),
        filingType: z
          .enum(["10-K", "10-Q", "8-K", "DEF 14A"])
          .default("10-K"),
        limit: z.number().default(3),
      })
    ),
    execute: async (params: {
      companyName: string;
      cik?: string;
      filingType?: string;
      limit?: number;
    }) => lookupSecFilings(params),
  },
  getEconomicData: {
    description: "Get economic indicators from FRED API",
    inputSchema: zodSchema(
      z.object({
        seriesId: z.string(),
        observationStart: z.string().optional(),
        limit: z.number().default(10),
      })
    ),
    execute: async (params: {
      seriesId: string;
      observationStart?: string;
      limit?: number;
    }) => getEconomicData(params),
  },
  upsertCompany: {
    description: "Create or update a company record in the database",
    inputSchema: zodSchema(
      z.object({
        name: z.string(),
        domain: z.string().optional(),
        industry: z.string().optional(),
        sector: z.string().optional(),
        size: z.enum(["startup", "mid", "large", "enterprise"]).optional(),
        headquarters: z.string().optional(),
        description: z.string().optional(),
        cultureSummary: z.string().optional(),
        recentNews: z.string().optional(),
        financialsSummary: z.string().optional(),
        keyPeople: z
          .array(
            z.object({
              name: z.string(),
              title: z.string(),
              linkedinUrl: z.string().optional(),
            })
          )
          .optional(),
        internshipIntel: z.string().optional(),
        careersUrl: z.string().optional(),
        linkedinUrl: z.string().optional(),
        glassdoorUrl: z.string().optional(),
      })
    ),
    execute: async (params: {
      name: string;
      domain?: string;
      industry?: string;
      sector?: string;
      size?: "startup" | "mid" | "large" | "enterprise";
      headquarters?: string;
      description?: string;
      cultureSummary?: string;
      recentNews?: string;
      financialsSummary?: string;
      keyPeople?: { name: string; title: string; linkedinUrl?: string }[];
      internshipIntel?: string;
      careersUrl?: string;
      linkedinUrl?: string;
      glassdoorUrl?: string;
    }) => upsertCompany(params),
  },
} satisfies ToolSet;

export const cioAgent = inngest.createFunction(
  {
    id: "cio-agent",
    retries: 3,
  },
  { event: "ceo/dispatch" },
  async ({ event, step }) => {
    if (event.data.department !== "cio") return;

    const { executionId, taskId, instructions } = event.data;
    const startTime = Date.now();

    const logId = await step.run("log-start", async () => {
      return agentLogger.start({
        agent: "cio",
        action: "company-research",
        inputSummary: instructions.slice(0, 200),
      });
    });

    await step.run("publish-start", async () => {
      eventBus.publish(executionId, {
        type: "agent_start",
        department: "cio",
        taskId,
        timestamp: new Date().toISOString(),
      });
    });

    try {
      const result = await step.run("cio-generate", async () => {
        eventBus.publish(executionId, {
          type: "agent_progress",
          department: "cio",
          step: "Researching company...",
          progress: 30,
          timestamp: new Date().toISOString(),
        });

        return generateText({
          model: anthropic(CIO_DEFINITION.model),
          maxOutputTokens: CIO_DEFINITION.maxOutputTokens,
          temperature: CIO_DEFINITION.temperature,
          system: `You are the Chief Information Officer (CIO) of an internship command center. Your job is to research companies thoroughly: find their culture, recent news, financials, key people, and internship programs. Use searchCompany for web research, scrapeUrl for specific pages, lookupSecFilings for public companies, getEconomicData for market context. Always upsertCompany to save findings to the database. Be thorough but concise. Focus on information relevant to an internship applicant.`,
          prompt: instructions,
          tools: cioTools,
          stopWhen: stepCountIs(8),
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
          department: "cio",
          summary: result.text.slice(0, 300),
          timestamp: new Date().toISOString(),
        });
      });

      await step.run("send-complete-event", async () => {
        await inngest.send({
          name: "agent/complete",
          data: {
            executionId,
            department: "cio",
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
          department: "cio",
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
            department: "cio",
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
