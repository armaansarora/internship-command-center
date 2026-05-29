// scripts/artlab-free-smoke.ts
//
// Proves ArtLab's FREE path end-to-end: resolves the Gemini key (env →
// macOS Keychain, same resolution order the daemon uses) and performs ONE
// real generation with the free-tier model (gemini-2.5-flash-image). Prints
// the resolved model/tier, the real image byte count, and the list-price
// cost — which on the free tier you are NOT actually charged for.
//
// Run:
//   set -a && source .env.local && set +a && ./node_modules/.bin/tsx scripts/artlab-free-smoke.ts
//
// It makes exactly one API call. On the free tier that is $0.

import { execFileSync } from "node:child_process";
import { ARTLAB_KEYCHAIN_PREFIX } from "@/lib/artlab/bot/keychain";
import { createGeminiProvider } from "@/lib/artlab/providers/gemini-adapter";
import {
  resolveConceptImageModel,
  resolveProductionImageModel,
  paidImagesAllowed,
} from "@/lib/artlab/providers/image-tiers";

function keychainGeminiKey(): string | null {
  try {
    return execFileSync(
      "security",
      ["find-generic-password", "-s", `${ARTLAB_KEYCHAIN_PREFIX}-gemini-key`, "-w"],
      { encoding: "utf8" },
    ).trim() || null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const apiKey =
    (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith("__")
      ? process.env.GEMINI_API_KEY
      : null) ?? keychainGeminiKey();

  const concept = resolveConceptImageModel();
  const production = resolveProductionImageModel();
  console.log("ArtLab cost policy:");
  console.log(`  paid images allowed : ${paidImagesAllowed()}`);
  console.log(`  concept tier        : ${concept.model} (${concept.tier})`);
  console.log(
    `  production tier     : ${production.model} (${production.tier})${
      production.downgraded ? " [downgraded from paid → free guard]" : ""
    }`,
  );

  if (!apiKey) {
    console.log("\nNo Gemini key found in env or Keychain — cannot run the live free test.");
    console.log("Get a free key at https://aistudio.google.com/apikey and add GEMINI_API_KEY.");
    process.exitCode = 2;
    return;
  }

  console.log(`\nGenerating ONE real image with ${concept.model} (free tier)...`);
  const provider = createGeminiProvider({ apiKey, modelId: concept.model });
  const result = await provider.generateImage({
    prompt:
      "A single luxury brass elevator call button glowing softly on a dark marble wall, " +
      "painterly editorial game-UI style, centered, solid neutral backdrop.",
    aspectRatio: "1:1",
    laneIndex: 1,
  });

  console.log("\n✅ FREE generation succeeded:");
  console.log(`  mode        : ${result.mode}`);
  console.log(`  bytes       : ${result.bytes.length}`);
  console.log(`  contentType : ${result.contentType}`);
  console.log(`  list cost   : ${result.costCents}¢ (FREE tier = $0 actually billed)`);
  console.log(`  durationMs  : ${result.durationMs}`);
}

main().catch((err) => {
  console.error("\n❌ free smoke test failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
