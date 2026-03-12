import { db } from "@/db";
import { agentLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

const randomHex = () => crypto.randomUUID().replace(/-/g, '').slice(0, 16);

export const agentLogger = {
  async start(params: {
    agent: string;
    worker?: string;
    action: string;
    inputSummary?: string;
    inngestRunId?: string;
  }) {
    const [log] = await db
      .insert(agentLogs)
      .values({
        id: randomHex(),
        agent: params.agent,
        worker: params.worker ?? null,
        action: params.action,
        status: "running",
        inputSummary: params.inputSummary ?? null,
        inngestRunId: params.inngestRunId ?? null,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return log!.id;
  },

  async complete(logId: string, params: {
    outputSummary?: string;
    tokensUsed?: number;
    costCents?: number;
    durationMs?: number;
  }) {
    await db
      .update(agentLogs)
      .set({
        status: "completed",
        outputSummary: params.outputSummary ?? null,
        tokensUsed: params.tokensUsed ?? null,
        costCents: params.costCents ?? null,
        durationMs: params.durationMs ?? null,
        completedAt: new Date().toISOString(),
      })
      .where(eq(agentLogs.id, logId));
  },

  async fail(logId: string, params: {
    error: string;
    durationMs?: number;
  }) {
    await db
      .update(agentLogs)
      .set({
        status: "failed",
        error: params.error,
        durationMs: params.durationMs ?? null,
        completedAt: new Date().toISOString(),
      })
      .where(eq(agentLogs.id, logId));
  },
};
