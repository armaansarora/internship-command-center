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
} from "./inline-keyboards";

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
    ? `   <b>Cost</b>     reserved $${(input.reservedCents / 100).toFixed(2)} of $${(input.capCents / 100).toFixed(2)} cap`
    : null;
  return {
    text: block([
      `🎨 <b>Queued</b>`,
      ``,
      `   <b>Subject</b>  <b>${esc(input.displayName)}</b>${subtitle ? ` — <i>${esc(subtitle)}</i>` : ""}`,
      `   <b>Run</b>      <code>${esc(shortRunId(input.runId))}</code>`,
      reserved,
      ``,
      `Pulling Tower context and generating 5 real concept directions…`,
      `<i>ETA ~45s</i>`,
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
      `✅ <b>Direction ${input.laneIndex} locked in</b>`,
      ``,
      `   <b>Run</b>      <code>${esc(shortRunId(input.runId))}</code>`,
      `   <b>Walking</b>  canary → production → strict-qa → final-review`,
      ``,
      `Generating 21 production sprites (3 outfits × 7 poses)…`,
      `<i>ETA ~3-4 min</i>`,
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
      `🚀 <b>Promotion accepted</b>`,
      ``,
      `   <b>Run</b>     <code>${esc(shortRunId(input.runId))}</code>`,
      `   <b>Status</b>  writing assets + manifest entries to <code>public/art/</code>…`,
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
      `⚠️ <b>Run blocked</b>`,
      ``,
      `   <b>Subject</b>  ${esc(input.displayName)}`,
      `   <b>Run</b>      <code>${esc(shortRunId(input.runId))}</code>`,
      `   <b>Phase</b>    ${esc(input.phase)}`,
      `   <b>Blocker</b>  <i>${esc(input.blocker)}</i>`,
      ``,
      `Reply <code>/cancel ${esc(shortRunId(input.runId))}</code> to abandon, or wait for the engine to retry.`,
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
