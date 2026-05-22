// src/lib/artlab/contracts/environment-contract.ts
import { z } from "zod";

export const ENVIRONMENT_CONTRACT = {
  aspectRatio: "16:9" as const,
  minWidth: 3840,
  requiredSlots: ["day-morning", "day-midday", "day-evening", "night"] as const,
  noCharacters: true,
} as const;

export const EnvironmentSlotSpecSchema = z
  .object({
    slotId: z.string().min(1),
    floor: z.enum(["war-room", "rolodex-lounge", "writing-room", "situation-room", "briefing-room", "observatory", "c-suite", "penthouse", "lobby"]),
    timeOfDay: z.enum(["day-morning", "day-midday", "day-evening", "night"]),
  })
  .strict();
export type EnvironmentSlotSpec = z.infer<typeof EnvironmentSlotSpecSchema>;

export function validateEnvironmentSlotSpec(spec: unknown): EnvironmentSlotSpec {
  return EnvironmentSlotSpecSchema.parse(spec);
}
