import { describe, expect, it } from "vitest";
import { resolveFoundryIntent } from "./meta-orchestrator";
import type { FoundryAgentKind } from "./types";

type ExpectedAgent = FoundryAgentKind | "clarify";

interface Case {
  request: string;
  expected: ExpectedAgent;
  cannedAgent: FoundryAgentKind;
  cannedConfidence: number;
  cannedArgs: Record<string, unknown>;
}

const GOLDEN: Case[] = [
  { request: "make a War Room background at dusk", expected: "floor-environment", cannedAgent: "floor-environment", cannedConfidence: 0.95, cannedArgs: { space: "war-room", directive: "dusk" } },
  { request: "give me an icon for the elevator chevron", expected: "ui-texture", cannedAgent: "ui-texture", cannedConfidence: 0.88, cannedArgs: { slotId: "elevator.chevron" } },
  { request: "Sol Navarro idle animation, 1.2s loop", expected: "sprite-animator", cannedAgent: "sprite-animator", cannedConfidence: 0.9, cannedArgs: { characterId: "sol-navarro" } },
  { request: "Rafe Calder in a new charcoal jacket", expected: "character-master", cannedAgent: "character-master", cannedConfidence: 0.93, cannedArgs: { characterId: "rafe-calder" } },
  { request: "Penthouse skyline at sunrise", expected: "floor-environment", cannedAgent: "floor-environment", cannedConfidence: 0.85, cannedArgs: { space: "penthouse" } },
  { request: "do the thing", expected: "clarify", cannedAgent: "character-master", cannedConfidence: 0.4, cannedArgs: {} },
  { request: "icon set for the navbar buttons", expected: "ui-texture", cannedAgent: "ui-texture", cannedConfidence: 0.82, cannedArgs: { slotId: "navbar.buttons" } },
  { request: "Otis idle wave loop", expected: "sprite-animator", cannedAgent: "sprite-animator", cannedConfidence: 0.91, cannedArgs: { characterId: "otis" } },
  { request: "the Observatory at midnight", expected: "floor-environment", cannedAgent: "floor-environment", cannedConfidence: 0.94, cannedArgs: { space: "observatory" } },
  { request: "redesign Mara's blazer silhouette", expected: "character-master", cannedAgent: "character-master", cannedConfidence: 0.89, cannedArgs: { characterId: "mara" } },
  { request: "make me a tileable brass gradient", expected: "ui-texture", cannedAgent: "ui-texture", cannedConfidence: 0.86, cannedArgs: { slotId: "tower.button.bg", tileable: true } },
  { request: "give me a CRO that walks across the room", expected: "sprite-animator", cannedAgent: "sprite-animator", cannedConfidence: 0.74, cannedArgs: { characterId: "tbd" } },
  { request: "hmm I guess just do whatever", expected: "clarify", cannedAgent: "floor-environment", cannedConfidence: 0.3, cannedArgs: {} },
  { request: "Lobby at dawn with warm light", expected: "floor-environment", cannedAgent: "floor-environment", cannedConfidence: 0.92, cannedArgs: { space: "lobby" } },
  { request: "a Lottie for the briefing-room transition", expected: "sprite-animator", cannedAgent: "sprite-animator", cannedConfidence: 0.81, cannedArgs: { characterId: "transition" } },
];

const cannedCall = (c: Case) => async () => ({
  text: JSON.stringify({ agent: c.cannedAgent, parsedArgs: c.cannedArgs, confidence: c.cannedConfidence }),
  tokensIn: 1, tokensOut: 1, durationMs: 0,
});

describe("golden routing table", () => {
  for (const c of GOLDEN) {
    it(`routes [${c.request}] -> ${c.expected}`, async () => {
      const result = await resolveFoundryIntent(c.request, {
        apiKey: "sk-fake",
        model: "test",
        callOverride: cannedCall(c),
      });
      if (c.expected === "clarify") {
        expect("needsClarification" in result ? result.needsClarification : false).toBe(true);
      } else {
        expect("agent" in result ? result.agent : null).toBe(c.expected);
      }
    });
  }
});
