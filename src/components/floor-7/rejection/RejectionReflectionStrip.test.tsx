// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { RejectionReflectionStrip } from "./RejectionReflectionStrip";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * R9.6 — RejectionReflectionStrip render + interaction tests.
 *
 * Contract:
 *   - Renders three chip buttons with the partner-specified labels.
 *   - Chips are toggleable (multi-select), reflect state via aria-pressed.
 *   - Action button text is "Skip" until any chip selected OR text typed,
 *     then becomes "Save". Clearing both reverts to "Skip".
 *   - Clicking "Skip" calls onSkip; clicking "Save" calls onSubmit with
 *     the selected reasons and free text.
 *   - The strip has role="region" + aria-label="Reflection prompt".
 *
 * Following the manual createRoot + react act() pattern (project doesn't
 * use @testing-library/react — see CLAUDE.md gotcha note).
 */

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

function findChip(host: HTMLElement, label: RegExp): HTMLButtonElement {
  const buttons = host.querySelectorAll<HTMLButtonElement>("button[data-chip]");
  for (const btn of Array.from(buttons)) {
    if (label.test(btn.textContent ?? "")) return btn;
  }
  throw new Error(`No chip matched ${label}`);
}

function findActionButton(host: HTMLElement): HTMLButtonElement {
  const btn = host.querySelector<HTMLButtonElement>('button[data-action="submit"]');
  if (!btn) throw new Error("Submit/skip button not found");
  return btn;
}

function findTextarea(host: HTMLElement): HTMLTextAreaElement {
  const ta = host.querySelector<HTMLTextAreaElement>("textarea");
  if (!ta) throw new Error("Textarea not found");
  return ta;
}

/**
 * React 19 + happy-dom: setting `.value` directly bypasses React's onChange
 * because React tracks the previous value via a hidden internal setter.
 * This helper invokes that internal setter so React notices the change.
 */
function setTextareaValue(ta: HTMLTextAreaElement, value: string): void {
  const proto = Object.getPrototypeOf(ta) as HTMLTextAreaElement;
  const desc = Object.getOwnPropertyDescriptor(proto, "value");
  desc?.set?.call(ta, value);
  ta.dispatchEvent(new Event("input", { bubbles: true }));
}

let cleanups: Array<() => void> = [];

beforeEach(() => {
  cleanups = [];
});

afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
});

