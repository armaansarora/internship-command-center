# R9 Observatory Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Each task is sized for a fresh subagent. Tasks marked **[parallel-safe]** can be dispatched concurrently with other parallel-safe tasks; chained tasks must run in order. Design context is in `docs/plans/2026-04-23-r9-observatory-design.md`.

**Goal:** Ship Floor 2's Orrery centerpiece (CSS 3D pipeline-as-planets), opt-in rejection autopsy, CFO threshold cron, and State of the Month PDF — meeting the 60fps@100 perf gate and all 6 partner constraints.

**Architecture:** Decoupled render/data layers — `OrreryPlanet[]` typed contract; `OrreryRender.tsx` is the **only** file touching CSS 3D transforms (R3F-swap-ready). Reuses R8 cron pattern and R7 pneumatic-tube infra. Reuses `@react-pdf/renderer` (no new deps).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v3, GSAP (via `@/lib/gsap-init`), Supabase REST (NOT Drizzle at runtime — gotcha #1), `@react-pdf/renderer` (existing).

**Conventions (CLAUDE.md):** Server Components by default; `import type { JSX } from "react"`; Zod v4; `auth.uid() = user_id` RLS; `[R9/9.n] type: subject` commit prefix; commit per task.

---

## Task R9.1 — Data layer: OrreryPlanet contract + transformer [parallel-safe with R9.6/R9.7/R9.8]

**Files:**
- Create: `src/lib/orrery/types.ts`
- Create: `src/lib/orrery/applications-to-planets.ts`
- Create: `src/lib/orrery/applications-to-planets.test.ts`

**Step 1: Write the failing test (`applications-to-planets.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { applicationsToPlanets } from "./applications-to-planets";
import type { Status } from "./types";

const baseApp = {
  id: "00000000-0000-0000-0000-000000000001",
  companyName: "Acme",
  role: "Analyst",
  tier: 1,
  status: "applied" as Status,
  matchScore: 0.8,
  appliedAt: "2026-04-01T00:00:00Z",
  lastActivityAt: "2026-04-10T00:00:00Z",
  hasOfferEverFired: false,
};

describe("applicationsToPlanets — stage mode", () => {
  it("maps tier→radius (inner=1, outer=4)", () => {
    const planets = applicationsToPlanets(
      [
        { ...baseApp, id: "a", tier: 1 },
        { ...baseApp, id: "b", tier: 4 },
      ],
      "stage",
    );
    expect(planets[0].radius).toBeLessThan(planets[1].radius);
  });

  it("produces hash-stable angle for same id across calls", () => {
    const a = applicationsToPlanets([baseApp], "stage")[0];
    const b = applicationsToPlanets([baseApp], "stage")[0];
    expect(a.angleDeg).toBe(b.angleDeg);
  });

  it("flags supernova ONLY when status=offer AND hasOfferEverFired=false", () => {
    const fresh = applicationsToPlanets(
      [{ ...baseApp, status: "offer", hasOfferEverFired: false }],
      "stage",
    )[0];
    const second = applicationsToPlanets(
      [{ ...baseApp, status: "offer", hasOfferEverFired: true }],
      "stage",
    )[0];
    expect(fresh.isSupernova).toBe(true);
    expect(second.isSupernova).toBe(false);
  });

  it("flags fading for rejected and withdrawn", () => {
    const rejected = applicationsToPlanets(
      [{ ...baseApp, status: "rejected" }],
      "stage",
    )[0];
    expect(rejected.isFading).toBe(true);
  });

  it("flags hasSatellite for interview_scheduled and interviewing", () => {
    const sched = applicationsToPlanets(
      [{ ...baseApp, status: "interview_scheduled" }],
      "stage",
    )[0];
    expect(sched.hasSatellite).toBe(true);
  });

  it("velocity mode: radius derived from days-since-applied (recent = inner)", () => {
    const recent = { ...baseApp, id: "r", appliedAt: "2026-04-22T00:00:00Z" };
    const old = { ...baseApp, id: "o", appliedAt: "2026-01-01T00:00:00Z" };
    const planets = applicationsToPlanets([recent, old], "velocity");
    const recentPlanet = planets.find((p) => p.id === "r")!;
    const oldPlanet = planets.find((p) => p.id === "o")!;
    expect(recentPlanet.radius).toBeLessThan(oldPlanet.radius);
  });
});
```

**Step 2: Run test, expect failure**

```bash
npx vitest run src/lib/orrery/applications-to-planets.test.ts
```

**Step 3: Write `types.ts`** — exact contract from design §2 (see design doc). All exports.

**Step 4: Write `applications-to-planets.ts`**

Key rules:
- Hash function: simple FNV-1a → mod 360 for angle
- `radius` in stage/tier modes: `0.25 + (tier - 1) * 0.25` (so tier 1→0.25, tier 4→1.0)
- `radius` in velocity mode: clamp(daysSinceApplied / 90, 0.15, 1.0)
- `colorToken`: returns CSS variable name like `--orrery-status-applied`, never raw hex
- Today's date threaded as a param `(now = new Date())` for testability
- `isSupernova = status==='offer' && !hasOfferEverFired` (consumer is responsible for reading prior state from DB; this fn is pure given input)

**Step 5: Run tests, all pass**

```bash
npx vitest run src/lib/orrery/applications-to-planets.test.ts
```

**Step 6: tsc + lint check**

```bash
npx tsc --noEmit && npm run lint
```

**Step 7: Commit**

```bash
npm run t start R9.1
git add src/lib/orrery/
git commit -m "[R9/9.1] feat(orrery): typed OrreryPlanet contract + transformer"
npm run t done R9.1
```

---

## Task R9.2 — Render layer: CSS 3D Orrery primitive (depends: R9.1)

**Files:**
- Create: `src/components/floor-2/orrery/OrreryRender.tsx`
- Create: `src/components/floor-2/orrery/orrery.css`
- Create: `src/components/floor-2/orrery/OrreryRender.test.tsx`

**Critical constraint:** This is the ONLY file in the codebase that uses CSS 3D `transform-style: preserve-3d` for the orrery. Callers must NEVER reach in.

**Step 1: Write SSR + a11y smoke test**

```tsx
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { OrreryRender } from "./OrreryRender";
import type { OrreryPlanet } from "@/lib/orrery/types";

const fixture: OrreryPlanet[] = [
  {
    id: "a", label: "Acme", role: "Analyst", tier: 1, status: "applied",
    radius: 0.25, angleDeg: 45, sizePx: 18,
    colorToken: "--orrery-status-applied",
    hasSatellite: false, isSupernova: false, isFading: false,
    matchScore: 0.8, appliedAt: "2026-04-01T00:00:00Z",
    lastActivityAt: "2026-04-10T00:00:00Z",
  },
];

describe("OrreryRender", () => {
  it("renders SSR-safe with no errors", () => {
    const html = renderToString(
      <OrreryRender planets={fixture} mode="stage" focusPlanetId={null} reducedMotion={false} onPlanetClick={() => {}} />
    );
    expect(html).toContain("Acme");
  });

  it("emits aria-label per planet of the form 'Role at Company, status'", () => {
    const html = renderToString(
      <OrreryRender planets={fixture} mode="stage" focusPlanetId={null} reducedMotion={false} onPlanetClick={() => {}} />
    );
    expect(html).toMatch(/aria-label="[^"]*Analyst at Acme[^"]*applied[^"]*"/);
  });

  it("respects reducedMotion (no rotation animation classes)", () => {
    const html = renderToString(
      <OrreryRender planets={fixture} mode="stage" focusPlanetId={null} reducedMotion={true} onPlanetClick={() => {}} />
    );
    expect(html).not.toMatch(/animation: orrery-orbit/);
  });
});
```

**Step 2: Run, expect failure**

**Step 3: Implement `OrreryRender.tsx`**

Shape:
```tsx
"use client";
import type { JSX } from "react";
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap-init";
import type { OrreryPlanet, PatternMode } from "@/lib/orrery/types";
import "./orrery.css";

interface Props {
  planets: OrreryPlanet[];
  mode: PatternMode;
  focusPlanetId: string | null;
  reducedMotion: boolean;
  onPlanetClick: (id: string) => void;
}

export function OrreryRender({ planets, mode, focusPlanetId, reducedMotion, onPlanetClick }: Props): JSX.Element {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const orbitRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (reducedMotion) return;
    // ONE timeline drives all 4 orbit groups (single RAF loop, perf gate).
    const tl = gsap.timeline({ repeat: -1, defaults: { ease: "none" } });
    [1, 2, 3, 4].forEach((tier) => {
      const el = orbitRefs.current.get(tier);
      if (!el) return;
      // Outer orbits slower (Kepler-ish).
      const duration = 45 + (tier - 1) * 15; // 45s, 60s, 75s, 90s
      tl.to(el, { rotateZ: 360, duration, transformOrigin: "50% 50%" }, 0);
    });
    return () => { tl.kill(); };
  }, [reducedMotion]);

  // Camera dolly when focus changes
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    if (focusPlanetId == null) {
      gsap.to(el, { scale: 1, x: 0, y: 0, duration: reducedMotion ? 0 : 0.4, ease: "power2.out" });
    } else {
      gsap.to(el, { scale: 1.4, duration: reducedMotion ? 0 : 0.6, ease: "power2.out" });
    }
  }, [focusPlanetId, reducedMotion]);

  // Group planets by tier for orbit rendering
  const byTier = new Map<number, OrreryPlanet[]>();
  planets.forEach((p) => {
    const arr = byTier.get(p.tier) ?? [];
    arr.push(p);
    byTier.set(p.tier, arr);
  });

  return (
    <div className={`orrery-scene${reducedMotion ? " orrery-reduced" : ""}`} ref={sceneRef} role="img" aria-label={`Pipeline orrery: ${planets.length} applications`}>
      {[1, 2, 3, 4].map((tier) => {
        const tierPlanets = byTier.get(tier) ?? [];
        // Radius in pixels — the CSS variable lets responsive break it
        const radiusPct = 12 + (tier - 1) * 12; // 12%, 24%, 36%, 48% of scene radius
        return (
          <div
            key={tier}
            className="orrery-orbit"
            ref={(el) => { if (el) orbitRefs.current.set(tier, el); else orbitRefs.current.delete(tier); }}
            data-tier={tier}
            style={{ width: `${radiusPct * 2}%`, height: `${radiusPct * 2}%` }}
          >
            {tierPlanets.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`orrery-planet${p.isSupernova ? " orrery-supernova" : ""}${p.isFading ? " orrery-fading" : ""}${p.hasSatellite ? " orrery-satellite" : ""}`}
                style={{
                  width: p.sizePx,
                  height: p.sizePx,
                  // Polar→cartesian: inline transform keeps planet upright
                  transform: `rotate(${p.angleDeg}deg) translateY(-50%) rotate(-${p.angleDeg}deg)`,
                  background: `var(${p.colorToken})`,
                }}
                onClick={() => onPlanetClick(p.id)}
                aria-label={`${p.role} at ${p.label}, ${p.status}`}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
```

**Step 4: Implement `orrery.css`**

```css
.orrery-scene {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  perspective: 1200px;
  contain: layout paint;
}
.orrery-orbit {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%) rotateX(60deg);
  transform-style: preserve-3d;
  border-radius: 50%;
  border: 1px solid rgba(60, 140, 220, 0.08);
  will-change: transform;
}
.orrery-planet {
  position: absolute;
  top: 0; left: 50%;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  contain: layout paint;
  transition: opacity 1.5s ease-out;
  box-shadow: 0 0 8px var(--orrery-glow, rgba(201, 168, 76, 0.3));
}
.orrery-planet.orrery-fading { opacity: 0.2; pointer-events: none; }
.orrery-planet.orrery-satellite::after {
  content: "";
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1px dashed rgba(201, 168, 76, 0.5);
  animation: orrery-satellite 4s linear infinite;
}
.orrery-planet.orrery-supernova {
  animation: orrery-supernova 2.4s ease-out;
  box-shadow: 0 0 32px gold, 0 0 64px gold;
}
@keyframes orrery-satellite { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes orrery-supernova {
  0%   { transform: scale(1); box-shadow: 0 0 8px gold; }
  20%  { transform: scale(2); box-shadow: 0 0 64px gold, 0 0 128px gold; }
  100% { transform: scale(1); box-shadow: 0 0 32px gold, 0 0 64px gold; }
}
:root {
  --orrery-status-discovered: rgba(120, 140, 160, 0.5);
  --orrery-status-applied: rgba(74, 144, 226, 0.85);
  --orrery-status-screening: rgba(220, 170, 90, 0.85);
  --orrery-status-interview_scheduled: #C9A84C;
  --orrery-status-interviewing: #C9A84C;
  --orrery-status-under_review: rgba(120, 100, 200, 0.85);
  --orrery-status-offer: gold;
  --orrery-status-accepted: gold;
  --orrery-status-rejected: rgba(120, 140, 160, 0.3);
  --orrery-status-withdrawn: rgba(120, 140, 160, 0.3);
}
.orrery-reduced .orrery-orbit { animation: none !important; }
@media (prefers-reduced-motion: reduce) {
  .orrery-planet.orrery-supernova { animation: none; }
}
```

**Step 5: Run tests + tsc + lint**

```bash
npx vitest run src/components/floor-2/orrery/OrreryRender.test.tsx
npx tsc --noEmit && npm run lint
```

**Step 6: Commit**

```bash
npm run t start R9.2
git add src/components/floor-2/orrery/
git commit -m "[R9/9.2] feat(orrery): CSS 3D render primitive (sole CSS-3D file)"
npm run t done R9.2
```

---

## Task R9.3 — Click-to-history camera dolly + reveal panel (depends: R9.2)

**Files:**
- Create: `src/components/floor-2/orrery/PlanetDetailPanel.tsx`
- Create: `src/components/floor-2/orrery/PlanetDetailPanel.test.tsx`
- Create: `src/components/floor-2/orrery/Orrery.tsx` (consumer wrapper)

**Step 1: Test the consumer wrapper**

```tsx
// Orrery.test.tsx — verify click sets focus, ESC clears, panel shows history
import { render, fireEvent, screen } from "@testing-library/react";
import { Orrery } from "./Orrery";
import type { OrreryPlanet } from "@/lib/orrery/types";

const planets: OrreryPlanet[] = [/* one fixture */];

it("opens detail panel on planet click and dismisses on ESC", () => {
  render(<Orrery planets={planets} mode="stage" />);
  fireEvent.click(screen.getByLabelText(/Acme/));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.keyDown(document.body, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
```

**Step 2: Implement `Orrery.tsx`**

```tsx
"use client";
import type { JSX } from "react";
import { useState, useEffect } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { OrreryRender } from "./OrreryRender";
import { PlanetDetailPanel } from "./PlanetDetailPanel";
import type { OrreryPlanet, PatternMode } from "@/lib/orrery/types";

interface Props {
  planets: OrreryPlanet[];
  mode: PatternMode;
}
export function Orrery({ planets, mode }: Props): JSX.Element {
  const [focusId, setFocusId] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const focusPlanet = planets.find((p) => p.id === focusId) ?? null;

  useEffect(() => {
    if (focusId == null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFocusId(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [focusId]);

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "1", maxHeight: "70vh" }}>
      <OrreryRender
        planets={planets}
        mode={mode}
        focusPlanetId={focusId}
        reducedMotion={reduced}
        onPlanetClick={setFocusId}
      />
      {focusPlanet && (
        <PlanetDetailPanel planet={focusPlanet} onClose={() => setFocusId(null)} />
      )}
    </div>
  );
}
```

**Step 3: Implement `PlanetDetailPanel.tsx`** — slide-up panel, role="dialog", showing label/role/tier/status/applied/last activity. Pulls history from `application_events` if it exists OR derives sequence from status (server-fetched separately; for now the panel takes the planet directly and shows what's there).

**Step 4: Run tests, tsc, lint, commit**

```bash
npm run t start R9.3
git add src/components/floor-2/orrery/
git commit -m "[R9/9.3] feat(orrery): click-to-history camera dolly + detail panel"
npm run t done R9.3
```

---

## Task R9.4 — Pattern overlay modes + smooth morph (depends: R9.3)

**Files:**
- Create: `src/components/floor-2/orrery/PatternModeToggle.tsx`
- Modify: `src/components/floor-2/orrery/Orrery.tsx` — accept mode from parent OR localStorage; emit onModeChange
- Test: `src/components/floor-2/orrery/PatternModeToggle.test.tsx`

**Approach:** The morph is achieved by GSAP tweening individual planets when the derived `OrreryPlanet[]` changes between modes. Implementation:
- Track previous planets in a ref keyed by id
- On mode change, for each planet, GSAP-tween its DOM element's transform from old (radius, angle) to new over 800ms
- For planets that vanish/appear (shouldn't happen in mode change since same dataset), fade

**Step 1: Test the toggle pill**

Three buttons; aria-pressed reflects current; clicking calls onChange; arrow keys cycle.

**Step 2: Implement toggle + wire localStorage** (`localStorage.getItem("orrery.mode") || "stage"` initial; persist on change).

**Step 3: Implement morph in OrreryRender** — track previous planet positions in ref, GSAP tween on prop change.

**Step 4: Tests + commit**

```bash
npm run t start R9.4
git add src/components/floor-2/orrery/
git commit -m "[R9/9.4] feat(orrery): pattern modes (stage/tier/velocity) + smooth morph"
npm run t done R9.4
```

---

## Task R9.5 — 60fps perf gate proof test (depends: R9.2)

**Files:**
- Create: `src/app/__tests__/r9-orrery-perf.proof.test.ts`

**Step 1: Write the perf proof test**

```ts
import { describe, it, expect } from "vitest";

/**
 * R9.5 — Perf gate. Either:
 *   (a) GSAP timeline tick budget on a 100-planet fixture < 16.67ms mean, OR
 *   (b) virtualization gate: the render layer caps DOM planet count at ≤ 50.
 *
 * JSDOM can't measure real frame time, so we assert the architectural
 * invariants that make 60fps achievable:
 *   - One timeline drives all orbits (not 100 RAF loops)
 *   - No per-planet GSAP tween at idle
 *   - CSS 'contain' is set on the planet element
 */
describe("R9.5 — Orrery perf invariants", () => {
  it("OrreryRender has exactly one effect that creates a timeline", () => {
    const src = require("node:fs").readFileSync(
      require("node:path").resolve(process.cwd(), "src/components/floor-2/orrery/OrreryRender.tsx"),
      "utf-8",
    );
    const timelineCalls = src.match(/gsap\.timeline/g) ?? [];
    expect(timelineCalls.length).toBeLessThanOrEqual(1);
  });

  it("orrery.css declares CSS containment on planet", () => {
    const css = require("node:fs").readFileSync(
      require("node:path").resolve(process.cwd(), "src/components/floor-2/orrery/orrery.css"),
      "utf-8",
    );
    expect(css).toMatch(/\.orrery-planet[^{]*\{[^}]*contain:\s*layout\s+paint/);
  });

  it("orrery.css uses will-change ONLY on orbit groups, not per-planet", () => {
    const css = require("node:fs").readFileSync(
      require("node:path").resolve(process.cwd(), "src/components/floor-2/orrery/orrery.css"),
      "utf-8",
    );
    expect(css).toMatch(/\.orrery-orbit[^{]*\{[^}]*will-change/);
    // Find the .orrery-planet rule body and assert no will-change there
    const planetRule = css.match(/\.orrery-planet\s*\{[^}]*\}/);
    expect(planetRule).not.toBeNull();
    expect(planetRule![0]).not.toMatch(/will-change/);
  });
});
```

**Step 2: Run, verify pass (R9.2 already implements these invariants)**

If any check fails, fix R9.2 source/CSS — do NOT relax the test.

**Step 3: Commit**

```bash
npm run t start R9.5
git add src/app/__tests__/r9-orrery-perf.proof.test.ts
git commit -m "[R9/9.5] test(orrery): perf invariants (single timeline, CSS contain, will-change scope)"
npm run t done R9.5
```

If the architectural-invariant approach is rejected later, the fallback is to add a virtualization gate (cap visible planets at 50 via the front-arc trick from R8) — record the decision in the ledger via `tower block` if needed.

---

## Task R9.6 — Rejection autopsy: schema + setting + inline chips [parallel-safe with R9.1/R9.7/R9.8]

**Files:**
- Create: `src/db/migrations/0019_r9_observatory.sql` (also serves R9.7/R9.8 if needed)
- Modify: `src/db/schema.ts` — append `rejectionReflections` table
- Create: `src/lib/db/queries/rejection-reflections-rest.ts`
- Modify: `src/app/(authenticated)/settings/settings-client.tsx` — add Analytics section with toggle
- Modify: `src/app/(authenticated)/settings/page.tsx` — pass current pref to client
- Modify: `src/app/api/profile/preferences/route.ts` (or create if absent) — POST handler to update jsonb pref
- Modify: `src/components/floor-7/crud/ApplicationCard.tsx` — render `RejectionReflectionStrip` when status=rejected and pref=ON and no row yet
- Create: `src/components/floor-7/rejection/RejectionReflectionStrip.tsx`
- Create: `src/components/floor-7/rejection/RejectionReflectionStrip.test.tsx`
- Create: `src/app/api/rejection-reflections/route.ts` (POST creates a row)

**Step 1: Write migration 0019**

```sql
-- 0019_r9_observatory.sql
CREATE TABLE IF NOT EXISTS rejection_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  reasons text[] NOT NULL DEFAULT '{}',
  free_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rejection_reflections_app_unique UNIQUE(application_id)
);
ALTER TABLE rejection_reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rejection_reflections_user_isolation" ON rejection_reflections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_rejection_reflections_user_created
  ON rejection_reflections(user_id, created_at DESC);
```

**Step 2: Add to `schema.ts`** — Drizzle definition mirroring the SQL (PK uuid, FK references, RLS policy via `userIsolation` helper if it exists, otherwise standard pattern).

**Step 3: Test the strip component**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { RejectionReflectionStrip } from "./RejectionReflectionStrip";

it("shows three chips and Skip-by-default button", () => {
  render(<RejectionReflectionStrip applicationId="x" onSubmit={vi.fn()} onSkip={vi.fn()} />);
  expect(screen.getByRole("button", { name: /pass.*didn.*match/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /no response/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /rejected after interview/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^skip$/i })).toBeInTheDocument();
});
it("Skip becomes Save when a chip is selected", () => {
  const onSubmit = vi.fn();
  render(<RejectionReflectionStrip applicationId="x" onSubmit={onSubmit} onSkip={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /no response/i }));
  expect(screen.getByRole("button", { name: /^save$/i })).toBeInTheDocument();
});
```

**Step 4: Implement `RejectionReflectionStrip.tsx`** — three chip buttons, optional textarea, Skip/Save dynamic button, calls onSubmit({reasons, freeText}) or onSkip(). Inline (no modal). Soft type, no failure framing.

**Step 5: Wire into ApplicationCard** — read pref, check no existing reflection (parent passes `hasReflection: boolean`), render strip below title when status=rejected.

**Step 6: API route** — POST `/api/rejection-reflections` with Zod-validated body, creates row via `createRejectionReflection`.

**Step 7: Settings toggle** — Analytics section with the exact-copy toggle. POST to `/api/profile/preferences` writes `preferences.rejectionReflections.enabled`.

**Step 8: Tests + tsc + lint + commit**

```bash
npm run t start R9.6
git add src/db/migrations/0019_r9_observatory.sql src/db/schema.ts src/lib/db/queries/rejection-reflections-rest.ts src/components/floor-7/rejection/ src/app/api/rejection-reflections/ src/app/api/profile/ src/app/\(authenticated\)/settings/ src/components/floor-7/crud/ApplicationCard.tsx
git commit -m "[R9/9.6] feat(autopsy): opt-in rejection reflection chips + settings toggle (migration 0019)"
npm run t done R9.6
```

**User action note:** migration 0019 must be applied via Supabase SQL Editor (gotcha #1). Add a note to the handoff packet.

---

## Task R9.7 — CFO threshold cron [parallel-safe with R9.1/R9.6/R9.8]

**Files:**
- Create: `src/app/api/cron/cfo-threshold/route.ts`
- Create: `src/app/__tests__/r9-cfo-threshold.proof.test.ts`
- Modify: `vercel.json` — add cron entry

**Step 1: Write proof test (mirror `r8-warmth-decay.proof.test.ts`)**

```ts
describe("R9 — CFO threshold cron", () => {
  it("route exists and is exported", async () => {
    const mod = await import("@/app/api/cron/cfo-threshold/route");
    expect(typeof mod.GET).toBe("function");
  });
  it("uses verifyCronRequest", () => {
    const src = readFileSync("src/app/api/cron/cfo-threshold/route.ts", "utf-8");
    expect(src).toMatch(/verifyCronRequest/);
  });
  it("fires pneumatic_tube channel notification with idempotent source_entity_id", () => {
    const src = readFileSync("src/app/api/cron/cfo-threshold/route.ts", "utf-8");
    expect(src).toMatch(/channels:\s*\[\s*['"]pneumatic_tube['"]\s*\]/);
    expect(src).toMatch(/cfo-threshold-.+w\$\{/);
  });
  it("scheduled in vercel.json", () => {
    const cfg = JSON.parse(readFileSync("vercel.json", "utf-8"));
    const entry = cfg.crons.find((c: { path: string }) => c.path === "/api/cron/cfo-threshold");
    expect(entry).toBeDefined();
  });
});
```

**Step 2: Implement route** — mirror `warmth-decay/route.ts` exactly:
- `verifyCronRequest` guard
- Page through `applications` per user
- For each user with ≥10 apps in last 8 weeks, compute prev-7d vs prev-prev-7d conversion (offers / qualified_leads)
- If delta > 0.05, call `createNotification` with `channels: ['pneumatic_tube']`, `sourceEntityId: 'cfo-threshold-${userId}-w${weekBucket}'`, `sourceAgent: 'cfo'`, deterministic body template
- Return JSON `{ ok, scanned, notified }`

Optional OpenAI augmentation wrapped in try/catch — falls back to template on failure.

**Step 3: Add to vercel.json**

```json
{ "path": "/api/cron/cfo-threshold", "schedule": "0 9 * * 1" }
```

**Step 4: Tests + commit**

```bash
npm run t start R9.7
git add src/app/api/cron/cfo-threshold/ src/app/__tests__/r9-cfo-threshold.proof.test.ts vercel.json
git commit -m "[R9/9.7] feat(cfo): weekly threshold cron via R7 pneumatic tube"
npm run t done R9.7
```

---

## Task R9.8 — State of the Month PDF [parallel-safe with R9.1/R9.6/R9.7]

**Files:**
- Create: `src/lib/pdf/state-of-month-pdf.tsx`
- Create: `src/lib/pdf/state-of-month-pdf.test.ts`
- Create: `src/app/api/reports/state-of-month/route.ts`
- Create: `src/app/api/reports/state-of-month/route.test.ts`

**Step 1: Test mirroring `cover-letter-pdf` test pattern**

```ts
it("renders %PDF- buffer", async () => {
  const { generateStateOfMonthPdf } = await import("./state-of-month-pdf");
  const buf = await generateStateOfMonthPdf({ month: "2026-04", stats: { total: 10, ... }, cfoNote: "..." });
  expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
});
```

**Step 2: Implement `state-of-month-pdf.tsx`** — Document with single Page using @react-pdf/renderer primitives. Sections: header, what happened, what's working, what's not, CFO note. Inline `<Svg>` orrery snapshot using simple circles (matches design §8 — no rasterization needed).

**Step 3: Implement route** — GET `?month=YYYY-MM` returns `application/pdf`. Mirrors `/api/documents/[id]/pdf` shape.

**Step 4: Wire UI button in CFOWhiteboard** — "Download State of the Month" link. Settings option for monthly schedule (defaults OFF — opt-in).

**Step 5: Tests + commit**

```bash
npm run t start R9.8
git add src/lib/pdf/state-of-month-pdf.tsx src/lib/pdf/state-of-month-pdf.test.ts src/app/api/reports/ src/components/floor-2/cfo-character/CFOWhiteboard.tsx
git commit -m "[R9/9.8] feat(report): State of the Month PDF via @react-pdf/renderer"
npm run t done R9.8
```

---

## Task R9.9 — Wire Orrery into ObservatoryClient (depends: R9.4, R9.6)

**Files:**
- Modify: `src/components/floor-2/ObservatoryClient.tsx` — Orrery becomes primary dashboardSlot
- Modify: `src/app/(authenticated)/observatory/page.tsx` — fetch applications + transform to OrreryPlanet[] server-side; pass `mode` from preferences
- Modify: `src/components/floor-2/cfo-character/CFOWhiteboard.tsx` — host the supporting charts in expanded view; show rejection-reflection patterns when N≥3

**Step 1: Test ObservatoryClient anti-pattern compliance**

```tsx
it("Orrery is the primary dashboardSlot, not the chart grid", () => {
  const html = renderToString(<ObservatoryClient stats={...} planets={[...100 fixture]} mode="stage" />);
  // Orrery must come before the chart grid in the DOM
  const orreryIdx = html.indexOf("orrery-scene");
  const funnelIdx = html.indexOf("CONVERSION FUNNEL");
  expect(orreryIdx).toBeGreaterThan(-1);
  expect(orreryIdx).toBeLessThan(funnelIdx);
});
```

**Step 2: Refactor `ObservatoryClient.tsx`**

```tsx
const dashboardSlot = (
  <div style={{ width: "100%", maxWidth: "1100px" }}>
    <PatternModeToggle mode={mode} onChange={setMode} />
    <Orrery planets={planets} mode={mode} />
    {/* Supporting strip */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginTop: "24px" }}>
      <AnalyticsPanel title="CONVERSION FUNNEL"><ConversionFunnel stats={stats} /></AnalyticsPanel>
      <AnalyticsPanel title="PIPELINE VELOCITY"><PipelineVelocity /></AnalyticsPanel>
    </div>
  </div>
);
```

`WeeklyTrend` and `ActivityHeatmap` move into a `<details>` collapsible "More analytics" or into CFOWhiteboard expanded view — user toggles them, they're not shoved at them.

**Step 3: Server-side fetch + transform in `page.tsx`** — uses Supabase REST (gotcha #1).

**Step 4: Tests + tsc + lint + build + commit**

```bash
npm run t start R9.9
git add src/components/floor-2/ src/app/\(authenticated\)/observatory/
git commit -m "[R9/9.9] feat(observatory): Orrery promoted to centerpiece; charts demoted to supporting"
npm run t done R9.9
```

---

## Task R9.10 — Final pass + tower accept (depends: ALL)

**Step 1: Full test suite**

```bash
npx vitest run
```

Expected: ≥1096 baseline tests + new R9 tests, all passing.

**Step 2: tsc + lint + build**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

**Step 3: drift check**

```bash
npm run t verify R9
```

Expected: no missing-evidence items.

**Step 4: tower accept R9**

```bash
npm run t accept R9
```

This structurally enforces verify-before-flip. If any ✗, fix the underlying issue — do NOT pass `--force`.

**Step 5: Commit acceptance ledger**

```bash
git add .ledger/
git commit -m "[R9/9.10] chore(ledger): R9 complete, acceptance.met=true"
git push origin main
```

**Step 6: Final handoff**

Per CLAUDE.md §3, fire `tower handoff --stdin` with the JSON payload summarizing R9 outcomes. Autopilot.yml will auto-advance to R10 (or set scope_complete since `scope: R9-only`).

---

## Dispatch order for subagent-driven-development

**Wave 1 (parallel — 4 fresh subagents):**
- R9.1 (data layer)
- R9.6 (rejection autopsy: schema + UI + API)
- R9.7 (CFO threshold cron)
- R9.8 (State of the Month PDF)

**Wave 2 (sequential, after R9.1):**
- R9.2 (render layer) → R9.3 (consumer + detail panel) → R9.4 (modes + morph)
- R9.5 (perf gate) — runs after R9.2 lands

**Wave 3 (sequential, after Waves 1+2):**
- R9.9 (wire Orrery into ObservatoryClient)
- R9.10 (final pass + tower accept R9)

Total: 10 commits, 1 final acceptance commit.

---

## What good looks like at the end

- Floor 2's centerpiece is a slowly-rotating tilted orrery, not a 2x2 chart grid
- A click on a planet zooms the camera in and reveals that application's history
- One offer in the user's history triggers a supernova that they'll remember
- A user's first rejection prompts a 3-chip strip on the application card; subsequent rejections do too if the toggle is on
- CFO sends a pneumatic-tube note on Monday mornings if conversion fell >5% the prior week
- "Download State of the Month" produces a PDF that reads like a CFO note, not a spreadsheet
- 100-planet fixture renders without DOM blow-up, animation invariants enforced by perf-proof test
- Render layer is the only file touching CSS 3D — R3F upgrade later is a single-file swap
- All 1096+ existing tests still pass; tsc, lint, build all green; `tower accept R9` flips acceptance.met without `--force`
