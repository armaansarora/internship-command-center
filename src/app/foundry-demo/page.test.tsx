// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ArtLabDemoPage from "./page";
import { ARTLAB_DEMO_PACKS } from "@/lib/artlab/sdk/integration/demo-fixtures";

describe("ArtLabDemoPage", () => {
  it("renders the real publicPath of every non-pending demo modality", () => {
    const html = renderToStaticMarkup(<ArtLabDemoPage />);
    for (const pack of ARTLAB_DEMO_PACKS) {
      if (pack.pending || pack.publicPath === null) continue;
      expect(html).toContain(pack.publicPath);
    }
  });

  it("renders a pending placeholder (never a broken image) for every pending modality", () => {
    const html = renderToStaticMarkup(<ArtLabDemoPage />);
    const pendingPacks = ARTLAB_DEMO_PACKS.filter((p) => p.pending === true);
    expect(pendingPacks.length).toBeGreaterThan(0);
    for (const pack of pendingPacks) {
      expect(html).toContain("Pending real Asset Pack");
      expect(html).toContain(`data-pack-id="${pack.packId}"`);
    }
  });

  it("never emits an <img> tag whose src is null or empty", () => {
    const html = renderToStaticMarkup(<ArtLabDemoPage />);
    expect(html).not.toMatch(/<img[^>]*\ssrc=""[^>]*>/);
    expect(html).not.toMatch(/<img[^>]*\ssrc="null"[^>]*>/);
  });

  it("each demo section carries an aria-label or visible heading", () => {
    const html = renderToStaticMarkup(<ArtLabDemoPage />);
    expect(html).toMatch(/Character/);
    expect(html).toMatch(/Floor/);
    expect(html).toMatch(/Icon/);
    expect(html).toMatch(/Sprite/);
  });

  it("page title includes the words 'Tower Art ArtLab'", () => {
    const html = renderToStaticMarkup(<ArtLabDemoPage />);
    expect(html).toMatch(/Tower Art ArtLab/);
  });
});
