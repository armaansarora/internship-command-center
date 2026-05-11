// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

(globalThis as unknown as {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

import { RevokeButton } from "./RevokeButton";

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

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

let cleanups: Array<() => void> = [];
beforeEach(() => {
  cleanups = [];
});
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups = [];
});

describe("RevokeButton", () => {
  it("renders the trigger button labelled for the scope", () => {
    const m = mount(
      <RevokeButton scope="networking" onConfirm={async () => {}} />,
    );
    cleanups.push(m.unmount);
    const trigger = m.host.querySelector<HTMLButtonElement>(
      "[data-testid='revoke-trigger-networking']",
    );
    expect(trigger).not.toBeNull();
    expect(trigger!.textContent).toContain("Revoke matching consent");
  });

  it("does not render the modal until the trigger is clicked", () => {
    const m = mount(
      <RevokeButton scope="gmail" onConfirm={async () => {}} />,
    );
    cleanups.push(m.unmount);
    expect(
      m.host.querySelector("[data-testid='revoke-dialog-gmail']"),
    ).toBeNull();
    const trigger = m.host.querySelector<HTMLButtonElement>(
      "[data-testid='revoke-trigger-gmail']",
    );
    act(() => {
      trigger!.click();
    });
    expect(
      m.host.querySelector("[data-testid='revoke-dialog-gmail']"),
    ).not.toBeNull();
  });

  it("modal has role=dialog and aria-modal=true", () => {
    const m = mount(
      <RevokeButton scope="calendar" onConfirm={async () => {}} />,
    );
    cleanups.push(m.unmount);
    const trigger = m.host.querySelector<HTMLButtonElement>(
      "[data-testid='revoke-trigger-calendar']",
    );
    act(() => {
      trigger!.click();
    });
    const dlg = m.host.querySelector(
      "[data-testid='revoke-dialog-calendar']",
    );
    expect(dlg!.getAttribute("role")).toBe("dialog");
    expect(dlg!.getAttribute("aria-modal")).toBe("true");
  });

  it("closes the modal when Keep is clicked", () => {
    const m = mount(
      <RevokeButton scope="networking" onConfirm={async () => {}} />,
    );
    cleanups.push(m.unmount);
    act(() => {
      m.host
        .querySelector<HTMLButtonElement>(
          "[data-testid='revoke-trigger-networking']",
        )!
        .click();
    });
    expect(
      m.host.querySelector("[data-testid='revoke-dialog-networking']"),
    ).not.toBeNull();
    act(() => {
      m.host
        .querySelector<HTMLButtonElement>(
          "[data-testid='revoke-modal-keep']",
        )!
        .click();
    });
    expect(
      m.host.querySelector("[data-testid='revoke-dialog-networking']"),
    ).toBeNull();
  });

  it("calls onConfirm on confirm and announces success", async () => {
    const onConfirm = vi.fn(async () => {});
    const m = mount(
      <RevokeButton scope="gmail" onConfirm={onConfirm} />,
    );
    cleanups.push(m.unmount);
    act(() => {
      m.host
        .querySelector<HTMLButtonElement>(
          "[data-testid='revoke-trigger-gmail']",
        )!
        .click();
    });
    await act(async () => {
      m.host
        .querySelector<HTMLButtonElement>(
          "[data-testid='revoke-modal-confirm']",
        )!
        .click();
    });
    await flush();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const status = m.host.querySelector(
      "[data-testid='revoke-status-gmail']",
    );
    expect(status!.textContent).toContain("Gmail disconnected");
    expect(status!.textContent).toContain(
      "Logged in your audit timeline.",
    );
    expect(status!.getAttribute("aria-live")).toBe("polite");
  });

  it("shows an error and keeps the modal open if onConfirm rejects", async () => {
    const onConfirm = vi.fn(async () => {
      throw new Error("boom — network down");
    });
    const m = mount(
      <RevokeButton scope="networking" onConfirm={onConfirm} />,
    );
    cleanups.push(m.unmount);
    act(() => {
      m.host
        .querySelector<HTMLButtonElement>(
          "[data-testid='revoke-trigger-networking']",
        )!
        .click();
    });
    await act(async () => {
      m.host
        .querySelector<HTMLButtonElement>(
          "[data-testid='revoke-modal-confirm']",
        )!
        .click();
    });
    await flush();
    const status = m.host.querySelector(
      "[data-testid='revoke-status-networking']",
    );
    expect(status!.textContent).toContain("Error:");
    expect(status!.textContent).toContain("boom — network down");
    // Modal still open so the user can retry.
    expect(
      m.host.querySelector("[data-testid='revoke-dialog-networking']"),
    ).not.toBeNull();
  });

  it("respects the disabled prop and does not open the modal", () => {
    const m = mount(
      <RevokeButton
        scope="all-data"
        onConfirm={async () => {}}
        disabled
      />,
    );
    cleanups.push(m.unmount);
    const trigger = m.host.querySelector<HTMLButtonElement>(
      "[data-testid='revoke-trigger-all-data']",
    );
    expect(trigger!.disabled).toBe(true);
    act(() => {
      trigger!.click();
    });
    expect(
      m.host.querySelector("[data-testid='revoke-dialog-all-data']"),
    ).toBeNull();
  });

  it("renders scope-specific consequence copy", () => {
    const scopes: Array<{
      scope: "networking" | "gmail" | "calendar" | "all-data";
      title: string;
      warningContains: string;
    }> = [
      {
        scope: "networking",
        title: "Revoke warm-intro matching?",
        warningContains: "warm intros",
      },
      {
        scope: "gmail",
        title: "Disconnect Gmail?",
        warningContains: "Gmail OAuth grant",
      },
      {
        scope: "calendar",
        title: "Disconnect Calendar?",
        warningContains: "Calendar OAuth grant",
      },
      {
        scope: "all-data",
        title: "Delete all your Tower data?",
        warningContains: "permanently delete",
      },
    ];
    for (const { scope, title, warningContains } of scopes) {
      const m = mount(
        <RevokeButton scope={scope} onConfirm={async () => {}} />,
      );
      cleanups.push(m.unmount);
      act(() => {
        m.host
          .querySelector<HTMLButtonElement>(
            `[data-testid='revoke-trigger-${scope}']`,
          )!
          .click();
      });
      const dlg = m.host.querySelector(
        `[data-testid='revoke-dialog-${scope}']`,
      );
      expect(dlg!.textContent).toContain(title);
      expect(dlg!.textContent).toContain(warningContains);
    }
  });

  it("Escape key closes the modal", () => {
    const m = mount(
      <RevokeButton scope="gmail" onConfirm={async () => {}} />,
    );
    cleanups.push(m.unmount);
    act(() => {
      m.host
        .querySelector<HTMLButtonElement>(
          "[data-testid='revoke-trigger-gmail']",
        )!
        .click();
    });
    expect(
      m.host.querySelector("[data-testid='revoke-dialog-gmail']"),
    ).not.toBeNull();
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape" }),
      );
    });
    expect(
      m.host.querySelector("[data-testid='revoke-dialog-gmail']"),
    ).toBeNull();
  });
});
