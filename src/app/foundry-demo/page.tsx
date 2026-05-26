import type { JSX } from "react";
import { SpriteSheetPlayer } from "@/components/foundry/sprite-sheet-player";
import { FOUNDRY_DEMO_PACKS } from "@/lib/foundry/integration/demo-fixtures";

function findDemo(kind: (typeof FOUNDRY_DEMO_PACKS)[number]["kind"]) {
  return FOUNDRY_DEMO_PACKS.find((p) => p.kind === kind);
}

/**
 * Foundry modality demo page.
 *
 * Uses raw `<img>` tags rather than `next/image` so the literal
 * `/art/...` paths appear unchanged in the rendered HTML — the page
 * test asserts on those exact strings, and `next/image` rewrites src
 * to `/_next/image?url=%2Fart%2F...` which would obscure them. The
 * production integration snippet emitted by
 * `foundry/asset_pack_integration` continues to recommend `next/image`
 * for downstream callers; this demo trades optimization for literal
 * paths because its purpose is a visual sanity check, not a perf bake.
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
        snippet that <code>foundry/asset_pack_integration</code> emits. If you can see
        all four blocks, the agent-to-app integration loop is whole.
      </p>

      <section aria-label="Character demo" style={{ marginBottom: 48 }}>
        <h2>Character — {character?.alt}</h2>
        {character ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.publicPath}
            alt={character.alt}
            width={256}
            height={384}
          />
        ) : null}
      </section>

      <section aria-label="Floor demo" style={{ marginBottom: 48, position: "relative", height: 320, overflow: "hidden" }}>
        <h2 style={{ position: "absolute", top: 8, left: 12, zIndex: 1, color: "#fff" }}>
          Floor — {floor?.alt}
        </h2>
        {floor ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={floor.publicPath}
            alt={floor.alt}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : null}
      </section>

      <section aria-label="Icon demo" style={{ marginBottom: 48 }}>
        <h2>Icon — {icon?.alt}</h2>
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon.publicPath} alt={icon.alt} width={48} height={48} />
        ) : null}
      </section>

      <section aria-label="Sprite animation demo" style={{ marginBottom: 48 }}>
        <h2>Sprite animation — {sprite?.alt}</h2>
        {sprite ? (
          <SpriteSheetPlayer
            sheet={sprite.publicPath}
            fps={Number(sprite.integration.fps ?? 24)}
            loop
            aria-label={sprite.alt}
          />
        ) : null}
      </section>
    </main>
  );
}
