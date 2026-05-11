/**
 * Dossier Extractor — turn a completed agent dispatch into a Council Table row.
 *
 * The CEO orchestrator fans out work to one or more sibling agents (CRO, COO,
 * CIO, etc.) via `dispatchBatch`. Each subagent returns a compressed text
 * summary captured on `agent_dispatches.summary`. That blob is fine for the
 * CEO to *synthesise* over, but it's not a durable, structured artifact the
 * user can decide on.
 *
 * The dossier IS the durable product object. It records the *structured*
 * recommendation the user actually approves/rejects: proposed action,
 * evidence cited, confidence, permission needed, optional disagreement.
 *
 * Pattern (mirrors `agents/concierge/extract.ts`):
 *   1. Build a transcript-style prompt from the dispatch metadata + summary.
 *   2. Call `generateObject` against Sonnet 4.6 with a Zod schema mirroring
 *      the `handoff_dossiers` columns (minus server-stamped fields).
 *   3. If the model fails or returns invalid JSON, fall back to a
 *      *deterministic* dossier built from the raw summary. The Council Table
 *      surface should NEVER be empty when a dispatch produced any text.
 *
 * Budget: 1 LLM call per completed dispatch, maxOutputTokens=500. At
 * Haiku 4.5 pricing this is ~$0.0008 per extraction. With the typical
 * dispatchBatch fanning to 3 agents, the council-emission overhead is
 * ~$0.0024/request — an order of magnitude cheaper than running the
 * extractor on Sonnet. Dossier extraction is pure structural distillation
 * of an already-written summary; Sonnet's reasoning is not the load-bearing
 * faculty here.
 */
import { generateObject } from "ai";
import { z } from "zod/v4";
import { getFastModel } from "../model";
import { DOSSIER_EXTRACTION_MAX_OUTPUT_TOKENS } from "@/lib/ai/output-budgets";
import { log } from "@/lib/logger";
import type { Row } from "@/db/database.types";
import type { InsertDossierInput } from "@/lib/db/queries/handoff-dossiers-rest";

/** Truncation cap when falling back to the raw summary as a recommendation. */
const FALLBACK_RECOMMENDATION_CHARS = 240;

// ---------------------------------------------------------------------------
// Zod schema — mirrors `handoff_dossiers` columns the model is allowed to
// fill. Server-stamped fields (id, user_id, request_id, dispatch_id, owner,
// status, decided_at, executed_at, created/updated timestamps) are NOT in
// the schema; the caller stamps them when inserting.
// ---------------------------------------------------------------------------

/**
 * Evidence entry shape — kept as jsonb on disk so the structure can evolve
 * without a migration. The three slots are deliberately loose because every
 * department cites different evidence kinds (applications, contacts, comp
 * bands, etc.).
 */
const EvidenceEntrySchema = z.object({
  kind: z
    .string()
    .min(1)
    .describe(
      "What this evidence references — e.g. application, contact, company, calendar_event, comp_band, log.",
    ),
  id: z
    .string()
    .nullable()
    .describe("Stable id of the referenced row, or null when no id applies."),
  summary: z
    .string()
    .min(1)
    .max(280)
    .describe("One-line human-readable description of the evidence."),
});

/**
 * Disagreement note. Optional — only present when the owner agent disagrees
 * with a peer's recommendation in the same request.
 */
const DisagreementSchema = z.object({
  withAgent: z
    .string()
    .min(1)
    .describe(
      "The peer agent code (lowercase, e.g. 'cio') the owner disagrees with.",
    ),
  reason: z
    .string()
    .min(1)
    .max(480)
    .describe("One-sentence rationale for the disagreement."),
});

/**
 * Public schema — the exact shape `generateObject` returns. Keep this
 * exported so PR3-Backend's `handoff-dossiers-rest.ts` can derive its own
 * insert input type from it.
 */
export const DossierExtractionSchema = z.object({
  task: z
    .string()
    .min(1)
    .max(2000)
    .describe(
      "The task the owner agent was handed. Echo back the CEO's ask verbatim, trimmed.",
    ),
  recommendation: z
    .string()
    .min(1)
    .max(360)
    .describe(
      "Single user-facing sentence in the owner agent's voice. Lead with the verb.",
    ),
  proposedAction: z
    .string()
    .min(1)
    .max(480)
    .describe(
      "Concrete next step the user can approve. Imperative voice, plain English.",
    ),
  permissionNeeded: z
    .enum(["none", "draft", "send"])
    .describe(
      "What the user must grant. 'none' = informational only, 'draft' = produce a draft for review, 'send' = execute on user's behalf.",
    ),
  confidence: z
    .number()
    .int()
    .min(0)
    .max(100)
    .nullable()
    .describe(
      "0-100 confidence in the recommendation, or null if the agent declines to estimate.",
    ),
  evidence: z
    .array(EvidenceEntrySchema)
    .max(8)
    .describe(
      "Up to 8 pieces of evidence the dossier cites. Empty array is fine.",
    ),
  openQuestions: z
    .array(z.string().min(1).max(280))
    .max(5)
    .describe(
      "Up to 5 unresolved questions the user can answer to firm up the recommendation.",
    ),
  disagreement: DisagreementSchema.nullable().describe(
    "Optional disagreement with a peer in the same request, else null.",
  ),
});

/** TypeScript shape inferred from the Zod schema above. */
export type DossierExtraction = z.infer<typeof DossierExtractionSchema>;

// ---------------------------------------------------------------------------
// Input the orchestrator hands the REST insert helper.
// ---------------------------------------------------------------------------

