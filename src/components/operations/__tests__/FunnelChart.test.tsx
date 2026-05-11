// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { FunnelChart } from "../FunnelChart";
import {
  ACTIVATION_BEATS,
  ACTIVATION_OUTCOMES,
} from "@/lib/analytics/activation-metrics";
import type {
  ActivationBeatCounts,
  ActivationOutcomeCounts,
} from "@/lib/db/queries/operations-rest";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * FunnelChart render contract.
 *
 * Asserts:
 *   - Renders one bar per beat in ACTIVATION_BEATS.
 *   - Each non-zero outcome becomes a segment with the right width and
 *     a native-tooltip `title` attribute carrying the raw count.
 *   - The empty state renders when every beat is zero, and no segment
 *     elements are produced.
 */

interface Mounted {
  host: HTMLDivElement;
  root: Root;
  unmount: () => void;
}

function mount(node: ReactElement): Mounted {
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

function emptyOutcomeCounts(): ActivationOutcomeCounts {
  const o = {} as ActivationOutcomeCounts;
  for (const outcome of ACTIVATION_OUTCOMES) o[outcome] = 0;
  return o;
}

function emptyBeats(): ActivationBeatCounts {
  const b = {} as ActivationBeatCounts;
  for (const beat of ACTIVATION_BEATS) b[beat] = emptyOutcomeCounts();
  return b;
}

let cleanups: Array<() => void> = [];

beforeEach(() => {
  cleanups = [];
});

afterEach(() => {
  for (const c of cleanups) c();
  cleanups = [];
});

describe("FunnelChart", () => {
  it("renders one bar per beat with segments per outcome", () => {
    const beats = emptyBeats();
    // Lobby reveal: 8 successes, 2 abandons → 80% / 20% split.
    beats.lobby_reveal = {
      success: 8,
      abandon: 2,
      skipped: 0,
      error: 0,
    };
    // CRO recommendation: 5 success, 1 error.
    beats.cro_recommendation = {
      success: 5,
      abandon: 0,
      skipped: 0,
      error: 1,
    };

    const m = mount(<FunnelChart beats={beats} />);
    cleanups.push(m.unmount);

    // One row container per beat.
    for (const beat of ACTIVATION_BEATS) {
      const row = m.host.querySelector(`[data-testid='funnel-beat-${beat}']`);
      expect(row).not.toBeNull();
    }

    // Lobby reveal segments: success (80%) + abandon (20%) — no others.
    const lobbySuccess = m.host.querySelector<HTMLElement>(
      "[data-testid='funnel-segment-lobby_reveal-success']",
    );
    const lobbyAbandon = m.host.querySelector<HTMLElement>(
      "[data-testid='funnel-segment-lobby_reveal-abandon']",
    );
    const lobbySkipped = m.host.querySelector(
      "[data-testid='funnel-segment-lobby_reveal-skipped']",
    );
    const lobbyError = m.host.querySelector(
      "[data-testid='funnel-segment-lobby_reveal-error']",
    );

    expect(lobbySuccess).not.toBeNull();
    expect(lobbyAbandon).not.toBeNull();
    expect(lobbySkipped).toBeNull();
    expect(lobbyError).toBeNull();

    // Widths are written as percentages on the inline style.
    expect(lobbySuccess?.style.width).toBe("80%");
    expect(lobbyAbandon?.style.width).toBe("20%");

    // Counts ride through as data-count + title for hover tooltips.
    expect(lobbySuccess?.getAttribute("data-count")).toBe("8");
    expect(lobbySuccess?.getAttribute("title")).toMatch(/8/);
    expect(lobbyAbandon?.getAttribute("title")).toMatch(/2/);
  });

  it("renders the zero-state when every beat is zero", () => {
    const beats = emptyBeats();
    const m = mount(<FunnelChart beats={beats} />);
    cleanups.push(m.unmount);

    const empty = m.host.querySelector("[data-testid='funnel-chart-empty']");
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toMatch(/no activation events/i);

    // No outcome segments rendered in the zero state.
    const segments = m.host.querySelectorAll(
      "[data-testid^='funnel-segment-'][data-testid*='-success']",
    );
    expect(segments.length).toBe(0);
  });

  it("renders an empty-bar placeholder for a single zero-total beat", () => {
    const beats = emptyBeats();
    // Only one beat has data — the other five are zero but still rendered.
    beats.intake = { success: 3, abandon: 0, skipped: 0, error: 0 };

    const m = mount(<FunnelChart beats={beats} />);
    cleanups.push(m.unmount);

    // The intake bar has its success segment.
    const intakeSuccess = m.host.querySelector(
      "[data-testid='funnel-segment-intake-success']",
    );
    expect(intakeSuccess).not.toBeNull();

    // A zero-total beat gets the placeholder.
    const placeholder = m.host.querySelector(
      "[data-testid='funnel-segment-closing-empty']",
    );
    expect(placeholder).not.toBeNull();
  });
});
