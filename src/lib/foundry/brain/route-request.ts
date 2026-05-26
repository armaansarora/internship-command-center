import { resolveFoundryIntent, type ResolveFoundryIntentResult } from "./meta-orchestrator";
import { resolveFoundryAgentProvider } from "./provider-registry";
import { createFoundryBrainFor } from "./factory";
import { loadFoundryMemoryScope } from "./memory-scope";
import type {
  FoundryAgentBrainResult,
  FoundryClarifyingQuestion,
  FoundryAgentKind,
} from "./types";

export interface RouteFoundryRequestOpts {
  env: Record<string, string | undefined>;
  /**
   * Path to the ArtLab memory ledger directory (typically
   * `<workspaceRoot>/memory`). When supplied, route-request reads
   * `style-wins.jsonl` + `style-rejections.jsonl`, filters them to the
   * resolved agent kind, and merges the top-N into `parsedArgs` before
   * handing off to the per-agent brain. When unset, both lists default to
   * `[]` so the brain's strict schema still parses (no enrichment, but no
   * crash either).
   *
   * This wiring closes two gaps at once:
   *   - the meta-orchestrator never emits `recentWins`/`recentRejections`,
   *     so the per-agent strict schemas would otherwise always reject;
   *   - `loadFoundryMemoryScope` was previously dead code (unit-tested but
   *     never called in production).
   */
  memoryDir?: string;
  /**
   * Cap on per-list ledger entries hydrated into `parsedArgs`. Defaults to
   * 3 which matches the production summariser default.
   */
  memoryTopN?: number;
  /** Test seam. */
  metaCallOverride?: Parameters<typeof resolveFoundryIntent>[1]["callOverride"];
}

export type RouteFoundryRequestResult = FoundryAgentBrainResult | FoundryClarifyingQuestion;

const DEFAULT_MEMORY_TOP_N = 3;

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

  // Hydrate feedback signals BEFORE schema parsing. The meta-orchestrator
  // never carries these — they live in the ArtLab memory ledger — and every
  // per-agent strict schema requires them. Explicit `parsedArgs.recentWins`
  // / `parsedArgs.recentRejections` always win over the ledger so callers
  // (and tests) retain full control.
  const topN = opts.memoryTopN ?? DEFAULT_MEMORY_TOP_N;
  const scope = opts.memoryDir
    ? loadFoundryMemoryScope(opts.memoryDir, intent.agent as FoundryAgentKind, { topN })
    : { recentWins: [], recentRejections: [], winsCount: 0, rejectionsCount: 0 };
  const hydrated: Record<string, unknown> = {
    recentWins: scope.recentWins,
    recentRejections: scope.recentRejections,
    ...intent.parsedArgs,
  };

  const brain = createFoundryBrainFor(intent.agent as FoundryAgentKind, opts.env);
  const parsedInput = brain.inputSchema.parse(hydrated);
  return brain.decide(parsedInput);
}
