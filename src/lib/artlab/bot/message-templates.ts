// src/lib/artlab/bot/message-templates.ts
//
// Single source for every user-facing string the bot emits. Each template
// returns an outbound shape that the sender wraps into a Telegram API call.
// Templates use HTML parse_mode + emoji (no markdown — Telegram's HTML
// engine is stricter and more predictable).
//
// All dynamic interpolations MUST go through `esc()` to avoid breaking
// HTML on stray `<` `>` `&` characters from user-supplied text.

import type { TelegramInlineKeyboard, TelegramParseMode } from "./telegram-client";
import {
  buildConceptInlineKeyboard,
  buildFinalInlineKeyboard,
  type ClarificationOption,
  buildClarificationKeyboard,
  buildBriefInlineKeyboard,
  buildBriefAdjustmentKeyboard,
  buildFeedbackKeyboard,
  type FeedbackOption,
} from "./inline-keyboards";
import type { DesignBrief } from "../brainstorm/brief-schema";

export interface TelegramOutboundMessage {
  text: string;
  parseMode?: TelegramParseMode;
  replyMarkup?: TelegramInlineKeyboard;
  disableWebPagePreview?: boolean;
}

const TOWER_PROD = "https://www.interntower.com";

export function liveFloorUrl(space: string, runId?: string): string {
  const safe = space.replace(/[^a-z0-9-]/gi, "");
  const base = `${TOWER_PROD}/${safe}`;
  return runId ? `${base}?v=${shortRunId(runId)}` : base;
}

export function shortRunId(runId: string): string {
  return runId.replace(/-/g, "").slice(0, 8);
}

