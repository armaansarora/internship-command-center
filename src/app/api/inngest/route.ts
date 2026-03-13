import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { ceoOrchestrator } from "@/lib/agents/ceo";
import { croAgent } from "@/lib/agents/cro";
import { cioAgent } from "@/lib/agents/cio";
import { cooAgent } from "@/lib/agents/coo";
import { compileBriefing } from "@/lib/agents/ceo/compile-briefing";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [ceoOrchestrator, croAgent, cioAgent, cooAgent, compileBriefing],
});
