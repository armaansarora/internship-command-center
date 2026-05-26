import type { JSX } from "react";
import { SpriteSheetPlayer } from "@/components/foundry/sprite-sheet-player";
import { FOUNDRY_DEMO_PACKS, type FoundryDemoPack } from "@/lib/foundry/integration/demo-fixtures";

function findDemo(kind: FoundryDemoPack["kind"]): FoundryDemoPack | undefined {
  return FOUNDRY_DEMO_PACKS.find((p) => p.kind === kind);
}

function PendingPlaceholder({ pack }: { pack: FoundryDemoPack }): JSX.Element {
  return (
    <div
      role="status"
      aria-label={`${pack.alt} — pending real asset`}
      style={{
        width: 240,
        minHeight: 120,
        padding: 16,
        border: "1px dashed #C9A84C",
        borderRadius: 8,
        background: "rgba(201, 168, 76, 0.08)",
        color: "#1A1A2E",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 13,
        lineHeight: 1.5,
      }}
      data-pending="true"
      data-pack-id={pack.packId}
    >
      <strong style={{ display: "block", marginBottom: 8 }}>
        Pending real Asset Pack
      </strong>
      <span>{pack.pendingReason}</span>
    </div>
  );
}

/**
 * Foundry modality demo page.
 *
 * Uses raw `<img>` tags rather than `next/image` so the literal
 * `/art/...` (and `/lobby/...`) paths appear unchanged in the rendered
 * HTML — the page test asserts on those exact strings, and `next/image`
 * rewrites src to `/_next/image?url=%2Fart%2F...` which would obscure
 * them. The production integration snippet emitted by
 * `foundry/asset_pack_integration` continues to recommend `next/image`
 * for downstream callers; this demo trades optimization for literal
 * paths because its purpose is a visual sanity check, not a perf bake.
 *
 * For any modality the Foundry has not yet shipped a real Asset Pack
 * for, the page renders a clearly-labelled placeholder block — never a
 * broken image. The placeholder is the honest signal that the
 * integration loop is whole for shipped modalities but not yet
 * fabricated for the rest.
 */
export default function FoundryDemoPage(): JSX.Element {
  const character = findDemo("character");
  const floor = findDemo("floor");
  const icon = findDemo("icon");
  const sprite = findDemo("sprite-animation");

  return (
    <main style={{ padding: "32px", color: "#1A1A2E", background: "#F5F2EB", minHeight: "100vh" }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 36 }}>Tower Art Foundry — modality demo</h1>
      <p style={{ maxWidth: 720, marginBottom: 32 }}>
        Each block below renders one promoted Asset Pack via the integration
        snippet that <code>foundry/asset_pack_integration</code> emits. Shipped
        modalities render the real asset; modalities still awaiting a real
        promotion render a labelled placeholder rather than a broken image.
      </p>

      <section aria-label="Character demo" style={{ marginBottom: 48 }}>
        <h2>Character — {character?.alt}</h2>
        {character && !character.pending && character.publicPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.publicPath}
            alt={character.alt}
            width={256}
            height={384}
          />
        ) : character ? (
          <PendingPlaceholder pack={character} />
        ) : null}
      </section>

      <section
        aria-label="Floor demo"
        style={{ marginBottom: 48, position: "relative", height: 320, overflow: "hidden" }}
      >
        <h2 style={{ position: "absolute", top: 8, left: 12, zIndex: 1, color: "#fff" }}>
          Floor — {floor?.alt}
        </h2>
        {floor && !floor.pending && floor.publicPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={floor.publicPath}
            alt={floor.alt}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : floor ? (
          <PendingPlaceholder pack={floor} />
        ) : null}
      </section>

      <section aria-label="Icon demo" style={{ marginBottom: 48 }}>
        <h2>Icon — {icon?.alt}</h2>
        {icon && !icon.pending && icon.publicPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon.publicPath} alt={icon.alt} width={48} height={48} />
        ) : icon ? (
          <PendingPlaceholder pack={icon} />
        ) : null}
      </section>

      <section aria-label="Sprite animation demo" style={{ marginBottom: 48 }}>
        <h2>Sprite animation — {sprite?.alt}</h2>
        {sprite && !sprite.pending && sprite.publicPath ? (
          <SpriteSheetPlayer
            sheet={sprite.publicPath}
            fps={Number(sprite.integration.fps ?? 24)}
            loop
            aria-label={sprite.alt}
          />
        ) : sprite ? (
          <PendingPlaceholder pack={sprite} />
        ) : null}
      </section>
    </main>
  );
}
