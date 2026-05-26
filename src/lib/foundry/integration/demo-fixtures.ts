import type { FoundryAssetKind } from "@/lib/foundry/mcp/tools";

export interface FoundryDemoPack {
  packId: string;
  kind: FoundryAssetKind;
  slotId: string;
  promotedAt: string;
  publicPath: string;
  integration: Record<string, unknown>;
  alt: string;
}

/**
 * Demo-page fixture pointing at REAL promoted Asset Packs that already
 * exist on disk under public/. The demo page renders one of each kind so
 * the integration loop is visually verifiable end-to-end.
 *
 * Adding new modalities here is the lightest possible way to extend the
 * demo — keep these in sync with what `.artlab/engine/promoted/` actually
 * contains.
 */
export const FOUNDRY_DEMO_PACKS: readonly FoundryDemoPack[] = [
  {
    packId: "rafe-calder-character-demo",
    kind: "character",
    slotId: "rafe.idle",
    promotedAt: "2026-05-25T12:00:00.000Z",
    publicPath: "/art/characters/rafe-calder.png",
    integration: { width: 512, height: 768 },
    alt: "Rafe Calder — Chief Revenue Officer",
  },
  {
    packId: "war-room-floor-demo",
    kind: "floor",
    slotId: "war-room.background",
    promotedAt: "2026-05-25T12:00:00.000Z",
    publicPath: "/art/floors/war-room-dusk.webp",
    integration: { alt: "War Room at dusk" },
    alt: "War Room — Floor 7",
  },
  {
    packId: "elevator-chevron-icon-demo",
    kind: "icon",
    slotId: "elevator.chevron",
    promotedAt: "2026-05-25T12:00:00.000Z",
    publicPath: "/art/icons/elevator-chevron.svg",
    integration: {},
    alt: "Elevator chevron",
  },
  {
    packId: "sol-navarro-idle-demo",
    kind: "sprite-animation",
    slotId: "sol.idle",
    promotedAt: "2026-05-25T12:00:00.000Z",
    publicPath: "/art/sprites/sol-navarro-idle.png",
    integration: { fps: 24 },
    alt: "Sol Navarro — idle breathe",
  },
];