describe("RejectionReflectionStrip — render", () => {
  it("renders three chip buttons with the partner-specified labels", () => {
    const m = mount(
      <RejectionReflectionStrip
        applicationId="app-1"
        onSubmit={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    cleanups.push(m.unmount);

    expect(findChip(m.host, /Pass didn't match/)).toBeTruthy();
    expect(findChip(m.host, /No response/)).toBeTruthy();
    expect(findChip(m.host, /Rejected after interview/)).toBeTruthy();
  });

  it("chips have type=button and aria-pressed=false initially", () => {
    const m = mount(
      <RejectionReflectionStrip
        applicationId="app-1"
        onSubmit={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    cleanups.push(m.unmount);

    const chip = findChip(m.host, /No response/);
    expect(chip.getAttribute("type")).toBe("button");
    expect(chip.getAttribute("aria-pressed")).toBe("false");
  });

  it("the strip has role=region with aria-label='Reflection prompt'", () => {
    const m = mount(
      <RejectionReflectionStrip
        applicationId="app-1"
        onSubmit={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    cleanups.push(m.unmount);

    const region = m.host.querySelector('[role="region"]');
    expect(region).not.toBeNull();
    expect(region?.getAttribute("aria-label")).toBe("Reflection prompt");
  });

  it("action button starts as 'Skip' when nothing is selected or typed", () => {
    const m = mount(
      <RejectionReflectionStrip
        applicationId="app-1"
        onSubmit={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    cleanups.push(m.unmount);

    expect(findActionButton(m.host).textContent?.trim()).toBe("Skip");
  });
});

describe("RejectionReflectionStrip — chip interaction", () => {
  it("clicking a chip flips aria-pressed to true", () => {
    const m = mount(
      <RejectionReflectionStrip
        applicationId="app-1"
        onSubmit={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    cleanups.push(m.unmount);

    const chip = findChip(m.host, /No response/);
    act(() => {
      chip.click();
    });
    expect(findChip(m.host, /No response/).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("clicking a chip toggles the action button from 'Skip' to 'Save'", () => {
    const m = mount(
      <RejectionReflectionStrip
        applicationId="app-1"
        onSubmit={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    cleanups.push(m.unmount);

    expect(findActionButton(m.host).textContent?.trim()).toBe("Skip");
    act(() => {
      findChip(m.host, /No response/).click();
    });
    expect(findActionButton(m.host).textContent?.trim()).toBe("Save");
  });

  it("supports multi-select — chips toggle independently", () => {
    const m = mount(
      <RejectionReflectionStrip
        applicationId="app-1"
        onSubmit={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    cleanups.push(m.unmount);

    act(() => {
      findChip(m.host, /No response/).click();
    });
    act(() => {
      findChip(m.host, /Pass didn't match/).click();
    });
    expect(findChip(m.host, /No response/).getAttribute("aria-pressed")).toBe("true");
    expect(findChip(m.host, /Pass didn't match/).getAttribute("aria-pressed")).toBe("true");
    expect(findChip(m.host, /Rejected after interview/).getAttribute("aria-pressed")).toBe("false");
  });

  it("clicking a selected chip again deselects it", () => {
    const m = mount(
      <RejectionReflectionStrip
        applicationId="app-1"
        onSubmit={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    cleanups.push(m.unmount);

    act(() => {
      findChip(m.host, /No response/).click();
    });
    act(() => {
      findChip(m.host, /No response/).click();
    });
    expect(findChip(m.host, /No response/).getAttribute("aria-pressed")).toBe("false");
    expect(findActionButton(m.host).textContent?.trim()).toBe("Skip");
  });
});

describe("RejectionReflectionStrip — textarea interaction", () => {
  it("typing in the textarea (no chips) flips the action button to 'Save'", () => {
    const m = mount(
      <RejectionReflectionStrip
        applicationId="app-1"
        onSubmit={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    cleanups.push(m.unmount);

    const ta = findTextarea(m.host);
    act(() => {
      setTextareaValue(ta, "they ghosted");
    });
    expect(findActionButton(m.host).textContent?.trim()).toBe("Save");
  });

  it("clearing the textarea AND chips reverts to 'Skip'", () => {
    const m = mount(
      <RejectionReflectionStrip
        applicationId="app-1"
        onSubmit={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    cleanups.push(m.unmount);

    const ta = findTextarea(m.host);
    act(() => {
      setTextareaValue(ta, "x");
    });
    expect(findActionButton(m.host).textContent?.trim()).toBe("Save");

    act(() => {
      setTextareaValue(ta, "");
    });
    expect(findActionButton(m.host).textContent?.trim()).toBe("Skip");
  });
});

describe("RejectionReflectionStrip — submit + skip", () => {
  it("clicking 'Skip' calls onSkip and not onSubmit", () => {
    const onSubmit = vi.fn();
    const onSkip = vi.fn();
    const m = mount(
      <RejectionReflectionStrip
        applicationId="app-1"
        onSubmit={onSubmit}
        onSkip={onSkip}
      />,
    );
    cleanups.push(m.unmount);

    act(() => {
      findActionButton(m.host).click();
    });
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clicking 'Save' calls onSubmit with the selected reasons + freeText", () => {
    const onSubmit = vi.fn();
    const onSkip = vi.fn();
    const m = mount(
      <RejectionReflectionStrip
        applicationId="app-1"
        onSubmit={onSubmit}
        onSkip={onSkip}
      />,
    );
    cleanups.push(m.unmount);

    act(() => {
      findChip(m.host, /No response/).click();
    });
    act(() => {
      findChip(m.host, /Pass didn't match/).click();
    });
    const ta = findTextarea(m.host);
    act(() => {
      setTextareaValue(ta, "took 6 weeks");
    });
    act(() => {
      findActionButton(m.host).click();
    });
    expect(onSkip).not.toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const call = onSubmit.mock.calls[0][0] as {
      reasons: string[];
      freeText: string;
    };
    expect(call.reasons).toContain("No response");
    expect(call.reasons).toContain("Pass didn't match");
    expect(call.freeText).toBe("took 6 weeks");
  });

  it("when only freeText is typed and no chips selected, Save calls onSubmit with empty reasons", () => {
    const onSubmit = vi.fn();
    const onSkip = vi.fn();
    const m = mount(
      <RejectionReflectionStrip
        applicationId="app-1"
        onSubmit={onSubmit}
        onSkip={onSkip}
      />,
    );
    cleanups.push(m.unmount);

    const ta = findTextarea(m.host);
    act(() => {
      setTextareaValue(ta, "free thoughts");
    });
    act(() => {
      findActionButton(m.host).click();
    });
    expect(onSkip).not.toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const call = onSubmit.mock.calls[0][0] as {
      reasons: string[];
      freeText: string;
    };
    expect(call.reasons).toEqual([]);
    expect(call.freeText).toBe("free thoughts");
  });
});
