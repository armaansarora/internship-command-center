import { callArtLabAnthropic, type ArtLabAnthropicCall, type ArtLabAnthropicResponse } from "./anthropic-client";
import {
  ArtLabMetaIntentSchema,
  ArtLabClarifyingQuestionSchema,
  type ArtLabMetaIntent,
  type ArtLabClarifyingQuestion,
  ARTLAB_AGENT_KINDS,
} from "./types";

const META_SYSTEM = `You are the ArtLab SDK meta-orchestrator.
You receive a raw user/agent request and must resolve it to one of these specialist agents:
- character-master
- floor-environment
- ui-texture
- sprite-animator

Output JSON only (no prose):
{ "agent": "<one of above>", "parsedArgs": { ... }, "confidence": 0..1, "rationale": "<one line>" }

- If the request is ambiguous, set confidence below 0.7 and put your best guess in \`agent\` — the caller will treat it as a clarifying question.
- parsedArgs should contain whatever fields the named agent's schema expects (characterId / space / slotId / etc.).
- Be terse. Never re-state the request back to the user.`;

const CONFIDENCE_THRESHOLD = 0.7;

const CLARIFYING_QUESTIONS_BY_AGENT: Record<string, string> = {
  "character-master": "Which character (by id) and what direction should the change take?",
  "floor-environment": "Which Tower floor and which time states should the variant cover?",
  "ui-texture": "What slot id (e.g. tower.button.bg) and is this tileable?",
  "sprite-animator": "Which character + what loop duration and frame budget?",
};

export interface ResolveArtLabIntentOpts {
  apiKey: string;
  model: string;
  dryRun?: boolean;
  callOverride?: (call: ArtLabAnthropicCall) => Promise<ArtLabAnthropicResponse>;
}

export type ResolveArtLabIntentResult = ArtLabMetaIntent | ArtLabClarifyingQuestion;

export async function resolveArtLabIntent(
  rawRequest: string,
  opts: ResolveArtLabIntentOpts,
): Promise<ResolveArtLabIntentResult> {
  const call: ArtLabAnthropicCall = {
    systemPrompt: META_SYSTEM,
    userJson: { request: rawRequest, validAgents: [...ARTLAB_AGENT_KINDS] },
    model: opts.model,
    apiKey: opts.apiKey,
    dryRun: opts.dryRun,
  };
  const resp = opts.callOverride ? await opts.callOverride(call) : await callArtLabAnthropic(call);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(resp.text) as Record<string, unknown>;
  } catch (err) {
    throw new Error(`meta-orchestrator returned non-JSON: ${String(err).slice(0, 160)}`);
  }
  const intent = ArtLabMetaIntentSchema.parse(parsed);
  if (intent.confidence < CONFIDENCE_THRESHOLD) {
    return ArtLabClarifyingQuestionSchema.parse({
      needsClarification: true,
      question: CLARIFYING_QUESTIONS_BY_AGENT[intent.agent] ?? "Could you clarify which agent should handle this and with what parameters?",
      candidates: [intent.agent],
      confidence: intent.confidence,
    });
  }
  return intent;
}
