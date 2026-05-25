import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { displayFor } from "../intake/known-cast";
import type { TelegramMediaPhoto } from "./telegram-client";

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
    caption: `${display.firstName} · direction ${idx + 1}`,
  }));
  const caption = [
    `🎨 ${display.displayName} — Concept Board`,
    display.title ? `   ${display.title}${display.space ? ` · ${display.space}` : ""}` : "",
    "",
    "5 directions ready. Pick the one that feels right:",
    "",
    "  ✅  approve direction 1-5",
    "  🔁  revise: <your change>",
    "  ❌  reject",
  ].filter(Boolean).join("\n");
  return { media, caption };
}

export function buildFinalBoardAttachments(input: { runDir: string; characterId: string; spriteCount: number }): BoardAttachmentsResult {
  const finalBoardPath = join(input.runDir, "final-board.png");
  if (!existsSync(finalBoardPath)) throw new Error(`final-board.png missing at ${finalBoardPath}`);
  const display = displayFor(input.characterId);
  const caption = [
    `📐 ${display.displayName} — Final Board`,
    display.title ? `   ${display.title}${display.space ? ` · ${display.space}` : ""}` : "",
    "",
    `${input.spriteCount} sprite${input.spriteCount === 1 ? "" : "s"} composed · upload-ready`,
    "",
    "  ✅  approved for app   (promotes to public/art)",
    "  ❌  reject",
  ].filter(Boolean).join("\n");
  return {
    media: [{ type: "photo", path: finalBoardPath, caption }],
    caption,
  };
}
