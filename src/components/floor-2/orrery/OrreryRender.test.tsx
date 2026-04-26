// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { OrreryPlanet } from "@/lib/orrery/types";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * OrreryRender SSR + invariant tests.
 *
 * The orrery render primitive consumes OrreryPlanet[] from R9.1 and renders a
 * CSS 3D scene. Tests exercise SSR safety, aria contracts, the empty-state
 * path, and the reduced-motion class signal. GSAP timeline behavior is NOT
 * exercised here — it lives behind a real RAF loop and is covered by R9.5's
 * source-inspection invariants.
 */

vi.mock("@/lib/gsap-init", () => {
  type Tween = { kill: () => void };
  type Timeline = {
    to: (..._args: unknown[]) => Timeline;
    set: (..._args: unknown[]) => Timeline;
    fromTo: (..._args: unknown[]) => Timeline;
    add: (..._args: unknown[]) => Timeline;
    kill: () => void;
  };
  function makeTimeline(): Timeline {
    const tl: Timeline = {
      to: () => tl,
      set: () => tl,
      fromTo: () => tl,
      add: () => tl,
      kill: () => undefined,
    };
    return tl;
  }
  function makeTween(): Tween {
    return { kill: () => undefined };
  }
  return {
    gsap: {
      timeline: () => makeTimeline(),
      to: () => makeTween(),
      set: () => undefined,
      fromTo: () => makeTween(),
    },
  };
});

import { OrreryRender } from "./OrreryRender";

function makePlanet(i: number, overrides: Partial<OrreryPlanet> = {}): OrreryPlanet {
  return {
    id: `app-${i}`,
    label: `Acme ${i}`,
    role: "Software Engineer Intern",
    tier: ((i % 4) + 1) as 1 | 2 | 3 | 4,
    status: "applied",
    radius: 0.4,
    angleDeg: (i * 37) % 360,
    sizePx: 18,
    colorToken: "--orrery-status-applied",
    hasSatellite: false,
    isSupernova: false,
    isFading: false,
    matchScore: 0.8,
    appliedAt: "2026-04-01T00:00:00Z",
    lastActivityAt: "2026-04-15T00:00:00Z",
    ...overrides,
  };
}

describe("OrreryRender — SSR safety", () => {
  it("renders without throwing on a 1-planet fixture", () => {
    expect(() =>
      renderToString(
        <OrreryRender
          planets={[makePlanet(0)]}
          mode="stage"
          focusPlanetId={null}
          reducedMotion={false}
          onPlanetClick={() => undefined}
        />,
      ),
    ).not.toThrow();
  });

  it("renders without throwing on an empty planets array", () => {
    expect(() =>
      renderToString(
        <OrreryRender
          planets={[]}
          mode="stage"
          focusPlanetId={null}
          reducedMotion={false}
          onPlanetClick={() => undefined}
        />,
      ),
    ).not.toThrow();
  });

  it("renders a tier-1, -2, -3, -4 mix without throwing", () => {
    const planets = [
      makePlanet(0, { tier: 1 }),
      makePlanet(1, { tier: 2 }),
      makePlanet(2, { tier: 3 }),
      makePlanet(3, { tier: 4 }),
    ];
    expect(() =>
      renderToString(
        <OrreryRender
          planets={planets}
          mode="tier"
          focusPlanetId={null}
          reducedMotion={false}
          onPlanetClick={() => undefined}
        />,
      ),
    ).not.toThrow();
  });
});

describe("OrreryRender — aria contracts", () => {
  it("scene container has role=img and an aria-label reflecting planet count", () => {
    const planets = Array.from({ length: 7 }, (_, i) => makePlanet(i));
    const html = renderToString(
      <OrreryRender
        planets={planets}
        mode="stage"
        focusPlanetId={null}
        reducedMotion={false}
        onPlanetClick={() => undefined}
      />,
    );
    expect(html).toMatch(/role="img"/);
    expect(html).toMatch(/aria-label="Pipeline orrery: 7 applications"/);
  });

  it("aria-label says 'empty' when no planets are provided", () => {
    const html = renderToString(
      <OrreryRender
        planets={[]}
        mode="stage"
        focusPlanetId={null}
        reducedMotion={false}
        onPlanetClick={() => undefined}
      />,
    );
    expect(html).toMatch(/aria-label="Pipeline orrery: empty"/);
  });

  it("each planet's aria-label matches '{role} at {label}, {status}'", () => {
    const planets = [
      makePlanet(0, {
        role: "Software Engineer Intern",
        label: "Acme Robotics",
        status: "interviewing",
      }),
      makePlanet(1, {
        role: "Quant Researcher",
        label: "Hudson River",
        status: "offer",
      }),
    ];
    const html = renderToString(
      <OrreryRender
        planets={planets}
        mode="stage"
        focusPlanetId={null}
        reducedMotion={false}
        onPlanetClick={() => undefined}
      />,
    );
    expect(html).toMatch(
      /aria-label="Software Engineer Intern at Acme Robotics, interviewing"/,
    );
    expect(html).toMatch(
      /aria-label="Quant Researcher at Hudson River, offer"/,
    );
  });
});

