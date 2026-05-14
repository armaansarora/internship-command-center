import { describe, expect, it } from "vitest";
import { inferCreativeProductionRequest } from "./intake";

const NOW = new Date("2026-05-14T12:00:00.000Z");

describe("creative production adaptive intake", () => {
  it("routes character replacement requests without requiring engine vocabulary", () => {
    const draft = inferCreativeProductionRequest(
      "Redo Otis from scratch with the same approved design, but make the final sprites production ready.",
      NOW,
    );

    expect(draft.assetType).toBe("character");
    expect(draft.name).toBe("Otis");
    expect(draft.runId).toBe("2026-05-14-otis");
    expect(draft.routingReason).toContain("character");
    expect(draft.confidence).toBe("high");
  });

  it("routes background and screen requests to environments", () => {
    const draft = inferCreativeProductionRequest(
      "Create a new immersive background screen for the application war room.",
      NOW,
    );

    expect(draft.assetType).toBe("environment");
    expect(draft.name).toBe("Application War Room Background Screen");
    expect(draft.runId).toBe("2026-05-14-application-war-room-background-screen");
    expect(draft.routingReason).toContain("environment");
  });

  it("routes small app surface requests to ui-texture", () => {
    const draft = inferCreativeProductionRequest(
      "Make a small premium UI button texture for the lobby controls.",
      NOW,
    );

    expect(draft.assetType).toBe("ui-texture");
    expect(draft.name).toBe("Lobby Controls Button Texture");
    expect(draft.runId).toBe("2026-05-14-lobby-controls-button-texture");
    expect(draft.routingReason).toContain("ui-texture");
  });

  it("routes motion requests to animation while preserving the original brief", () => {
    const request = "Generate an animated elevator arrival loop for the lobby.";
    const draft = inferCreativeProductionRequest(request, NOW);

    expect(draft.assetType).toBe("animation");
    expect(draft.name).toBe("Lobby Elevator Arrival Loop");
    expect(draft.brief).toBe(request);
    expect(draft.routingReason).toContain("animation");
  });
});
