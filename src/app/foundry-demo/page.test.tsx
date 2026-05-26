// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FoundryDemoPage from "./page";
import { FOUNDRY_DEMO_PACKS } from "@/lib/artlab/sdk/integration/demo-fixtures";

describe("FoundryDemoPage", () => {
  it("renders the real publicPath of every non-pending demo modality", () => {
    const html = renderToStaticMarkup(<FoundryDemoPage />);
    for (const pack of FOUNDRY_DEMO_PACKS) {
      if (pack.pending || pack.publicPath === null) continue;
      expect(html).toContain(pack.publicPath);
    }
  });

  it("renders a pending placeholder (never a broken image) for every pending modality", () => {
    const html = renderToStaticMarkup(<FoundryDemoPage />);
    const pendingPacks = FOUNDRY_DEMO_PACKS.filter((p) => p.pending === true);
    expect(pendingPacks.length).toBeGreaterThan(0);
    for (const pack of pendingPacks) {
      expect(html).toContain("Pending real Asset Pack");
      expect(html).toContain(`data-pack-id="${pack.packId}"`);
    }
  });

  it("never emits an <img> tag whose src is null or empty", () => {
    const html = renderToStaticMarkup(<FoundryDemoPage />);
    expect(html).not.toMatch(/<img[^>]*\ssrc=""[^>]*>/);
    expect(html).not.toMatch(/<img[^>]*\ssrc="null"[^>]*>/);
  });

  it("each demo section carries an aria-label or visible heading", () => {
    const html = renderToStaticMarkup(<FoundryDemoPage />);
    expect(html).toMatch(/Character/);
    expect(html).toMatch(/Floor/);
    expect(html).toMatch(/Icon/);
    expect(html).toMatch(/Sprite/);
  });

  it("page title includes the words 'Tower Art Foundry'", () => {
    const html = renderToStaticMarkup(<FoundryDemoPage />);
    expect(html).toMatch(/Tower Art Foundry/);
  });
});
