import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FLOORS } from "@/types/ui";
import { ElevatorButton } from "./ElevatorButton";

describe("ElevatorButton", () => {
  it("does not label implemented floor routes as construction phases", () => {
    const floor = FLOORS.find((f) => f.id === "7");
    if (!floor) throw new Error("missing War Room floor metadata");

    const html = renderToStaticMarkup(
      <ElevatorButton
        floor={floor}
        isActive={false}
        isTransitioning={false}
        onClick={() => {}}
      />,
    );

    expect(html).toContain("The War Room — Applications");
    expect(html).not.toContain("Under Construction");
    expect(html).not.toContain("Coming Soon");
    expect(html).not.toContain("Phase 1");
    expect(html).not.toContain("disabled");
  });
});
