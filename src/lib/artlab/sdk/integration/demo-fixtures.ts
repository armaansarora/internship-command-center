import type { ArtLabAssetKind } from "@/lib/artlab/sdk/mcp/tools";

export interface ArtLabDemoPack {
  packId: string;
  kind: ArtLabAssetKind;
  slotId: string;
  promotedAt: string;
  /**
   * Path under `public/` that resolves to a real shipped asset, OR
   * `null` when the modality is `pending` (no real asset shipped yet).
   * The demo page renders a clearly-labelled placeholder for pending
   * entries rather than emitting a broken `<img>` tag.
   */
  publicPath: string | null;
  integration: Record<string, unknown>;
  alt: string;
  /** True when no real Asset Pack of this modality is on disk yet. */
  pending?: boolean;
  /** Human-readable reason shown in the demo UI when `pending` is true. */
  pendingReason?: string;
}

/**
 * Demo-page fixture pointing at REAL promoted Asset Packs that already
 * exist on disk under public/. The demo page renders one of each kind so
 * the integration loop is visually verifiable end-to-end.
 *
 * For modalities the ArtLab has not yet shipped a real Asset Pack for
 * (currently `sprite-animation`), the entry is marked `pending: true`
 * with a `pendingReason` the demo surfaces as an honest placeholder —
 * never a broken image.
 *
 * Adding new modalities here is the lightest possible way to extend the
 * demo — keep these in sync with what `.artlab/engine/promoted/` (or the
 * curated assets under `public/art/` and `public/lobby/`) actually
 * contain. The matching test in `demo-fixtures.test.ts` asserts every
 * non-pending `publicPath` resolves to a real file under `public/`.
 */
export const ARTLAB_DEMO_PACKS: readonly ArtLabDemoPack[] = [
  {
    packId: "otis-regular-idle-demo",
    kind: "character",
    slotId: "otis.idle",
    promotedAt: "2026-05-25T12:00:00.000Z",
    publicPath: "/art/lobby/otis/regular/idle.webp",
    integration: { width: 512, height: 768 },
    alt: "Otis — Lobby concierge, idle pose",
  },
  {
    packId: "lobby-backdrop-1-demo",
    kind: "floor",
    slotId: "lobby.background",
    promotedAt: "2026-05-25T12:00:00.000Z",
    publicPath: "/lobby/bg-1.jpg",
    integration: { alt: "Lobby backdrop — variant 1" },
    alt: "Lobby — protected backdrop variant 1",
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
    packId: "sprite-animation-pending-demo",
    kind: "sprite-animation",
    slotId: "sprite.pending",
    promotedAt: "2026-05-25T12:00:00.000Z",
    publicPath: null,
    integration: { fps: 24 },
    alt: "Sprite animation — pending real Asset Pack",
    pending: true,
    pendingReason:
      "No sprite-animation Asset Pack has been promoted by the ArtLab yet. " +
      "When one lands under public/art/sprites/, swap this entry and the demo " +
      "will render it via SpriteSheetPlayer automatically.",
  },
];
