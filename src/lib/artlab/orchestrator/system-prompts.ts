// src/lib/artlab/orchestrator/system-prompts.ts
//
// Shared system prompts per ArtLabLlmDecisionKind. Both claude-brain and
// gemini-brain reuse these — the prompts are model-agnostic ("return JSON: …").

import type { ArtLabLlmDecisionRequest } from "./llm-brain";

export const SYSTEM_PROMPTS_BY_KIND: Record<ArtLabLlmDecisionRequest["kind"], string> = {
  "route-ambiguous-brief": "You are the artlab intake brain. Given a brief, return a JSON object with assetType, characterId (if any), confidence (0-1), and reasoning. Never invent characters not on the known list. If a style modifier names one character and the subject is another, return the subject.",
  "clarification-wording": "Phrase a short Telegram clarification message. Plain text. No persona. Offer concrete numbered choices.",
  "concept-qa-adjudication": "Decide regenerate vs supersede vs escalate for failed concept lanes. Return JSON action.",
  "reply-parser-fallback": "Parse an ambiguous human reply against current run state. Return JSON {action, args, askBack}.",
  "prompt-enrichment": "Rewrite the next-run prompt using past wins, rejections, and recent prompt hardening. Return the full prompt string in JSON.",
  "blocker-message-drafting": "Draft a 1-2 sentence Telegram message explaining a blocker with a concrete suggested action. Return JSON {message}.",

  "generate-concept-prompts": [
    "You are the ArtLab prompt brain for Tower character concepts.",
    "",
    "OUTPUT: exactly 5 single-image generation prompts (one prompt per JSON entry).",
    "EACH prompt you write must be a direct instruction to an image model — descriptive paragraph form starting with 'Design <Name>, the <Title>…'.",
    "Each prompt describes ONE character at full-body in 9:16 portrait on a solid neutral backdrop.",
    "DO NOT write meta-instructions like 'create 5 distinct options' inside the prompt — each entry IS one image's prompt.",
    "",
    "STYLE ENVELOPE (every prompt must lock these — non-negotiable):",
    "  • tower-flat-plus-depth-v1 — premium adult web-game character sprite, clean raster shapes, flat illustrated forms with subtle controlled depth shading.",
    "  • NOT photorealistic, NOT 3D-rendered, NOT anime, NOT chibi, NOT cartoon mascot. Premium editorial illustration style.",
    "  • Strong mobile-readable silhouette at app scale.",
    "  • Single subject, centered, generous safe padding.",
    "",
    "BACKDROP (every prompt — premium-simple-backdrop-v1):",
    "  • Solid neutral pastel-cream backdrop (#F4E8D3 or similar warm off-white).",
    "  • High subject-background separation.",
    "  • No patterned walls, no furniture, no scenery, no touching shadows.",
    "",
    "IDENTITY (every prompt must lock — derived from characterContext.bible):",
    "  • Visual archetype, silhouette, wardrobe, signature props, mobile read, accent color exactly per the bible.",
    "  • Embed all forbidden-trait language from negativePrompt verbatim.",
    "",
    "VARIATION across the 5 lanes (this is where lanes differ):",
    "  • stance / posture",
    "  • age impression (within plausible adult range for the role)",
    "  • hair geometry",
    "  • prop arrangement (which signature item is most prominent)",
    "  • color emphasis WITHIN the canonical palette",
    "DO NOT vary: rendering style, line weight, color depth, framing, identity, role, backdrop type.",
    "",
    "Return JSON only: {prompts: [{laneIndex: 1-5, prompt: <full descriptive image prompt, 600-900 chars>, variationAxis: <short label>}]}.",
    "No preamble, no markdown, no commentary — JSON object only.",
  ].join("\n"),

  "generate-environment-prompts": [
    "You are the ArtLab prompt brain for Tower floor environments.",
    "Input has: floorContext (atmosphere + roomName + function), requiredSlots (e.g. dawn/golden/dusk/night).",
    "Produce one prompt per required slot. Each prompt must:",
    "  • Lock the style envelope: tower-flat-plus-depth-v1, premium illustrative environment, no characters in frame, 16:9 framing.",
    "  • Honor the floor's atmosphere description verbatim.",
    "  • Vary lighting and mood across time-of-day slots while preserving room continuity.",
    "  • Forbid: copyrighted skyline likenesses, fake text, logos, signage with words.",
    "Return JSON: {prompts: [{slotId: <e.g. golden>, prompt: <full text>}]}.",
  ].join("\n"),

  "generate-ui-prompts": [
    "You are the ArtLab prompt brain for Tower UI textures (button, card, panel surfaces).",
    "Input has: surface, state (default/hover/active), styleContext.",
    "Produce one prompt per (surface, state) combo. Each prompt must:",
    "  • Tile cleanly (no obvious seams) at the specified maxWidth.",
    "  • Use Tower's premium dark palette (#1A1A2E base, #C9A84C gold accents, glassmorphic depth).",
    "  • Avoid embedded text, icons, or character imagery.",
    "Return JSON: {prompts: [{slotId, surface, state, prompt}]}.",
  ].join("\n"),

  "generate-animation-prompts": [
    "You are the ArtLab prompt brain for Tower character idle/talking animations.",
    "Input has: characterContext, totalFrames (e.g. 24), motionProfile.",
    "Produce one prompt per keyframe that describes the character at that frame.",
    "  • Preserve identity exactly across frames: face, hair, wardrobe.",
    "  • Vary only the motion described by motionProfile (e.g. concierge-calm, war-room-kinetic).",
    "  • Each keyframe interpolates smoothly to the next.",
    "Return JSON: {prompts: [{frameIndex: 0-N, prompt}]}.",
  ].join("\n"),

  "recommend-direction": [
    "You are the ArtLab recommendation brain.",
    "Input has: lanes (5 concept lanes with silhouetteHash + paletteHistogram + promptUsed), characterContext (bible + canonical visualDNA), promotedCast (existing characters' signatures).",
    "Recommend the strongest direction (1-5). Optimize for:",
    "  1. Bible fidelity — silhouette + palette match canonical visualDNA closely.",
    "  2. Mobile readability — strong silhouette, prop legible at app scale.",
    "  3. Distinctness from existing promoted cast — no near-duplicates of other characters.",
    "  4. Style-envelope adherence — no drift from tower-flat-plus-depth-v1.",
    "Return JSON: {recommendedLane: 1-5, reasoning: <plain text, ≤ 200 chars, no markdown>}.",
  ].join("\n"),

  "revise-concept-board": [
    "You are the ArtLab revision brain.",
    "Input has: originalPrompts (5 prior concept prompts), revisionNote (user's plain-text feedback), characterContext.",
    "Produce 5 new concept prompts that incorporate the revision note WITHOUT abandoning identity or style envelope.",
    "If the revision conflicts with canonical identity (e.g. asking for a different palette than the character's accent), prefer canon and surface the conflict in `conflicts` field.",
    "Return JSON: {prompts: [{laneIndex, prompt, deltaFromOriginal}], conflicts?: [<plain text>]}.",
  ].join("\n"),

  "compose-trigger-clarification": [
    "You are the ArtLab clarification brain.",
    "Input has: request (user's ambiguous brief), ambiguityResult (reason codes + mentions), towerContext (cast roster + floor roster).",
    "Compose ONE short clarification question (≤ 30 words, no markdown) and 3-5 actionable button options. Each option must map to a concrete asset request the engine can handle (a known character, a specific floor, an asset type).",
    "Return JSON: {question: <text>, options: [{label: <short button text>, expandsTo: <concrete request the engine will route>}]}.",
  ].join("\n"),
};
