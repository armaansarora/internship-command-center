import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ElevatorMobileBar } from "./ElevatorPanel";

vi.mock("@/components/world/elevator/ElevatorButton", () => ({
  ElevatorButton: ({
    floor,
  }: {
    floor: { id: string; name: string };
  }) => <button type="button">{floor.id}</button>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined }),
}));

describe("ElevatorMobileBar", () => {
  it("does not expose the closed floor sheet as a hidden dialog", () => {
    const html = renderToStaticMarkup(
      <ElevatorMobileBar
        activeFloor="PH"
        isTransitioning={false}
        onNavigate={() => undefined}
        offerCount={0}
        appCount={0}
        firstAppliedAt={null}
      />,
    );

    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain("THE TOWER — SELECT FLOOR");
    expect(html).not.toContain("The War Room");
  });
});
