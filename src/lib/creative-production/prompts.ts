import { join } from "node:path";
import { getCreativeAssetTypeDefinition } from "./registry";
import type { CreativeAssetType } from "./types";

export interface CreativeProductionPacket {
  schemaVersion: "tower-creative-production-packet-v1";
  engineVersion: "creative-production-engine-v1";
  assetType: CreativeAssetType;
  name: string;
  runId: string;
  brief: string;
  status: "brief-ready";
  gates: ["Housekeeping Gate", "Continuous Improvement Gate"];
  approvalGates: ["initial direction approval", "final upload-ready approval"];
  promotionPhrase: "approved for app";
  outputRoot: string;
  productionRoot: string;
  nextAction: "generate-concept-options";
}

export function createCreativeProductionPacket(input: {
  assetType: CreativeAssetType;
  name: string;
  runId: string;
  brief: string;
  stateRoot: string;
}): CreativeProductionPacket {
  const definition = getCreativeAssetTypeDefinition(input.assetType);

  return {
    schemaVersion: "tower-creative-production-packet-v1",
    engineVersion: "creative-production-engine-v1",
    assetType: input.assetType,
    name: input.name,
    runId: input.runId,
    brief: input.brief,
    status: "brief-ready",
    gates: ["Housekeeping Gate", "Continuous Improvement Gate"],
    approvalGates: ["initial direction approval", "final upload-ready approval"],
    promotionPhrase: "approved for app",
    outputRoot: join(input.stateRoot, `${definition.outputRoot.split("/").at(-1) ?? input.assetType}`, input.runId),
    productionRoot: definition.productionRoot,
    nextAction: "generate-concept-options",
  };
}

export function renderCreativeProductionPrompt(packet: CreativeProductionPacket): string {
  return `# ${packet.name} Creative Production Prompt

Asset type: ${packet.assetType}
Engine: Creative Production Engine
Brief: ${packet.brief}

Create concept options for this Tower asset. Keep the Tower style premium, immersive, adult, organized, and consistent with approved visual canon.

Hard requirements:
- Do not put generated files directly in public/art.
- Maintain the Housekeeping Gate after this phase.
- Maintain the Continuous Improvement Gate after this phase.
- Promotion requires the exact phrase: approved for app.
`;
}

export function renderCreativeProductionNextAction(packet: CreativeProductionPacket): string {
  return `# Creative Production Engine Packet

## Next Legal Action

Generate concept options for ${packet.name}.

- Asset type: ${packet.assetType}
- Run id: ${packet.runId}
- Status: ${packet.status}
- Promotion phrase: ${packet.promotionPhrase}

## Gates

- Housekeeping Gate
- Continuous Improvement Gate

## Brief

${packet.brief}
`;
}
