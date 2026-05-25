import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { displayFor } from "../intake/known-cast";
import type { TelegramMediaPhoto } from "./telegram-client";
import { esc } from "./message-templates";

export interface BoardAttachmentsResult {
  media: TelegramMediaPhoto[];
  caption: string;
}

export function buildConceptBoardAttachments(input: { runDir: string; characterId: string }): BoardAttachmentsResult {
  const conceptDir = join(input.runDir, "concept-slots");
  const lanes = existsSync(conceptDir)
    ? readdirSync(conceptDir).filter((f) => /^lane-\d+\.(png|jpg|webp)$/.test(f)).sort()
    : [];
  if (lanes.length !== 5) throw new Error(`expected 5 concept lane files; found ${lanes.length}`);
  const display = displayFor(input.characterId);
  const media: TelegramMediaPhoto[] = lanes.map((file, idx) => ({
    type: "photo",
    path: join(conceptDir, file),
    caption: `${esc(display.firstName)} · direction ${idx + 1}`,
    parseMode: "HTML",
  }));
  const caption = [
    `🎨 <b>${esc(display.displayName)} — Concept Board</b>`,
    display.title ? `   <i>${esc(display.title)}${display.space ? ` · ${esc(spaceLabel(display.space))}` : ""}</i>` : "",
    "",
    "5 directions ready. Tap a button or reply:",
    "",
    "  <code>approve direction 1-5</code>",
    "  <code>revise: &lt;your change&gt;</code>",
    "  <code>reject</code>",
  ].filter(Boolean).join("\n");
  return { media, caption };
}

export function buildFinalBoardAttachments(input: { runDir: string; characterId: string; spriteCount: number }): BoardAttachmentsResult {
  const finalBoardPath = join(input.runDir, "final-board.png");
  if (!existsSync(finalBoardPath)) throw new Error(`final-board.png missing at ${finalBoardPath}`);
  const display = displayFor(input.characterId);
  const caption = [
    `📐 <b>${esc(display.displayName)} — Final Board</b>`,
    display.title ? `   <i>${esc(display.title)}${display.space ? ` · ${esc(spaceLabel(display.space))}` : ""}</i>` : "",
    "",
    `<b>${input.spriteCount}</b> sprite${input.spriteCount === 1 ? "" : "s"} composed · upload-ready`,
    "",
    "  <code>approved for app</code>   promotes to public/art",
    "  <code>reject</code>",
  ].filter(Boolean).join("\n");
  return {
    media: [{ type: "photo", path: finalBoardPath, caption, parseMode: "HTML" }],
    caption,
  };
}

function spaceLabel(space: string): string {
  return space
    .split("-")
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}