/**
 * Insert payload shape consumed by `insertDossier` (camelCase, defined by
 * PR3-Backend's `handoff-dossiers-rest.ts`). Re-exported here so callers
 * see one canonical type — they don't need to know who owns the helper.
 *
 * Server defaults cover `status`, `requesting_agent`, and timestamps when
 * the orchestrator leaves those fields off the payload.
 */
export type HandoffDossierInput = InsertDossierInput;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

interface ExtractDossierInput {
  userId: string;
  requestId: string;
  dispatch: Row<"agent_dispatches">;
}

/**
 * Extract a structured Council Table dossier from a completed dispatch.
 *
 * Resolves to `null` (and only `null`) when there is no summary text to
 * extract from — i.e. the dispatch did not produce any model output. In
 * every other case it returns a `HandoffDossierInput`, falling back to a
 * deterministic shape derived from the raw summary when the model call
 * fails or returns invalid JSON. The Council Table is never empty when a
 * dispatch produced text.
 */
export async function extractDossierFromDispatch(
  input: ExtractDossierInput,
): Promise<HandoffDossierInput | null> {
  const { userId, requestId, dispatch } = input;
  const summary = (dispatch.summary ?? "").trim();
  const task = (dispatch.task ?? "").trim();

  // No content to extract from — skip rather than fabricate.
  if (summary.length === 0) {
    return null;
  }

  // Deterministic fallback the LLM branch falls back to on any failure.
  const fallback = buildFallbackDossier({
    userId,
    requestId,
    dispatch,
    summary,
    task,
  });

  const system = `You are a Council Table dossier writer for The Tower. Your only output is a structured dossier the user can act on. Read the dispatched agent's task and compressed summary; distill them into the smallest decision packet the user needs to approve, reject, or modify the recommendation.

Rules:
- Speak in the owner agent's voice (the agent that ran the dispatch — see DISPATCH METADATA).
- Quote evidence the agent cited (ids, names, deadlines, numbers). Up to 8 entries.
- Set permission_needed: "none" for pure info, "draft" if a draft must be reviewed, "send" if the action would execute on the user's behalf.
- Set confidence in 0-100; null only when the agent genuinely cannot estimate.
- Only include disagreement when the summary explicitly contradicts a peer.
- Echo task verbatim from the metadata.
- Never fabricate. If a field has no signal in the summary, return an empty array / null.`;

  const prompt = `DISPATCH METADATA
- Owner agent: ${dispatch.agent}
- Request id: ${requestId}
- Dispatch id: ${dispatch.id}

TASK FROM CEO
${task || "(no task recorded)"}

COMPRESSED SUMMARY FROM ${dispatch.agent.toUpperCase()}
${summary}

Return a structured dossier.`;

  try {
    const result = await generateObject({
      model: getFastModel(),
      schema: DossierExtractionSchema,
      system,
      prompt,
      maxOutputTokens: DOSSIER_EXTRACTION_MAX_OUTPUT_TOKENS,
    });

    const parsed = DossierExtractionSchema.parse(result.object);
    return {
      userId,
      requestId,
      dispatchId: dispatch.id,
      owner: dispatch.agent,
      task: parsed.task.length > 0 ? parsed.task : (task || summary.slice(0, 200)),
      recommendation: parsed.recommendation,
      proposedAction: parsed.proposedAction,
      permissionNeeded: parsed.permissionNeeded,
      confidence: parsed.confidence,
      evidence: parsed.evidence,
      openQuestions: parsed.openQuestions,
      disagreement: parsed.disagreement,
    };
  } catch (err) {
    log.warn("dossier_extractor.fallback", {
      userId,
      requestId,
      dispatchId: dispatch.id,
      owner: dispatch.agent,
      error: err instanceof Error ? err.message : String(err),
    });
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Fallback builder — deterministic dossier when the LLM call fails.
// ---------------------------------------------------------------------------

interface FallbackInput {
  userId: string;
  requestId: string;
  dispatch: Row<"agent_dispatches">;
  summary: string;
  task: string;
}

/**
 * Deterministic fallback: lift the first ~240 chars of the summary as both
 * the recommendation and the proposed action. permission_needed defaults to
 * "none" because we can't infer execution intent from raw text. Confidence
 * is null because no model produced it. Evidence + open_questions are
 * empty arrays. Disagreement is null. This keeps the dossier insertable
 * even when extraction fails, so the Council Table always reflects the
 * dispatches the user just paid for.
 */
function buildFallbackDossier(input: FallbackInput): HandoffDossierInput {
  const { userId, requestId, dispatch, summary, task } = input;
  const truncated = summary.slice(0, FALLBACK_RECOMMENDATION_CHARS);
  // Synthetic-evidence floor: the brand promise is "every recommendation
  // carries evidence." When the structured extractor fails we still know
  // *which dispatch row* produced the raw summary, so we cite the dispatch
  // itself as a single evidence entry instead of returning an empty array.
  // The Council Table renders this as "From {agent}'s working notes" so
  // users always have a thread to pull on.
  const evidenceSummary =
    truncated.length > 0 ? truncated : "Agent completed without raw text.";
  return {
    userId,
    requestId,
    dispatchId: dispatch.id,
    owner: dispatch.agent,
    task: task || truncated,
    recommendation: truncated,
    proposedAction: truncated,
    permissionNeeded: "none",
    confidence: null,
    evidence: [
      {
        kind: "dispatch_summary",
        id: dispatch.id,
        summary: evidenceSummary,
      },
    ],
    openQuestions: [],
    disagreement: null,
  };
}
