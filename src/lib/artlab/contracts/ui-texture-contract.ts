// src/lib/artlab/contracts/ui-texture-contract.ts
import { z } from "zod";

export const UI_TEXTURE_CONTRACT = {
  tileable: true,
  maxWidth: 512,
  maxHeight: 512,
  // The Tower design system tokens from src/lib/config — primary dark + gold accent.
  colorPalette: ["#1A1A2E", "#C9A84C"] as const,
  noCharacters: true,
  noText: true,
} as const;

export const UiTextureSlotSpecSchema = z
  .object({
    slotId: z.string().min(1),
    surface: z.enum(["button", "card", "modal", "navbar", "sidebar", "input"]),
    state: z.enum(["default", "hover", "active", "disabled"]),
  })
  .strict();
export type UiTextureSlotSpec = z.infer<typeof UiTextureSlotSpecSchema>;

export function validateUiTextureSlotSpec(spec: unknown): UiTextureSlotSpec {
  return UiTextureSlotSpecSchema.parse(spec);
}
