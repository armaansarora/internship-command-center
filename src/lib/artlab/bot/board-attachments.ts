import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { TelegramMediaPhoto } from "./telegram-client";

function capitalize(s: string): string { return s.length > 0 ? s[0]!.toUpperCase() + s.slice(1) : s; }

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
  const name = capitalize(input.characterId);
  const media: TelegramMediaPhoto[] = lanes.map((file, idx) => ({
    type: "photo",
    path: join(conceptDir, file),
    caption: `${name} — direction ${idx + 1}`,
  }));
  return {
    media,
    caption: `${name} concepts ready. Reply: \`approve direction 1-5\`, \`revise: <change>\`, or \`reject/archive\`.`,
  };
}

export function buildFinalBoardAttachments(input: { runDir: string; characterId: string; spriteCount: number }): BoardAttachmentsResult {
  const finalBoardPath = join(input.runDir, "final-board.png");
  if (!existsSync(finalBoardPath)) throw new Error(`final-board.png missing at ${finalBoardPath}`);
  const name = capitalize(input.characterId);
  const caption = `${name} final upload-ready board (${input.spriteCount} sprites). Reply: \`approved for app\` to promote.`;
  return {
    media: [{ type: "photo", path: finalBoardPath, caption }],
    caption,
  };
}
