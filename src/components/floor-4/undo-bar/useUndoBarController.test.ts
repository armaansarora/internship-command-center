// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
// @testing-library/react isn't installed in this repo (per CLAUDE.md).
// Use the manual-mount pattern matching the WallInscription.test.tsx style.
import { createRoot, type Root } from "react-dom/client";
import { act as reactAct, createElement } from "react";
import {
  useUndoBarController,
  type UndoBarController,
  type UndoBarState,
} from "./useUndoBarController";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

interface HarnessProps {
  onRender: (s: UndoBarState, c: UndoBarController) => void;
  fetchImpl?: typeof fetch;
}

function Harness({ onRender, fetchImpl }: HarnessProps): null {
  const controller = useUndoBarController({ fetchImpl });
  onRender(controller.state, controller);
  return null;
}

describe("useUndoBarController", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    reactAct(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
  });

  interface Mounted {
    /** The most-recently-rendered state. */
    latest(): UndoBarState;
    /** The most-recently-rendered controller. */
    controller(): UndoBarController;
    /** Array of every state value the harness has observed, in order. */
    history: UndoBarState[];
  }

  function mount(fetchImpl?: typeof fetch): Mounted {
    const history: UndoBarState[] = [];
    let latestController: UndoBarController | null = null;
    reactAct(() => {
      root.render(
        createElement(Harness, {
          onRender: (s, c) => {
            history.push(s);
            latestController = c;
          },
          fetchImpl,
        }),
      );
    });
    return {
      latest: () => history[history.length - 1]!,
      controller: () => {
        if (!latestController) throw new Error("controller not ready");
        return latestController;
      },
      history,
    };
  }

  async function flushMicrotasks(): Promise<void> {
    // Fake timers don't auto-flush the microtask queue. Advancing timers by
    // 0 + yielding multiple times drains any queued promise continuations.
    for (let i = 0; i < 4; i++) {
      await Promise.resolve();
    }
  }

  it("starts in idle phase", () => {
    const m = mount();
    expect(m.latest().phase).toBe("idle");
    expect(m.latest().outreachId).toBeNull();
  });

  it("dispatch → in_flight with sendAfterMs", () => {
    const m = mount();
    const sendAfter = new Date(Date.now() + 30_000).toISOString();
    reactAct(() => {
      m.controller().dispatch({
        outreachId: "11111111-1111-4111-8111-111111111111",
        recipient: "alex@example.com",
        sendAfterIso: sendAfter,
      });
    });
    expect(m.latest().phase).toBe("in_flight");
    expect(m.latest().outreachId).toBe("11111111-1111-4111-8111-111111111111");
    expect(m.latest().recipient).toBe("alex@example.com");
    expect(m.latest().sendAfterMs).toBe(new Date(sendAfter).getTime());
  });

  it("auto-returns to idle after window elapses without cancel", () => {
    const m = mount();
    const sendAfter = new Date(Date.now() + 30_000).toISOString();
    reactAct(() => {
      m.controller().dispatch({
        outreachId: "11111111-1111-4111-8111-111111111111",
        recipient: "a@b.com",
        sendAfterIso: sendAfter,
      });
    });
    expect(m.latest().phase).toBe("in_flight");
    reactAct(() => {
      vi.advanceTimersByTime(30_100);
    });
    expect(m.latest().phase).toBe("idle");
  });

  it("cancel success → cancelled phase → fades to idle after 2s", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, id: "x" }), { status: 200 }),
    );
    const m = mount(fetchMock as unknown as typeof fetch);
    reactAct(() => {
      m.controller().dispatch({
        outreachId: "22222222-2222-4222-8222-222222222222",
        recipient: "b@c.com",
        sendAfterIso: new Date(Date.now() + 30_000).toISOString(),
      });
    });
    await reactAct(async () => {
      const p = m.controller().cancel();
      await flushMicrotasks();
      await p;
    });
    // React may batch cancelling+cancelled into a single commit so history
    // needn't observe "cancelling" as a distinct render. The terminal phase
    // is what matters — and that it arrives after the fetch resolves.
    expect(m.latest().phase).toBe("cancelled");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/outreach/undo",
      expect.objectContaining({ method: "POST" }),
    );
    reactAct(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(m.latest().phase).toBe("idle");
  });

  it("cancel 409 → too_late phase → fades to idle after 3s", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ error: "too_late" }), { status: 409 }),
    );
    const m = mount(fetchMock as unknown as typeof fetch);
    reactAct(() => {
      m.controller().dispatch({
        outreachId: "33333333-3333-4333-8333-333333333333",
        recipient: "c@d.com",
        sendAfterIso: new Date(Date.now() + 30_000).toISOString(),
      });
    });
    await reactAct(async () => {
      const p = m.controller().cancel();
      await flushMicrotasks();
      await p;
    });
    expect(m.latest().phase).toBe("too_late");
    reactAct(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(m.latest().phase).toBe("idle");
  });

  it("cancel network error → too_late (safest assumption)", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    });
    const m = mount(fetchMock as unknown as typeof fetch);
    reactAct(() => {
      m.controller().dispatch({
        outreachId: "44444444-4444-4444-8444-444444444444",
        recipient: "d@e.com",
        sendAfterIso: new Date(Date.now() + 30_000).toISOString(),
      });
    });
    await reactAct(async () => {
      const p = m.controller().cancel();
      await flushMicrotasks();
      await p;
    });
    expect(m.latest().phase).toBe("too_late");
  });

  it("cancel while not in_flight is a no-op", async () => {
    const fetchMock = vi.fn();
    const m = mount(fetchMock as unknown as typeof fetch);
    await reactAct(async () => {
      await m.controller().cancel();
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(m.latest().phase).toBe("idle");
  });

  it("dispatch replaces an existing in_flight state", () => {
    const m = mount();
    reactAct(() => {
      m.controller().dispatch({
        outreachId: "11111111-1111-4111-8111-111111111111",
        recipient: "a@b.com",
        sendAfterIso: new Date(Date.now() + 30_000).toISOString(),
      });
    });
    reactAct(() => {
      m.controller().dispatch({
        outreachId: "55555555-5555-4555-8555-555555555555",
        recipient: "e@f.com",
        sendAfterIso: new Date(Date.now() + 30_000).toISOString(),
      });
    });
    expect(m.latest().outreachId).toBe("55555555-5555-4555-8555-555555555555");
  });

  it("dismiss → idle immediately", () => {
    const m = mount();
    reactAct(() => {
      m.controller().dispatch({
        outreachId: "66666666-6666-4666-8666-666666666666",
        recipient: "g@h.com",
        sendAfterIso: new Date(Date.now() + 30_000).toISOString(),
      });
    });
    reactAct(() => {
      m.controller().dismiss();
    });
    expect(m.latest().phase).toBe("idle");
  });
});
