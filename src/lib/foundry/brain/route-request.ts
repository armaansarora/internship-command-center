import { resolveFoundryIntent, type ResolveFoundryIntentResult } from "./meta-orchestrator";
import { resolveFoundryAgentProvider } from "./provider-registry";
import { createFoundryBrainFor } from "./factory";
import type {
  FoundryAgentBrainResult,
  FoundryClarifyingQuestion,
  FoundryAgentKind,
} from "./types";

export interface RouteFoundryRequestOpts {
  env: Record<string, string | undefined>;
  /** Test seam. */
  metaCallOverride?: Parameters<typeof resolveFoundryIntent>[1]["callOverride"];
}

export type RouteFoundryRequestResult = FoundryAgentBrainResult | FoundryClarifyingQuestion;

export async function routeFoundryRequest(
  rawRequest: string,
  opts: RouteFoundryRequestOpts,
): Promise<RouteFoundryRequestResult> {
  const metaProvider = resolveFoundryAgentProvider({ agent: "character-master" }, opts.env);
  const intent: ResolveFoundryIntentResult = await resolveFoundryIntent(rawRequest, {
    apiKey: metaProvider.apiKey,
    model: metaProvider.model,
    dryRun: metaProvider.dryRun,
    callOverride: opts.metaCallOverride,
  });
  if ("needsClarification" in intent) return intent;

  const brain = createFoundryBrainFor(intent.agent as FoundryAgentKind, opts.env);
  const parsedInput = brain.inputSchema.parse(intent.parsedArgs);
  return brain.decide(parsedInput);
}
