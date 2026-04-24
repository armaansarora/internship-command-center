// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { PatternMode } from "@/lib/orrery/types";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * R9.4 — PatternModeToggle render + a11y + interaction tests.
 *
 * The toggle is a 3-button pill that lets the user flip the Orrery between
 * stage / tier / velocity layouts. It's pure UI — state lives in the parent
 * (Orrery wraps it via useOrreryMode). These tests cover render shape, ARIA
 * group semantics, aria-pressed reflection, and click → onChange wiring.
 *
 * Manual createRoot + react act() — the project does not use
 * @testing-library/react (see CLAUDE.md / Orrery.test.tsx).
 */

import { PatternModeToggle } from "./PatternModeToggle";

interface Mounted {
  host: HTMLDivElement;
  root: Root;
  unmount: () => void;
}

function mount(node: React.ReactElement): Mounted {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(node);
  });
  return {
    host,
    root,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      host.remove();
    },
  };
}

function findGroup(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>('[role="group"]');
}

function findButtons(host: HTMLElement): HTMLButtonElement[] {
  return Array.from(host.querySelectorAll<HTMLButtonElement>('[role="group"] button'));
}

function findButtonByLabel(host: HTMLElement, label: RegExp): HTMLButtonElement {
  for (const btn of findButtons(host)) {
    const text = btn.textContent ?? "";
    if (label.test(text)) return btn;
  }
  throw new Error(`No button matched ${label}`);
}

let cleanups: Array<() => void> = [];

beforeEach(() => {
  cleanups = [];
});

afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
});

describe("PatternModeToggle — render shape", () => {
  it("renders a role=group container with descriptive aria-label", () => {
    const m = mount(<PatternModeToggle mode="stage" onChange={() => undefined} />);
    cleanups.push(m.unmount);
    const group = findGroup(m.host);
    expect(group).not.toBeNull();
    expect(group?.getAttribute("aria-label")).toMatch(/orrery pattern mode/i);
  });

  it("renders three buttons", () => {
    const m = mount(<PatternModeToggle mode="stage" onChange={() => undefined} />);
    cleanups.push(m.unmount);
    expect(findButtons(m.host)).toHaveLength(3);
  });

  it("renders the three labels in stage / tier / velocity order", () => {
    const m = mount(<PatternModeToggle mode="stage" onChange={() => undefined} />);
    cleanups.push(m.unmount);
    const buttons = findButtons(m.host);
    expect(buttons[0]?.textContent).toMatch(/stage/i);
    expect(buttons[1]?.textContent).toMatch(/tier/i);
    expect(buttons[2]?.textContent).toMatch(/velocity/i);
  });

  it("every button has type='button' (no accidental form submit)", () => {
    const m = mount(<PatternModeToggle mode="stage" onChange={() => undefined} />);
    cleanups.push(m.unmount);
    for (const btn of findButtons(m.host)) {
      expect(btn.getAttribute("type")).toBe("button");
    }
  });
});

describe("PatternModeToggle — aria-pressed reflects current mode", () => {
  it("stage mode → only the stage button is aria-pressed", () => {
    const m = mount(<PatternModeToggle mode="stage" onChange={() => undefined} />);
    cleanups.push(m.unmount);
    expect(findButtonByLabel(m.host, /stage/i).getAttribute("aria-pressed")).toBe("true");
    expect(findButtonByLabel(m.host, /tier/i).getAttribute("aria-pressed")).toBe("false");
    expect(findButtonByLabel(m.host, /velocity/i).getAttribute("aria-pressed")).toBe("false");
  });

  it("tier mode → only the tier button is aria-pressed", () => {
    const m = mount(<PatternModeToggle mode="tier" onChange={() => undefined} />);
    cleanups.push(m.unmount);
    expect(findButtonByLabel(m.host, /stage/i).getAttribute("aria-pressed")).toBe("false");
    expect(findButtonByLabel(m.host, /tier/i).getAttribute("aria-pressed")).toBe("true");
    expect(findButtonByLabel(m.host, /velocity/i).getAttribute("aria-pressed")).toBe("false");
  });

  it("velocity mode → only the velocity button is aria-pressed", () => {
    const m = mount(<PatternModeToggle mode="velocity" onChange={() => undefined} />);
    cleanups.push(m.unmount);
    expect(findButtonByLabel(m.host, /stage/i).getAttribute("aria-pressed")).toBe("false");
    expect(findButtonByLabel(m.host, /tier/i).getAttribute("aria-pressed")).toBe("false");
    expect(findButtonByLabel(m.host, /velocity/i).getAttribute("aria-pressed")).toBe("true");
  });
});

describe("PatternModeToggle — click → onChange", () => {
  it("clicking the tier button calls onChange('tier')", () => {
    const onChange = vi.fn<(m: PatternMode) => void>();
    const m = mount(<PatternModeToggle mode="stage" onChange={onChange} />);
    cleanups.push(m.unmount);
    act(() => {
      findButtonByLabel(m.host, /tier/i).click();
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("tier");
  });

  it("clicking the velocity button calls onChange('velocity')", () => {
    const onChange = vi.fn<(m: PatternMode) => void>();
    const m = mount(<PatternModeToggle mode="stage" onChange={onChange} />);
    cleanups.push(m.unmount);
    act(() => {
      findButtonByLabel(m.host, /velocity/i).click();
    });
    expect(onChange).toHaveBeenCalledWith("velocity");
  });

  it("clicking the stage button calls onChange('stage')", () => {
    const onChange = vi.fn<(m: PatternMode) => void>();
    const m = mount(<PatternModeToggle mode="tier" onChange={onChange} />);
    cleanups.push(m.unmount);
    act(() => {
      findButtonByLabel(m.host, /stage/i).click();
    });
    expect(onChange).toHaveBeenCalledWith("stage");
  });

  it("clicking the already-active button still fires onChange (idempotent caller)", () => {
    const onChange = vi.fn<(m: PatternMode) => void>();
    const m = mount(<PatternModeToggle mode="stage" onChange={onChange} />);
    cleanups.push(m.unmount);
    act(() => {
      findButtonByLabel(m.host, /stage/i).click();
    });
    expect(onChange).toHaveBeenCalledWith("stage");
  });
});

describe("PatternModeToggle — keyboard arrow cycling", () => {
  it("ArrowRight on stage button advances to tier", () => {
    const onChange = vi.fn<(m: PatternMode) => void>();
    const m = mount(<PatternModeToggle mode="stage" onChange={onChange} />);
    cleanups.push(m.unmount);
    const stage = findButtonByLabel(m.host, /stage/i);
    act(() => {
      stage.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    });
    expect(onChange).toHaveBeenCalledWith("tier");
  });

  it("ArrowLeft on stage button wraps to velocity", () => {
    const onChange = vi.fn<(m: PatternMode) => void>();
    const m = mount(<PatternModeToggle mode="stage" onChange={onChange} />);
    cleanups.push(m.unmount);
    const stage = findButtonByLabel(m.host, /stage/i);
    act(() => {
      stage.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
      );
    });
    expect(onChange).toHaveBeenCalledWith("velocity");
  });

  it("ArrowRight on velocity button wraps to stage", () => {
    const onChange = vi.fn<(m: PatternMode) => void>();
    const m = mount(<PatternModeToggle mode="velocity" onChange={onChange} />);
    cleanups.push(m.unmount);
    const velocity = findButtonByLabel(m.host, /velocity/i);
    act(() => {
      velocity.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    });
    expect(onChange).toHaveBeenCalledWith("stage");
  });
});