describe("OrreryRender — buttons (keyboard a11y)", () => {
  it("each planet is a <button type=\"button\"> (not a div)", () => {
    const planets = Array.from({ length: 3 }, (_, i) => makePlanet(i));
    const html = renderToString(
      <OrreryRender
        planets={planets}
        mode="stage"
        focusPlanetId={null}
        reducedMotion={false}
        onPlanetClick={() => undefined}
      />,
    );
    const planetButtons = html.match(/<button[^>]*class="[^"]*orrery-planet[^"]*"/g) ?? [];
    expect(planetButtons.length).toBe(3);
    for (const tag of planetButtons) {
      expect(tag).toMatch(/type="button"/);
    }
  });
});

describe("OrreryRender — colorToken inline style", () => {
  it("each planet has background: var(--orrery-...) inline", () => {
    const planets = [
      makePlanet(0, { colorToken: "--orrery-status-offer" }),
      makePlanet(1, { colorToken: "--orrery-tier-2" }),
      makePlanet(2, { colorToken: "--orrery-velocity-recent" }),
    ];
    const html = renderToString(
      <OrreryRender
        planets={planets}
        mode="stage"
        focusPlanetId={null}
        reducedMotion={false}
        onPlanetClick={() => undefined}
      />,
    );
    expect(html).toMatch(/background:\s*var\(--orrery-status-offer\)/);
    expect(html).toMatch(/background:\s*var\(--orrery-tier-2\)/);
    expect(html).toMatch(/background:\s*var\(--orrery-velocity-recent\)/);
  });
});

describe("OrreryRender — reduced-motion path", () => {
  it("scene root carries the orrery-reduced class when reducedMotion=true", () => {
    const planets = Array.from({ length: 4 }, (_, i) => makePlanet(i));
    const html = renderToString(
      <OrreryRender
        planets={planets}
        mode="stage"
        focusPlanetId={null}
        reducedMotion={true}
        onPlanetClick={() => undefined}
      />,
    );
    // Root scene must signal the reduced class so CSS can disable orbit
    // animation and supernova keyframes without JS reaching back in.
    expect(html).toMatch(/class="[^"]*orrery-reduced[^"]*"/);
  });

  it("scene root does NOT carry orrery-reduced when reducedMotion=false", () => {
    const planets = Array.from({ length: 4 }, (_, i) => makePlanet(i));
    const html = renderToString(
      <OrreryRender
        planets={planets}
        mode="stage"
        focusPlanetId={null}
        reducedMotion={false}
        onPlanetClick={() => undefined}
      />,
    );
    expect(html).not.toMatch(/class="[^"]*orrery-reduced[^"]*"/);
  });
});

describe("OrreryRender — modifier classes", () => {
  it("supernova flag adds orrery-supernova class", () => {
    const html = renderToString(
      <OrreryRender
        planets={[makePlanet(0, { isSupernova: true })]}
        mode="stage"
        focusPlanetId={null}
        reducedMotion={false}
        onPlanetClick={() => undefined}
      />,
    );
    expect(html).toMatch(/class="[^"]*orrery-supernova[^"]*"/);
  });

  it("fading flag adds orrery-fading class", () => {
    const html = renderToString(
      <OrreryRender
        planets={[makePlanet(0, { isFading: true })]}
        mode="stage"
        focusPlanetId={null}
        reducedMotion={false}
        onPlanetClick={() => undefined}
      />,
    );
    expect(html).toMatch(/class="[^"]*orrery-fading[^"]*"/);
  });

  it("satellite flag adds orrery-satellite class", () => {
    const html = renderToString(
      <OrreryRender
        planets={[makePlanet(0, { hasSatellite: true })]}
        mode="stage"
        focusPlanetId={null}
        reducedMotion={false}
        onPlanetClick={() => undefined}
      />,
    );
    expect(html).toMatch(/class="[^"]*orrery-satellite[^"]*"/);
  });
});