export function esc(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function block(lines: Array<string | false | null | undefined>): string {
  return lines.filter(Boolean).join("\n");
}

export interface TriggerAckInput {
  displayName: string;
  title?: string;
  spaceLabel?: string; // "Rolodex Lounge (6F)"
  runId: string;
  reservedCents?: number;
  capCents?: number;
}

export function triggerAck(input: TriggerAckInput): TelegramOutboundMessage {
  const subtitle = [input.title, input.spaceLabel].filter(Boolean).join(" · ");
  const reserved = input.reservedCents !== undefined && input.capCents !== undefined
    ? `<b>Cost</b>  reserved $${(input.reservedCents / 100).toFixed(2)} / $${(input.capCents / 100).toFixed(2)}`
    : null;
  return {
    text: block([
      `🎨  <b>${esc(input.displayName)}</b>${subtitle ? `  ·  <i>${esc(subtitle)}</i>` : ""}`,
      `<code>${esc(shortRunId(input.runId))}</code>  ·  Pulling Tower context  ·  ETA ~45s`,
      reserved,
    ]),
    parseMode: "HTML",
    disableWebPagePreview: true,
  };
}

export function triggerWithPhotoAck(input: TriggerAckInput): TelegramOutboundMessage {
  const subtitle = [input.title, input.spaceLabel].filter(Boolean).join(" · ");
  return {
    text: block([
      `📸 <b>Queued</b> (with reference photo)`,
      ``,
      `   <b>Subject</b>  <b>${esc(input.displayName)}</b>${subtitle ? ` — <i>${esc(subtitle)}</i>` : ""}`,
      `   <b>Run</b>      <code>${esc(shortRunId(input.runId))}</code>`,
      ``,
      `Pulling Tower context + your reference, generating 5 concept directions…`,
      `<i>ETA ~45s</i>`,
    ]),
    parseMode: "HTML",
    disableWebPagePreview: true,
  };
}

export function bundleAck(input: { runCount: number }): TelegramOutboundMessage {
  return {
    text: block([
      `📦 <b>Bundle queued</b>`,
      ``,
      `   <b>${input.runCount} linked run${input.runCount === 1 ? "" : "s"}</b>`,
      ``,
      `I'll surface concept boards for each as they finish.`,
    ]),
    parseMode: "HTML",
    disableWebPagePreview: true,
  };
}

export interface ConceptBoardCaptionInput {
  displayName: string;
  subtitle?: string;            // "Chief Networking Officer · Rolodex Lounge (6F)"
  runId: string;
  recommendation?: { laneIndex: number; reasoning: string };
}

export function conceptBoardCaption(input: ConceptBoardCaptionInput): TelegramOutboundMessage {
  const recoLines = input.recommendation
    ? [
        ``,
        `💡 <b>Recommended:</b> Direction ${input.recommendation.laneIndex}`,
        `   <i>${esc(input.recommendation.reasoning)}</i>`,
      ]
    : [];
  return {
    text: block([
      `📋 <b>${esc(input.displayName)} — Concept Board</b>`,
      input.subtitle ? `   <i>${esc(input.subtitle)}</i>` : null,
      ``,
      `5 real Gemini-generated directions`,
      ...recoLines,
      ``,
      `Tap a button below — or reply <code>approve direction N</code> / <code>revise: …</code> / <code>reject</code>.`,
    ]),
    parseMode: "HTML",
    replyMarkup: buildConceptInlineKeyboard(input.runId),
    disableWebPagePreview: true,
  };
}

export function conceptApprovedAck(input: { laneIndex: number; runId: string }): TelegramOutboundMessage {
  return {
    text: block([
      `✅  <b>Direction ${input.laneIndex} locked</b>`,
      `<code>${esc(shortRunId(input.runId))}</code>  ·  21 production sprites  ·  ETA ~3-4 min`,
    ]),
    parseMode: "HTML",
    disableWebPagePreview: true,
  };
}

export interface FinalBoardCaptionInput {
  displayName: string;
  subtitle?: string;
  spriteCount: number;
  runId: string;
  space?: string;            // for the preview link
}

export function finalBoardCaption(input: FinalBoardCaptionInput): TelegramOutboundMessage {
  const previewLine = input.space
    ? [
        ``,
        `🪟 <b>Preview where this lands:</b>`,
        `   ${liveFloorUrl(input.space)}`,
      ]
    : [];
  return {
    text: block([
      `📐 <b>${esc(input.displayName)} — Final Board</b>`,
      input.subtitle ? `   <i>${esc(input.subtitle)}</i>` : null,
      ``,
      `<b>${input.spriteCount}</b> sprite${input.spriteCount === 1 ? "" : "s"} composed · upload-ready · alpha verified`,
      ...previewLine,
      ``,
      `Tap a button below — or reply <code>approved for app</code>.`,
    ]),
    parseMode: "HTML",
    replyMarkup: buildFinalInlineKeyboard(input.runId),
    disableWebPagePreview: true,
  };
}

export function promotionAcceptedAck(input: { runId: string }): TelegramOutboundMessage {
  return {
    text: block([
      `🚀  <b>Promotion accepted</b>`,
      `<code>${esc(shortRunId(input.runId))}</code>  ·  Writing to <code>public/art/</code>`,
    ]),
    parseMode: "HTML",
    disableWebPagePreview: true,
  };
}

export interface PromotedConfirmationInput {
  displayName: string;
  runId: string;
  assetCount: number;
  space?: string;            // if present, includes Live link
  spend?: { actualCents: number; capCents: number };
}

export function promotedConfirmation(input: PromotedConfirmationInput): TelegramOutboundMessage {
  const liveLine = input.space
    ? [
        ``,
        `🚀 <b>Live now:</b>`,
        `   ${liveFloorUrl(input.space, input.runId)}`,
        `   <i>(deploying via Vercel… ready in ~90s)</i>`,
      ]
    : [];
  const spendLine = input.spend
    ? `   <b>Spend</b>   $${(input.spend.actualCents / 100).toFixed(2)} of $${(input.spend.capCents / 100).toFixed(2)} cap`
    : null;
  return {
    text: block([
      `🚀 <b>${esc(input.displayName)} promoted</b>`,
      ``,
      `   <b>Run</b>     <code>${esc(shortRunId(input.runId))}</code>`,
      `   <b>Assets</b>  ${input.assetCount} sprite${input.assetCount === 1 ? "" : "s"} · manifest updated`,
      spendLine,
      ...liveLine,
      ``,
      `Run <code>/decisions ${esc(shortRunId(input.runId))}</code> for the brain's reasoning chain.`,
    ]),
    parseMode: "HTML",
    disableWebPagePreview: false,
  };
}

export interface BlockerNoticeInput {
  displayName: string;
  runId: string;
  phase: string;
  blocker: string;
}

export function blockerNotice(input: BlockerNoticeInput): TelegramOutboundMessage {
  return {
    text: block([
      `⚠️  <b>${esc(input.displayName)}</b>  ·  blocked`,
      `<code>${esc(shortRunId(input.runId))}</code>  ·  ${esc(input.phase)}  ·  <i>${esc(input.blocker)}</i>`,
      ``,
      `<code>/cancel ${esc(shortRunId(input.runId))}</code>  to abandon.`,
    ]),
    parseMode: "HTML",
    disableWebPagePreview: true,
  };
}

export interface ClarificationPromptInput {
  question: string;
  options: ClarificationOption[];
}

export function clarificationPrompt(input: ClarificationPromptInput): TelegramOutboundMessage {
  return {
    text: block([
      `🤔 <b>${esc(input.question)}</b>`,
      ``,
      `Tap an option — or send a follow-up message to refine the request.`,
    ]),
    parseMode: "HTML",
    replyMarkup: buildClarificationKeyboard(input.options),
    disableWebPagePreview: true,
  };
}

export function gateReplyEcho(input: { rawText: string }): TelegramOutboundMessage {
  return {
    text: block([
      `📝 <b>Reply received</b>`,
      `   <i>${esc(input.rawText)}</i>`,
      ``,
      `Waiting on the engine to surface a gate — no immediate action taken.`,
    ]),
    parseMode: "HTML",
    disableWebPagePreview: true,
  };
}

export function gateReplyNoMatch(input: {
  surface: "concept" | "promotion";
  laneIndex?: number;
  reason: string;
}): TelegramOutboundMessage {
  const heading = input.surface === "concept"
    ? `🤔 Heard "approve direction ${input.laneIndex}" — but no run is parked at the concept-review gate.`
    : `🤔 Heard "approved for app" — but no run is parked at the final-review gate.`;
  return {
    text: block([
      heading,
      ``,
      `   <b>Reason</b>  <i>${esc(input.reason)}</i>`,
      ``,
      `Trigger a new run with: <code>make &lt;character name&gt;</code>`,
    ]),
    parseMode: "HTML",
    disableWebPagePreview: true,
  };
}

export function callbackAck(input: { surface: "concept" | "final"; action: string }): { text: string } {
  if (input.surface === "concept" && /^d[1-5]$/.test(input.action)) {
    return { text: `✅ Direction ${input.action[1]} locked in` };
  }
  if (input.action === "a") return { text: "✅ Approved — promoting…" };
  if (input.action === "r") return { text: "🔁 Revision flow — reply with your change as: revise: <note>" };
  if (input.action === "x") return { text: "❌ Rejected" };
  return { text: "Got it." };
}

export function helpTemplate(): TelegramOutboundMessage {
  return {
    text: block([
      `🎨 <b>ArtLab — Tower creative engine</b>`,
      ``,
      `<b>Triggers</b>`,
      `   <code>make &lt;character&gt;</code>          start a new run`,
      `   <code>make &lt;floor&gt; background</code>     environment plate`,
      `   <code>make &lt;something cool&gt;</code>     I'll ask what you mean`,
      ``,
      `<b>Gates</b>`,
      `   <code>approve direction 1-5</code>     pick a concept lane`,
      `   <code>approved for app</code>          promote final board`,
      `   <code>revise: &lt;change&gt;</code>          request a revision`,
      `   <code>reject</code>                     abandon the run`,
      ``,
      `<b>Commands</b>`,
      `   <code>/status [runId]</code>           engine status`,
      `   <code>/queue</code>                    queued + active runs`,
      `   <code>/cancel &lt;runId&gt;</code>          cancel a run`,
      `   <code>/health</code>                   engine health`,
      `   <code>/decisions &lt;runId&gt;</code>       brain reasoning chain`,
      `   <code>/help</code>                     this message`,
    ]),
    parseMode: "HTML",
    disableWebPagePreview: true,
  };
}

export function statusList(input: { runs: string[] }): TelegramOutboundMessage {
  if (input.runs.length === 0) {
    return { text: `📭 <b>No active runs.</b>`, parseMode: "HTML" };
  }
  return {
    text: block([
      `📊 <b>Active runs (${input.runs.length})</b>`,
      ``,
      ...input.runs.map((r) => `   • <code>${esc(shortRunId(r))}</code>`),
    ]),
    parseMode: "HTML",
    disableWebPagePreview: true,
  };
}

export function statusOne(input: {
  runId: string;
  phase: string;
  blocker?: string;
  slots: { running: number; completed: number; failed: number };
  spend: { actualCents: number; monthlyCeilingCents: number };
}): TelegramOutboundMessage {
  return {
    text: block([
      `📊 <b>Run ${esc(shortRunId(input.runId))}</b>`,
      ``,
      `   <b>Phase</b>  ${esc(input.phase)}${input.blocker ? ` <i>⚠️ blocked: ${esc(input.blocker)}</i>` : ""}`,
      `   <b>Slots</b>  ${input.slots.completed} done · ${input.slots.running} running · ${input.slots.failed} failed`,
      `   <b>Spend</b>  $${(input.spend.actualCents / 100).toFixed(2)} / $${(input.spend.monthlyCeilingCents / 100).toFixed(2)} monthly`,
    ]),
    parseMode: "HTML",
    disableWebPagePreview: true,
  };
}

export function queueList(input: { entries: Array<{ runId: string; priority: string }> }): TelegramOutboundMessage {
  if (input.entries.length === 0) {
    return { text: `📭 <b>Queue empty.</b>`, parseMode: "HTML" };
  }
  return {
    text: block([
      `📋 <b>Queue (${input.entries.length})</b>`,
      ``,
      ...input.entries.map((q) => `   • <code>${esc(shortRunId(q.runId))}</code> <i>(${esc(q.priority)})</i>`),
    ]),
    parseMode: "HTML",
    disableWebPagePreview: true,
  };
}

export function cancelAck(input: { runId: string }): TelegramOutboundMessage {
  return {
    text: block([
      `🛑 <b>Cancel intent recorded</b>`,
      ``,
      `   <b>Run</b>  <code>${esc(shortRunId(input.runId))}</code>`,
      ``,
      `Daemon will send SIGTERM on the next sweep.`,
    ]),
    parseMode: "HTML",
    disableWebPagePreview: true,
  };
}

export function healthSnapshot(input: {
  activeLocks: number;
  activeRuns: number;
  activeLeases: number;
  monthlySpendCents: number;
  collectedAt: string;
}): TelegramOutboundMessage {
  return {
    text: block([
      `💚 <b>Engine health</b>`,
      ``,
      `   <b>Active locks</b>   ${input.activeLocks}`,
      `   <b>Active runs</b>    ${input.activeRuns}`,
      `   <b>Active leases</b>  ${input.activeLeases}`,
      `   <b>Spend (mo)</b>     $${(input.monthlySpendCents / 100).toFixed(2)}`,
      ``,
      `<i>Snapshot: ${esc(input.collectedAt)}</i>`,
    ]),
    parseMode: "HTML",
    disableWebPagePreview: true,
  };
}

export function unknownCommandTemplate(input: { commandName: string }): TelegramOutboundMessage {
  const help = helpTemplate();
  return {
    text: block([
      `❓ Unknown command <code>/${esc(input.commandName)}</code>`,
      ``,
      help.text,
    ]),
    parseMode: "HTML",
    disableWebPagePreview: true,
  };
}

// ─── Brainstorm-mode templates (Tranche B-D) ───────────────────────────

export function briefProposalCaption(input: { brief: DesignBrief }): TelegramOutboundMessage {
  const { brief } = input;
  const variationLines = brief.plannedVariation.map((v, i) => `<b>${i + 1}</b>  ${esc(v)}`);
  const revTag = brief.iteration > 0 ? `  <i>rev ${brief.iteration}</i>` : "";
  const deltaLine = brief.deltaSummary
    ? [`<i>📝 ${esc(brief.deltaSummary)}</i>`, ``]
    : [];
  return {
    text: block([
      `💡  <b>Design brief</b>${revTag}`,
      `─────────────────────`,
      ``,
      ...deltaLine,
      esc(brief.identity),
      ``,
      `<b>5 lanes</b>`,
      ...variationLines,
      ``,
      `<b>Style</b>  <i>${esc(brief.referenceAnchor)}</i>`,
      ``,
      `<i>Tap an action below — or send free-text to refine.</i>`,
    ]),
    parseMode: "HTML",
    replyMarkup: buildBriefInlineKeyboard(brief.runId, brief.adjustmentOptions),
    disableWebPagePreview: true,
  };
}

export function briefAdjustmentPrompt(input: {
  runId: string;
  dimensionLabel: string;
  options: Array<{ id: string; label: string }>;
}): TelegramOutboundMessage {
  return {
    text: block([
      `🎛️  <b>${esc(input.dimensionLabel)}</b>  <i>or send free-text</i>`,
    ]),
    parseMode: "HTML",
    replyMarkup: buildBriefAdjustmentKeyboard(input.runId, input.options),
    disableWebPagePreview: true,
  };
}

export function briefCancelledAck(input: { runId: string }): TelegramOutboundMessage {
  return {
    text: block([
      `❌ <b>Brief cancelled</b>`,
      ``,
      `Run <code>${esc(shortRunId(input.runId))}</code> stopped before any images were generated.`,
      `Send <code>make &lt;character&gt;</code> to start a new one.`,
    ]),
    parseMode: "HTML",
    disableWebPagePreview: true,
  };
}

export function briefRegeneratingAck(_input: { runId: string }): TelegramOutboundMessage {
  return {
    text: block([
      `🔄  <b>Updating brief</b>  ·  <i>incorporating feedback · new proposal in ~5s</i>`,
    ]),
    parseMode: "HTML",
    disableWebPagePreview: true,
  };
}

export function feedbackPositivePrompt(input: {
  runId: string;
  options: FeedbackOption[];
  isLast?: boolean;
}): TelegramOutboundMessage {
  return {
    text: block([
      `👍  <b>What worked?</b>  <i>multi-select, then Next</i>`,
    ]),
    parseMode: "HTML",
    replyMarkup: buildFeedbackKeyboard(input.runId, "pos", input.options, input.isLast ?? false),
    disableWebPagePreview: true,
  };
}

export function feedbackNegativePrompt(input: {
  runId: string;
  options: FeedbackOption[];
}): TelegramOutboundMessage {
  return {
    text: block([
      `👎  <b>What didn't?</b>  <i>multi-select, then Regenerate</i>`,
    ]),
    parseMode: "HTML",
    replyMarkup: buildFeedbackKeyboard(input.runId, "neg", input.options, true),
    disableWebPagePreview: true,
  };
}

export function conceptCritiqueCaption(input: {
  runId: string;
  displayName: string;
  subtitle?: string;
  critique?: {
    summary?: string;
    recommendedLane?: number;
    perLane?: Array<{ laneIndex: number; critique: string; stars?: number; fitToBible?: string }>;
  };
  iteration?: number;
}): TelegramOutboundMessage {
  const c = input.critique;
  const perLaneLines = c?.perLane?.slice(0, 5).map((l) => {
    const star = typeof l.stars === "number" ? Math.max(1, Math.min(5, l.stars)) : 3;
    const stars = "★".repeat(star) + "☆".repeat(5 - star);
    const recommended = l.laneIndex === c?.recommendedLane ? "  ⬅" : "";
    return `<b>${l.laneIndex}</b>  ${stars}  ${esc(l.critique)}${recommended}`;
  }) ?? [];
  const revTag = input.iteration && input.iteration > 0 ? `  <i>rev ${input.iteration}</i>` : "";
  const summaryLine = c?.summary ? `<i>${esc(c.summary)}</i>` : null;
  const pickLine = c?.recommendedLane ? `💡  <b>Pick: Direction ${c.recommendedLane}</b>` : null;
  return {
    text: block([
      `📋  <b>${esc(input.displayName)}</b>${revTag}`,
      input.subtitle ? `<i>${esc(input.subtitle)}</i>` : null,
      `─────────────────────`,
      ``,
      ...perLaneLines,
      ``,
      pickLine,
      summaryLine,
    ]),
    parseMode: "HTML",
    replyMarkup: buildConceptInlineKeyboard(input.runId),
    disableWebPagePreview: true,
  };
}

export function productionCritiqueCaption(input: {
  runId: string;
  displayName: string;
  subtitle?: string;
  spriteCount: number;
  space?: string;
  critique?: {
    overallVerdict?: "tight" | "minor-drift" | "major-drift";
    summary?: string;
    flaggedSprites?: Array<{ slotId: string; issue: string; severity: "minor" | "major" }>;
    approvedSpriteCount?: number;
  };
}): TelegramOutboundMessage {
  const verdictBadge = input.critique?.overallVerdict === "tight"
    ? "✓ Tight"
    : input.critique?.overallVerdict === "minor-drift"
      ? "⚠ Minor drift"
      : input.critique?.overallVerdict === "major-drift"
        ? "✗ Major drift"
        : "• Reviewed";
  const flagLines = (input.critique?.flaggedSprites ?? []).slice(0, 5).map((f) => {
    const icon = f.severity === "major" ? "❗" : "⚠";
    return `${icon} <code>${esc(f.slotId)}</code> — ${esc(f.issue)}`;
  });
  const approved = input.critique?.approvedSpriteCount ?? input.spriteCount;
  const previewLine = input.space ? `<b>Preview</b>  ${liveFloorUrl(input.space)}` : null;
  return {
    text: block([
      `📐  <b>${esc(input.displayName)}</b>  ·  Final Board`,
      input.subtitle ? `<i>${esc(input.subtitle)}</i>` : null,
      `─────────────────────`,
      ``,
      `<b>${approved}/${input.spriteCount}</b> sprites passed bible check  ·  ${verdictBadge}`,
      input.critique?.summary ? `<i>${esc(input.critique.summary)}</i>` : null,
      flagLines.length > 0 ? `` : null,
      ...flagLines,
      previewLine ? `` : null,
      previewLine,
    ]),
    parseMode: "HTML",
    replyMarkup: buildFinalInlineKeyboard(input.runId),
    disableWebPagePreview: true,
  };
}

export function triggerAckBrainAuthored(input: { text: string; runId: string }): TelegramOutboundMessage {
  return {
    text: block([
      `<i>${esc(input.text)}</i>`,
      ``,
      `<code>${esc(shortRunId(input.runId))}</code>  ·  ETA ~45s`,
    ]),
    parseMode: "HTML",
    disableWebPagePreview: true,
  };
}

export function promotionCelebrationBrainAuthored(input: {
  text: string;
  runId: string;
  liveUrl: string;
  spendCents?: number;
  capCents?: number;
}): TelegramOutboundMessage {
  const spendLine = input.spendCents !== undefined && input.capCents !== undefined && input.capCents > 0
    ? `<b>Spend</b>  $${(input.spendCents / 100).toFixed(2)} / $${(input.capCents / 100).toFixed(2)}`
    : null;
  return {
    text: block([
      `🚀  <b>Shipped</b>`,
      `─────────────────────`,
      ``,
      esc(input.text),
      ``,
      `<b>Live</b>  ${input.liveUrl}`,
      `<i>Deploying via Vercel · ready ~90s</i>`,
      spendLine,
      ``,
      `<code>/decisions ${esc(shortRunId(input.runId))}</code>  for the reasoning chain.`,
    ]),
    parseMode: "HTML",
    disableWebPagePreview: false,
  };
}

export function askAnswerTemplate(input: { question: string; answer: string; references?: string[] }): TelegramOutboundMessage {
  const refs = (input.references ?? []).slice(0, 3);
  return {
    text: block([
      `🧠 <b>Q:</b> <i>${esc(input.question)}</i>`,
      ``,
      `${esc(input.answer)}`,
      refs.length > 0 ? `` : null,
      refs.length > 0 ? `<i>Refs: ${refs.map((r) => esc(r)).join(" · ")}</i>` : null,
    ]),
    parseMode: "HTML",
    disableWebPagePreview: true,
  };
}

export function decisionsTemplate(input: {
  runId: string;
  decisions: Array<{ kind: string; summary: string }>;
}): TelegramOutboundMessage {
  if (input.decisions.length === 0) {
    return {
      text: block([
        `🧠 <b>No brain decisions recorded</b> for <code>${esc(shortRunId(input.runId))}</code>.`,
        ``,
        `(Mock-brain path doesn't log; only the live Claude brain emits decisions.)`,
      ]),
      parseMode: "HTML",
      disableWebPagePreview: true,
    };
  }
  return {
    text: block([
      `🧠 <b>Brain reasoning — run <code>${esc(shortRunId(input.runId))}</code></b>`,
      ``,
      ...input.decisions.map((d, i) => `   ${i + 1}. <b>${esc(d.kind)}</b> — <i>${esc(d.summary)}</i>`),
    ]),
    parseMode: "HTML",
    disableWebPagePreview: true,
  };
}
