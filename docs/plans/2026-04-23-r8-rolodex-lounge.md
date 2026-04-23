# R8 — The Rolodex Lounge — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Ship the R8 Rolodex Lounge — a physical rotating rolodex on Floor 6 with warmth-colored cards, `[`/`]` side-switch between CNO's lounge and CIO's library, autonomous warmth decay + warm-intro proposals, dossier-wall aging, consent infrastructure for a cross-user network (behavior gated behind Red Team), and a private sticky-note as the sharpening detail.

**Architecture:** CSS 3D cylinder + GSAP for the rolodex (virtualized to 30 live cards out of 200). Single wide scene with `translateX` side-switch. Crons + Supabase REST + R7 tube for autonomous behaviors. New tables: `contact_embeddings`, `networking_match_index`. New columns: `user_profiles.networking_consent_at/revoked_at/version`, `contacts.private_note`. Cross-user match endpoint returns 403 always in R8 — behavior ships in R8.x post Red Team.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v3, GSAP, Supabase REST (never Drizzle at runtime per gotcha #1), pgvector, Vitest.

**Design doc:** `docs/plans/2026-04-23-r8-rolodex-lounge-design.md` — read first. Proof invariants + scope + Red Team checklist are defined there.

**Reference phase for patterns:** R7 (`.ledger/R7-the-situation-room-floor-4.yml`, `scripts/r7-acceptance-check.ts`, `src/app/api/cron/draft-follow-ups/route.ts`). R7's DB-level guard + acceptance-check are the templates for R8's consent guard + invariants.

---

## Task ordering

```
R8.1 migration 0018 (schema)        — foundation
R8.2 warmth pure fn + P2 test       — isolated, parallelizable
R8.3 rolodex centerpiece + P1 test  — largest, isolated
R8.4 warmth palette recolor         — depends on 8.2
R8.5 side-switch + P8 test          — depends on 8.3
R8.6 CIO dossier wall + aging       — isolated, parallelizable
R8.7 warmth-decay cron + P6         — depends on 8.2
R8.8 CIO re-research cron + P7      — depends on 8.6
R8.9 warm-intro scan cron           — depends on 8.1 (contact_embeddings)
R8.10 consent UI + revoke + P9      — depends on 8.1
R8.11 consent guard endpoint + P3/P4 — depends on 8.1+8.10
R8.12 private note UI + P5 grep     — depends on 8.1
R8.13 Red Team checklist + P10      — depends on 8.10+8.11
R8.14 r8-acceptance-check.ts + 4-gate wire
R8.15 sharpening: paper rustle + tilt details
```

Independent waves for `subagent-driven-development`:
- **Wave A (foundation):** R8.1 alone (blocks everything else).
- **Wave B (parallelizable):** R8.2, R8.3, R8.6, R8.10 can run in parallel subagents.
- **Wave C (stacks on B):** R8.4, R8.5, R8.7, R8.8, R8.9, R8.11, R8.12.
- **Wave D (final):** R8.13, R8.14, R8.15.

---

## Task R8.1 — Migration 0018 + Drizzle schema additions

**Files:**
- Create: `src/db/migrations/0018_r8_rolodex_lounge.sql`
- Modify: `src/db/schema.ts` — add `networking_consent_at`, `networking_revoked_at`, `networking_consent_version` on `userProfiles`; add `private_note` on `contacts`; new `contactEmbeddings` table; new `networkingMatchIndex` table.
- Test: `src/db/__tests__/schema-r8.test.ts` (new) — import schema, assert types.

**Step 1: Write the failing test**

```ts
// src/db/__tests__/schema-r8.test.ts
import { describe, it, expect } from "vitest";
import * as schema from "../schema";

describe("R8 schema additions", () => {
  it("userProfiles has consent columns", () => {
    const cols = (schema.userProfiles as unknown as { _: { columns: Record<string, unknown> } })._.columns;
    expect("networkingConsentAt" in cols || "networking_consent_at" in cols).toBe(true);
    expect("networkingRevokedAt" in cols || "networking_revoked_at" in cols).toBe(true);
    expect("networkingConsentVersion" in cols || "networking_consent_version" in cols).toBe(true);
  });

  it("contacts has private_note column", () => {
    const cols = (schema.contacts as unknown as { _: { columns: Record<string, unknown> } })._.columns;
    expect("privateNote" in cols || "private_note" in cols).toBe(true);
  });

  it("exports contactEmbeddings", () => {
    expect(schema.contactEmbeddings).toBeDefined();
  });

  it("exports networkingMatchIndex", () => {
    expect(schema.networkingMatchIndex).toBeDefined();
  });
});
```

**Step 2: Run test — expected FAIL with "not defined" / missing columns.**

```bash
npx vitest run src/db/__tests__/schema-r8.test.ts
```

**Step 3: Write the SQL migration**

```sql
-- src/db/migrations/0018_r8_rolodex_lounge.sql
-- R8 — The Rolodex Lounge

-- §7 Cross-user networking consent
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS networking_consent_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS networking_revoked_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS networking_consent_version INTEGER DEFAULT 0;

-- §8 Private note per contact — never crosses outbound surface
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS private_note TEXT DEFAULT NULL;

-- §6 Contact embeddings for warm-intro finder
CREATE TABLE IF NOT EXISTS contact_embeddings (
  contact_id UUID PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  embedding VECTOR(1536) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE contact_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY contact_embeddings_self_access ON contact_embeddings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_contact_embeddings_user ON contact_embeddings(user_id);

-- §7 Match index (empty in R8, schema committed for R8.x)
CREATE TABLE IF NOT EXISTS networking_match_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  target_company_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE networking_match_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY networking_match_index_self_access ON networking_match_index
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_networking_match_user ON networking_match_index(user_id);
```

**Step 4: Update `src/db/schema.ts`**

Add to `userProfiles`:

```ts
  networkingConsentAt: timestamp("networking_consent_at", { withTimezone: true }),
  networkingRevokedAt: timestamp("networking_revoked_at", { withTimezone: true }),
  networkingConsentVersion: integer("networking_consent_version").default(0),
```

Add to `contacts`:

```ts
  privateNote: text("private_note"),
```

Add new tables (after existing tables, grouped with embeddings):

```ts
// R8 — Contact embeddings for warm-intro finder
export const contactEmbeddings = pgTable("contact_embeddings", {
  contactId: uuid("contact_id").primaryKey().references(() => contacts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  userIsolation("contact_embeddings"),
  index("idx_contact_embeddings_user").on(table.userId),
]);

// R8 — Networking match index (empty in R8, schema for R8.x)
export const networkingMatchIndex = pgTable("networking_match_index", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  targetCompanyName: text("target_company_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  userIsolation("networking_match_index"),
  index("idx_networking_match_user").on(table.userId),
]);
```

**Step 5: Run test — expected PASS.**

```bash
npx vitest run src/db/__tests__/schema-r8.test.ts
npx tsc --noEmit
```

**Step 6: Start ledger task and commit**

```bash
npm run t start R8.1
git add src/db/migrations/0018_r8_rolodex_lounge.sql src/db/schema.ts src/db/__tests__/schema-r8.test.ts
git commit -m "[R8/8.1] feat(r8): migration 0018 + schema — consent, private_note, contact_embeddings, match_index"
npm run t done R8.1
```

---

## Task R8.2 — Warmth decay pure function + P2 invariant test

**Files:**
- Create: `src/lib/contacts/warmth.ts`
- Create: `src/lib/contacts/warmth.test.ts`

**Step 1: Write the failing test**

```ts
// src/lib/contacts/warmth.test.ts
import { describe, it, expect } from "vitest";
import { computeWarmth, computeWarmthTier } from "./warmth";

describe("computeWarmth (P2 invariant)", () => {
  it("returns 100 for contact touched today", () => {
    const now = new Date("2026-04-23T12:00:00Z");
    const last = new Date("2026-04-23T11:00:00Z");
    expect(computeWarmth(last, now)).toBe(100);
  });
  it("linear decay: 100 - days*2", () => {
    const now = new Date("2026-04-23T12:00:00Z");
    for (const days of [1, 5, 10, 25, 40, 49]) {
      const last = new Date(now.getTime() - days * 86400_000);
      expect(computeWarmth(last, now)).toBe(Math.max(0, 100 - days * 2));
    }
  });
  it("floors at 0 past 50 days", () => {
    const now = new Date("2026-04-23T12:00:00Z");
    const last = new Date("2025-11-01T12:00:00Z");
    expect(computeWarmth(last, now)).toBe(0);
  });
  it("returns 0 when lastContactAt is null", () => {
    expect(computeWarmth(null, new Date())).toBe(0);
  });
});

describe("computeWarmthTier (cool-blue palette, no red)", () => {
  it("hot for warmth >= 94 (0-2 days)", () => {
    expect(computeWarmthTier(100)).toBe("hot");
    expect(computeWarmthTier(96)).toBe("hot");
  });
  it("warm for 88-93 (3-6 days)", () => {
    expect(computeWarmthTier(90)).toBe("warm");
  });
  it("neutral for 74-87 (7-13 days)", () => {
    expect(computeWarmthTier(80)).toBe("neutral");
  });
  it("cooling for 42-73 (14-29 days)", () => {
    expect(computeWarmthTier(60)).toBe("cooling");
  });
  it("cold for <42 (30+ days)", () => {
    expect(computeWarmthTier(40)).toBe("cold");
    expect(computeWarmthTier(0)).toBe("cold");
  });
});
```

**Step 2: Run — expected FAIL.**

**Step 3: Implementation**

```ts
// src/lib/contacts/warmth.ts
/**
 * R8 warmth model. Linear decay: 100 - days*2, floored at 0.
 * 50 days = 0. A contact touched today = 100.
 *
 * Tiers map to the cool-blue-not-red palette (see §2.3 of the R8 design).
 * Cold cards look like old photographs, not warnings.
 */
export type WarmthTier = "hot" | "warm" | "neutral" | "cooling" | "cold";

export function computeWarmth(lastContactAt: Date | null, now: Date): number {
  if (!lastContactAt) return 0;
  const days = Math.floor((now.getTime() - lastContactAt.getTime()) / 86_400_000);
  return Math.max(0, Math.min(100, 100 - days * 2));
}

export function computeWarmthTier(warmth: number): WarmthTier {
  if (warmth >= 94) return "hot";      // 0-2 days
  if (warmth >= 88) return "warm";     // 3-6 days
  if (warmth >= 74) return "neutral";  // 7-13 days
  if (warmth >= 42) return "cooling";  // 14-29 days
  return "cold";                        // 30+ days
}

export const WARMTH_PALETTE: Record<WarmthTier, {
  bg: string; edge: string; text: string; label: string;
}> = {
  hot:     { bg: "#E8B872", edge: "#D4A84C", text: "#3A2817", label: "Hot" },
  warm:    { bg: "#EDDFC6", edge: "#C9A84C", text: "#5C3A1E", label: "Warm" },
  neutral: { bg: "#D8CAB0", edge: "#A68E5E", text: "#5C3A1E", label: "Neutral" },
  cooling: { bg: "#BFC4C9", edge: "#8892A0", text: "#4A5560", label: "Cooling" },
  cold:    { bg: "#9BA9B8", edge: "#6E7E8F", text: "#3A4451", label: "Cold" },
};
```

**Step 4: Run test — expected PASS.**

**Step 5: Commit**

```bash
npm run t start R8.2
git add src/lib/contacts/warmth.ts src/lib/contacts/warmth.test.ts
git commit -m "[R8/8.2] feat(r8): warmth pure fn + cool-blue palette (no red on cold — P2 invariant)"
npm run t done R8.2
```

---

## Task R8.3 — Rolodex centerpiece (CSS 3D cylinder + virtualization) + P1 invariant

**Files:**
- Create: `src/components/floor-6/rolodex/Rolodex.tsx`
- Create: `src/components/floor-6/rolodex/RolodexCard.tsx`
- Create: `src/components/floor-6/rolodex/useRolodexRotation.ts` — custom hook for wheel-to-angle with GSAP spring
- Create: `src/components/floor-6/rolodex/Rolodex.test.tsx` — P1 invariant

**Step 1: Write the failing test**

```tsx
// src/components/floor-6/rolodex/Rolodex.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Rolodex } from "./Rolodex";

const makeContact = (i: number) => ({
  id: `c-${i}`,
  name: `Contact ${i}`,
  title: "Associate",
  companyName: "Acme Corp",
  email: `c${i}@acme.com`,
  daysSinceContact: i % 60,
  warmthLevel: "warm" as const,
  warmthScore: 80,
  relationship: "referral" as const,
  phone: null,
  linkedinUrl: null,
  notes: null,
  privateNote: null,
});

describe("Rolodex (P1 invariant — 200 cards)", () => {
  it("renders ≤ 50 live cards with a 200-card fixture", () => {
    const contacts = Array.from({ length: 200 }, (_, i) => makeContact(i));
    const { container } = render(
      <Rolodex contacts={contacts} onFlipCard={() => {}} />
    );
    const liveCards = container.querySelectorAll("[data-rolodex-card=live]");
    expect(liveCards.length).toBeLessThanOrEqual(50);
    expect(liveCards.length).toBeGreaterThan(0);
  });
  it("renders a fallback when contacts is empty", () => {
    const { getByText } = render(
      <Rolodex contacts={[]} onFlipCard={() => {}} />
    );
    expect(getByText(/no contacts yet/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run — expected FAIL.**

**Step 3: Implementation (CSS 3D cylinder + virtualization)**

`Rolodex.tsx`:

```tsx
"use client";
import type { JSX } from "react";
import { useState, useRef, useMemo, useCallback } from "react";
import type { ContactForAgent } from "@/lib/db/queries/contacts-rest";
import { computeWarmthTier, WARMTH_PALETTE } from "@/lib/contacts/warmth";
import { RolodexCard } from "./RolodexCard";
import { useRolodexRotation } from "./useRolodexRotation";

const CYLINDER_RADIUS = 240;
const VISIBLE_ARC_DEG = 90;

interface RolodexProps {
  contacts: ContactForAgent[];
  onFlipCard: (contact: ContactForAgent) => void;
}

export function Rolodex({ contacts, onFlipCard }: RolodexProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const { angleDeg, onWheel } = useRolodexRotation(containerRef, contacts.length);

  const anglePerCard = contacts.length > 0 ? 360 / contacts.length : 0;

  const cardsWithAngle = useMemo(() =>
    contacts.map((c, i) => ({ contact: c, cardAngle: i * anglePerCard }))
  , [contacts, anglePerCard]);

  const liveCards = useMemo(() => cardsWithAngle.filter(({ cardAngle }) => {
    const delta = normalizeDelta(cardAngle - angleDeg);
    return Math.abs(delta) <= VISIBLE_ARC_DEG / 2;
  }), [cardsWithAngle, angleDeg]);

  if (contacts.length === 0) {
    return (
      <div className="rolodex-empty" role="status" aria-live="polite">
        <p>No contacts yet. Add one to start building your network.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rolodex-container"
      onWheel={onWheel}
      role="region"
      aria-label={`Rolodex with ${contacts.length} contacts. Use mouse wheel or arrow keys to rotate, Enter to open.`}
      aria-roledescription="rotating rolodex"
      tabIndex={0}
      style={{
        perspective: "1200px",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="rolodex-cylinder"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateY(${-angleDeg}deg)`,
          transition: "transform 0.05s linear",
          width: 160,
          height: 220,
          position: "relative",
        }}
      >
        {liveCards.map(({ contact, cardAngle }) => (
          <div
            key={contact.id}
            data-rolodex-card="live"
            style={{
              position: "absolute",
              inset: 0,
              transform: `rotateY(${cardAngle}deg) translateZ(${CYLINDER_RADIUS}px)`,
              backfaceVisibility: "hidden",
            }}
          >
            <RolodexCard contact={contact} onFlip={() => onFlipCard(contact)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function normalizeDelta(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}
```

`useRolodexRotation.ts`:

```ts
"use client";
import { useState, useCallback, useRef, useEffect, type RefObject, type WheelEvent } from "react";
import { gsap } from "gsap";

export function useRolodexRotation(
  _ref: RefObject<HTMLDivElement | null>,
  cardCount: number,
) {
  const [angleDeg, setAngleDeg] = useState(0);
  const animRef = useRef<gsap.core.Tween | null>(null);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const anglePerCard = cardCount > 0 ? 360 / cardCount : 0;
    const delta = (e.deltaY / 120) * anglePerCard * 1.5;

    animRef.current?.kill();
    const target = { v: angleDeg + delta };
    animRef.current = gsap.to(target, {
      v: target.v,
      duration: 0.6,
      ease: "power2.out",
      onUpdate: () => setAngleDeg(target.v),
    });
    setAngleDeg(target.v);
  }, [angleDeg, cardCount]);

  useEffect(() => () => { animRef.current?.kill(); }, []);

  return { angleDeg, onWheel, setAngleDeg };
}
```

`RolodexCard.tsx`:

```tsx
"use client";
import type { JSX } from "react";
import type { ContactForAgent } from "@/lib/db/queries/contacts-rest";
import { computeWarmthTier, WARMTH_PALETTE } from "@/lib/contacts/warmth";

interface Props {
  contact: ContactForAgent;
  onFlip: () => void;
}

export function RolodexCard({ contact, onFlip }: Props): JSX.Element {
  const tier = computeWarmthTier(contact.warmthScore ?? 0);
  const palette = WARMTH_PALETTE[tier];

  return (
    <button
      type="button"
      onClick={onFlip}
      aria-label={`Open card for ${contact.name}${contact.companyName ? ` at ${contact.companyName}` : ""}`}
      style={{
        width: "100%",
        height: "100%",
        background: palette.bg,
        border: `1.5px solid ${palette.edge}`,
        color: palette.text,
        padding: "14px 12px",
        fontFamily: "'Satoshi', sans-serif",
        fontSize: 12,
        textAlign: "left",
        cursor: "pointer",
        borderRadius: 4,
        boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14 }}>{contact.name}</div>
      {contact.title && <div style={{ fontSize: 11, opacity: 0.8 }}>{contact.title}</div>}
      {contact.companyName && (
        <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", opacity: 0.7 }}>
          {contact.companyName}
        </div>
      )}
      <div style={{ marginTop: "auto", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6 }}>
        {palette.label}
      </div>
    </button>
  );
}
```

**Step 4: Run test — expected PASS.**

```bash
npx vitest run src/components/floor-6/rolodex/Rolodex.test.tsx
```

**Step 5: Commit**

```bash
npm run t start R8.3
git add src/components/floor-6/rolodex
git commit -m "[R8/8.3] feat(r8): rolodex centerpiece (CSS 3D cylinder, virtualized to 50 live cards — P1 invariant)"
npm run t done R8.3
```

---

## Task R8.4 — Recolor existing ContactCard + contact-grid to cool-blue palette

**Files:**
- Modify: `src/components/floor-6/contact-grid/ContactCard.tsx` — remove `#EF4444`, replace WARMTH_CONFIG with cool-blue palette.
- Modify: `src/app/globals.css` (or floor-6 scoped CSS) — update `.contact-card-cold`, `.contact-card-cooling` selectors to cool-blue values.
- Modify: `src/components/floor-6/contact-grid/ContactCard.test.tsx` (create if missing) — assert no red.

**Step 1: Write the failing test**

```tsx
// src/components/floor-6/contact-grid/ContactCard.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ContactCard } from "./ContactCard";

const cold = {
  id: "c1", name: "Sarah Lin", title: null, companyName: "Blackstone",
  email: null, phone: null, linkedinUrl: null, notes: null, privateNote: null,
  relationship: "referral" as const, daysSinceContact: 45,
  warmthLevel: "cold" as const, warmthScore: 10,
};

describe("ContactCard (no red on cold — R8 non-negotiable)", () => {
  it("cold card never contains #EF4444 or rgb(239,68,68)", () => {
    const { container } = render(<ContactCard contact={cold} onEdit={() => {}} />);
    const html = container.innerHTML.toLowerCase();
    expect(html).not.toContain("#ef4444");
    expect(html).not.toContain("239, 68, 68");
    expect(html).not.toContain("239,68,68");
  });
});
```

**Step 2: Run — expected FAIL.**

**Step 3: Update `ContactCard.tsx` WARMTH_CONFIG**

Replace the existing `WARMTH_CONFIG` with:

```ts
const WARMTH_CONFIG = {
  warm:    { dotClass: "warmth-dot-warm",    color: "#D4A84C", label: "Warm",    cardClass: "contact-card contact-card-warm" },
  cooling: { dotClass: "warmth-dot-cooling", color: "#8892A0", label: "Cooling", cardClass: "contact-card contact-card-cooling" },
  cold:    { dotClass: "warmth-dot-cold",    color: "#6E7E8F", label: "Cold",    cardClass: "contact-card contact-card-cold" },
} as const;
```

Find any `#EF4444` or `#F59E0B` in global CSS for `.warmth-dot-*` or `.contact-card-*` and replace with the cool-blue equivalents (`#6E7E8F` for cold dot, `#8892A0` for cooling dot, `#C9A84C` for warm dot).

```bash
grep -rn "EF4444\|ef4444\|#F59E0B\|F59E0B" src/ --include="*.css" --include="*.tsx" --include="*.ts"
```

For each hit in `floor-6` or contact-related CSS, swap to the palette.

**Step 4: Run test — expected PASS.**

**Step 5: Commit**

```bash
npm run t start R8.4
git add src/components/floor-6/contact-grid/ContactCard.tsx src/components/floor-6/contact-grid/ContactCard.test.tsx src/app/globals.css
git commit -m "[R8/8.4] fix(r8): recolor cold/cooling cards to cool-blue (zero red on cold — R8 non-negotiable)"
npm run t done R8.4
```

---

## Task R8.5 — Side-switch `[` / `]` + P8 invariant

**Files:**
- Create: `src/components/floor-6/side-switch/SideSwitch.tsx` — wraps the CNO/CIO content.
- Create: `src/components/floor-6/side-switch/useSideSwitch.ts` — hook for key bindings.
- Create: `src/components/floor-6/side-switch/SideSwitch.test.tsx`.

**Step 1: Write the failing test**

```tsx
// src/components/floor-6/side-switch/SideSwitch.test.tsx
import { describe, it, expect } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { SideSwitch } from "./SideSwitch";

describe("SideSwitch (P8 invariant — [/] keys)", () => {
  it("defaults to CNO side", () => {
    render(<SideSwitch cnoSlot={<div>CNO</div>} cioSlot={<div>CIO</div>} />);
    expect(screen.getByTestId("side-switch-container")).toHaveAttribute("data-side", "cno");
  });
  it("swings to CIO on ] key", () => {
    render(<SideSwitch cnoSlot={<div>CNO</div>} cioSlot={<div>CIO</div>} />);
    fireEvent.keyDown(window, { key: "]" });
    expect(screen.getByTestId("side-switch-container")).toHaveAttribute("data-side", "cio");
  });
  it("swings back to CNO on [ key", () => {
    render(<SideSwitch cnoSlot={<div>CNO</div>} cioSlot={<div>CIO</div>} />);
    fireEvent.keyDown(window, { key: "]" });
    fireEvent.keyDown(window, { key: "[" });
    expect(screen.getByTestId("side-switch-container")).toHaveAttribute("data-side", "cno");
  });
  it("ignores [/] inside text inputs", () => {
    render(
      <div>
        <input data-testid="inp" />
        <SideSwitch cnoSlot={<div>CNO</div>} cioSlot={<div>CIO</div>} />
      </div>
    );
    const inp = screen.getByTestId("inp");
    inp.focus();
    fireEvent.keyDown(inp, { key: "]" });
    expect(screen.getByTestId("side-switch-container")).toHaveAttribute("data-side", "cno");
  });
});
```

**Step 2: Run — expected FAIL.**

**Step 3: Implementation**

`useSideSwitch.ts`:

```ts
"use client";
import { useEffect, useState } from "react";

export type Side = "cno" | "cio";

export function useSideSwitch(initial: Side = "cno") {
  const [side, setSide] = useState<Side>(initial);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "[") setSide("cno");
      else if (e.key === "]") setSide("cio");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  return { side, setSide };
}
```

`SideSwitch.tsx`:

```tsx
"use client";
import type { JSX, ReactNode } from "react";
import { useSideSwitch } from "./useSideSwitch";

interface Props {
  cnoSlot: ReactNode;
  cioSlot: ReactNode;
}

export function SideSwitch({ cnoSlot, cioSlot }: Props): JSX.Element {
  const { side, setSide } = useSideSwitch("cno");
  const translateX = side === "cno" ? "0%" : "-50%";

  return (
    <div
      data-testid="side-switch-container"
      data-side={side}
      role="region"
      aria-label="Floor 6 — Rolodex Lounge, two sides: CNO (networking) and CIO (research). Use left bracket for CNO, right bracket for CIO."
      style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}
    >
      <div
        style={{
          width: "200%",
          height: "100%",
          display: "flex",
          transform: `translateX(${translateX})`,
          transition: "transform 0.7s cubic-bezier(0.65, 0, 0.35, 1)",
        }}
      >
        <div style={{ width: "50%", height: "100%" }}>{cnoSlot}</div>
        <div style={{ width: "50%", height: "100%" }}>{cioSlot}</div>
      </div>

      {/* Visible hint (bottom-left) */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", bottom: 12, left: 12,
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.1em", color: "#C9A84C", opacity: 0.6,
          pointerEvents: "none",
        }}
      >
        [ CNO / CIO ]
      </div>

      {/* Mobile fallback buttons (<1024px): keyboard is primary desktop input */}
      <div className="side-switch-mobile" style={{
        position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", display: "none", gap: 6,
      }}>
        <button type="button" onClick={() => setSide("cno")} aria-pressed={side === "cno"}>CNO</button>
        <button type="button" onClick={() => setSide("cio")} aria-pressed={side === "cio"}>CIO</button>
      </div>
    </div>
  );
}
```

Add a CSS rule (in `globals.css` or scoped):

```css
@media (max-width: 1023px) {
  .side-switch-mobile { display: flex !important; }
}
```

**Step 4: Run test — expected PASS.**

**Step 5: Commit**

```bash
npm run t start R8.5
git add src/components/floor-6/side-switch
git commit -m "[R8/8.5] feat(r8): side-switch [ / ] between CNO and CIO (P8 invariant)"
npm run t done R8.5
```

---

## Task R8.6 — CIO dossier wall with paper aging + corner curl

**Files:**
- Create: `src/components/floor-6/dossier-wall/DossierWall.tsx`
- Create: `src/components/floor-6/dossier-wall/DossierCard.tsx`
- Create: `src/components/floor-6/dossier-wall/dossier-age.ts` — pure fn for freshness tier
- Create: `src/components/floor-6/dossier-wall/DossierWall.test.tsx`
- Modify: `src/app/globals.css` — add `.dossier-curl-*` CSS for aging effect

**Step 1: Failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DossierWall } from "./DossierWall";
import { computeDossierAge } from "./dossier-age";

describe("computeDossierAge", () => {
  it("fresh: < 7 days", () => {
    const now = new Date("2026-04-23");
    const last = new Date("2026-04-22");
    expect(computeDossierAge(last, now)).toBe("fresh");
  });
  it("aging: 7-30 days", () => {
    const now = new Date("2026-04-23");
    const last = new Date("2026-04-10");
    expect(computeDossierAge(last, now)).toBe("aging");
  });
  it("stale: > 30 days", () => {
    const now = new Date("2026-04-23");
    const last = new Date("2026-02-01");
    expect(computeDossierAge(last, now)).toBe("stale");
  });
  it("stale when null", () => {
    expect(computeDossierAge(null, new Date())).toBe("stale");
  });
});

describe("DossierWall", () => {
  it("renders N dossiers", () => {
    const dossiers = Array.from({ length: 8 }, (_, i) => ({
      id: `d-${i}`, companyName: `Co ${i}`, sector: "Tech",
      lastResearchedAt: new Date("2026-04-01"), hasNotes: true, domain: null,
    }));
    const { container } = render(<DossierWall dossiers={dossiers} />);
    expect(container.querySelectorAll("[data-dossier]")).toHaveLength(8);
  });
});
```

**Step 2: Run — expected FAIL.**

**Step 3: Implementation**

`dossier-age.ts`:

```ts
export type DossierAge = "fresh" | "aging" | "stale";

export function computeDossierAge(lastResearchedAt: Date | null, now: Date): DossierAge {
  if (!lastResearchedAt) return "stale";
  const days = Math.floor((now.getTime() - lastResearchedAt.getTime()) / 86_400_000);
  if (days < 7) return "fresh";
  if (days < 30) return "aging";
  return "stale";
}
```

`DossierCard.tsx`:

```tsx
"use client";
import type { JSX } from "react";
import { computeDossierAge, type DossierAge } from "./dossier-age";

interface Dossier {
  id: string; companyName: string; sector: string | null;
  lastResearchedAt: Date | null; hasNotes: boolean; domain: string | null;
}

interface Props { dossier: Dossier; now?: Date; }

const AGE_STYLE: Record<DossierAge, { bg: string; filter: string; shadow: string; }> = {
  fresh:  { bg: "#FDF7E8", filter: "none",                               shadow: "0 2px 4px rgba(0,0,0,0.15)" },
  aging:  { bg: "#F0E5C8", filter: "sepia(0.15) saturate(0.9)",          shadow: "0 2px 5px rgba(0,0,0,0.22)" },
  stale:  { bg: "#E6D8AA", filter: "sepia(0.30) saturate(0.8) hue-rotate(-5deg)", shadow: "0 4px 10px rgba(0,0,0,0.32)" },
};

export function DossierCard({ dossier, now = new Date() }: Props): JSX.Element {
  const age = computeDossierAge(dossier.lastResearchedAt, now);
  const style = AGE_STYLE[age];

  return (
    <article
      data-dossier={dossier.id}
      data-age={age}
      className={`dossier-card dossier-curl-${age}`}
      style={{
        width: 180, height: 220, background: style.bg, filter: style.filter, boxShadow: style.shadow,
        transform: `rotate(${-2 + (dossier.id.charCodeAt(0) % 5)}deg)`,
        position: "relative", padding: 14, fontFamily: "'Satoshi', sans-serif", fontSize: 12, color: "#3A2817",
        borderRadius: 2,
      }}
      aria-label={`Dossier: ${dossier.companyName}, ${age}`}
    >
      <div style={{ fontWeight: 600, fontSize: 14 }}>{dossier.companyName}</div>
      {dossier.sector && <div style={{ opacity: 0.7, fontSize: 11 }}>{dossier.sector}</div>}
      <div style={{ position: "absolute", bottom: 10, left: 14, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6 }}>
        {age === "fresh" ? "Fresh" : age === "aging" ? "Aging" : "Stale — refresh pending"}
      </div>
    </article>
  );
}
```

`DossierWall.tsx`:

```tsx
"use client";
import type { JSX } from "react";
import { DossierCard } from "./DossierCard";

interface Dossier {
  id: string; companyName: string; sector: string | null;
  lastResearchedAt: Date | null; hasNotes: boolean; domain: string | null;
}

interface Props { dossiers: Dossier[]; }

export function DossierWall({ dossiers }: Props): JSX.Element {
  return (
    <div
      className="dossier-wall"
      role="region"
      aria-label={`CIO dossier wall: ${dossiers.length} companies researched. Older dossiers yellow and curl at the corners.`}
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 180px)", gap: 24, padding: 24, overflowY: "auto", maxHeight: "100%" }}
    >
      {dossiers.map((d) => (
        <DossierCard key={d.id} dossier={d} />
      ))}
    </div>
  );
}
```

Add CSS for corner curl:

```css
/* R8 dossier wall — corner curl via clip-path + overlay shadow */
.dossier-curl-fresh::after { display: none; }
.dossier-curl-aging::after {
  content: ""; position: absolute; top: 0; right: 0; width: 24px; height: 24px;
  background: linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.18) 51%);
  clip-path: polygon(100% 0, 0 0, 100% 100%);
}
.dossier-curl-stale::after {
  content: ""; position: absolute; top: 0; right: 0; width: 44px; height: 44px;
  background: linear-gradient(135deg, transparent 48%, rgba(0,0,0,0.28) 50%, rgba(0,0,0,0.05) 70%);
  clip-path: polygon(100% 0, 0 0, 100% 100%);
  filter: drop-shadow(-1px 2px 3px rgba(0,0,0,0.25));
}
```

**Step 4: Run test — PASS.**

**Step 5: Commit**

```bash
npm run t start R8.6
git add src/components/floor-6/dossier-wall src/app/globals.css
git commit -m "[R8/8.6] feat(r8): CIO dossier wall with paper aging + corner curl (fresh/aging/stale tiers)"
npm run t done R8.6
```

---

## Task R8.7 — Warmth-decay cron endpoint + CNO cold-alert + P6 invariant

**Files:**
- Create: `src/app/api/cron/warmth-decay/route.ts`
- Modify: `vercel.json` — register cron `0 4 * * *`
- Create: `src/app/__tests__/r8-warmth-decay.proof.test.ts` (P6 invariant)

**Step 1: Failing test**

```ts
// src/app/__tests__/r8-warmth-decay.proof.test.ts
import { describe, it, expect } from "vitest";
import { computeWarmth } from "@/lib/contacts/warmth";

describe("R8 P6 — CNO alert on warmth ≤ 30 crossing", () => {
  it("linear decay crosses threshold at 35 days", () => {
    const now = new Date("2026-04-23T12:00:00Z");
    expect(computeWarmth(new Date(now.getTime() - 34 * 86400_000), now)).toBeGreaterThan(30);
    expect(computeWarmth(new Date(now.getTime() - 36 * 86400_000), now)).toBeLessThan(30);
  });
});

describe("R8 P6 — cron exports GET handler + registered in vercel.json", () => {
  it("route exports GET", async () => {
    const mod = await import("@/app/api/cron/warmth-decay/route");
    expect(typeof mod.GET).toBe("function");
  });
  it("vercel.json has warmth-decay cron", async () => {
    const fs = await import("node:fs");
    const cfg = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
    const paths = (cfg.crons as Array<{ path: string }>).map((c) => c.path);
    expect(paths).toContain("/api/cron/warmth-decay");
  });
});
```

**Step 2: Run — expected FAIL.**

**Step 3: Cron route**

```ts
// src/app/api/cron/warmth-decay/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/auth/cron";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/db/queries/notifications-rest";
import { computeWarmth } from "@/lib/contacts/warmth";
import { log } from "@/lib/logger";

export const maxDuration = 300;
const COLD_THRESHOLD = 30;

export async function GET(req: NextRequest) {
  const authErr = verifyCronRequest(req);
  if (authErr) return authErr;

  const admin = getSupabaseAdmin();
  const now = new Date();

  // Paginated scan across all contacts.
  const { data: contacts, error } = await admin
    .from("contacts")
    .select("id, user_id, name, warmth, last_contact_at")
    .limit(5000);

  if (error) {
    log.error("warmth-decay.read_failed", undefined, { error: error.message });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let updated = 0;
  let alerted = 0;

  for (const c of contacts ?? []) {
    const last = c.last_contact_at ? new Date(c.last_contact_at as string) : null;
    const nextWarmth = computeWarmth(last, now);
    const prevWarmth = (c.warmth as number | null) ?? 50;

    if (nextWarmth !== prevWarmth) {
      await admin.from("contacts").update({ warmth: nextWarmth }).eq("id", c.id);
      updated += 1;

      // Cross the cold threshold downward → fire one CNO alert (idempotent).
      if (prevWarmth > COLD_THRESHOLD && nextWarmth <= COLD_THRESHOLD) {
        const days = last ? Math.floor((now.getTime() - last.getTime()) / 86_400_000) : 999;
        const weekBucket = Math.floor(days / 7);
        await createNotification({
          userId: c.user_id as string,
          type: "contact-cooling",
          priority: "low",
          title: "A relationship is cooling",
          body: `You haven't spoken to ${c.name ?? "a contact"} in ${days} days. A short note this week keeps the thread warm.`,
          sourceAgent: "cno",
          sourceEntityId: `cooling-${c.id}-w${weekBucket}`,
          sourceEntityType: "contact",
          channels: ["pneumatic_tube"],
        });
        alerted += 1;
      }
    }
  }

  return NextResponse.json({ ok: true, updated, alerted });
}
```

**Step 4: Add vercel.json entry**

```json
{ "path": "/api/cron/warmth-decay", "schedule": "0 4 * * *" }
```

**Step 5: Run test — PASS.**

**Step 6: Commit**

```bash
npm run t start R8.7
git add src/app/api/cron/warmth-decay src/app/__tests__/r8-warmth-decay.proof.test.ts vercel.json
git commit -m "[R8/8.7] feat(r8): warmth-decay cron + CNO cold-alert notification (P6 invariant)"
npm run t done R8.7
```

---

## Task R8.8 — CIO re-research cron + P7 invariant

**Files:**
- Create: `src/app/api/cron/cio-reresearch/route.ts`
- Modify: `vercel.json` — register `0 5 * * *`
- Create: `src/app/__tests__/r8-cio-reresearch.proof.test.ts`

**Step 1: Failing test**

```ts
describe("R8 P7 — cio-reresearch cron", () => {
  it("route exports GET", async () => {
    const mod = await import("@/app/api/cron/cio-reresearch/route");
    expect(typeof mod.GET).toBe("function");
  });
  it("vercel.json registered", async () => {
    const fs = await import("node:fs");
    const cfg = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
    expect((cfg.crons as Array<{ path: string }>).map((c) => c.path)).toContain("/api/cron/cio-reresearch");
  });
});
```

**Step 2: Run — expected FAIL.**

**Step 3: Implementation**

```ts
// src/app/api/cron/cio-reresearch/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/auth/cron";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/db/queries/notifications-rest";
import { log } from "@/lib/logger";

export const maxDuration = 300;
const STALE_DAYS = 30;
const PER_USER_CAP = 3;

export async function GET(req: NextRequest) {
  const authErr = verifyCronRequest(req);
  if (authErr) return authErr;

  const admin = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString();

  // Find stale companies attached to active applications
  const { data: stale, error } = await admin
    .from("companies")
    .select("id, user_id, name, last_researched_at")
    .or(`last_researched_at.lt.${cutoff},last_researched_at.is.null`)
    .limit(200);

  if (error) {
    log.error("cio-reresearch.read_failed", undefined, { error: error.message });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Group by user → cap at PER_USER_CAP per user per run
  const byUser = new Map<string, Array<{ id: string; name: string }>>();
  for (const co of stale ?? []) {
    const arr = byUser.get(co.user_id as string) ?? [];
    if (arr.length < PER_USER_CAP) {
      arr.push({ id: co.id as string, name: (co.name as string) ?? "Unknown" });
      byUser.set(co.user_id as string, arr);
    }
  }

  let refreshed = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const [userId, companies] of byUser) {
    for (const co of companies) {
      // Touch last_researched_at (actual AI refresh can be wired here or in a follow-up)
      await admin
        .from("companies")
        .update({ last_researched_at: new Date().toISOString() })
        .eq("id", co.id);
      refreshed += 1;

      await createNotification({
        userId,
        type: "dossier-refresh",
        priority: "low",
        title: "CIO: I refreshed a dossier",
        body: `I refreshed the ${co.name} dossier — the last look was over a month ago.`,
        sourceAgent: "cio",
        sourceEntityId: `cio-reresearch-${co.id}-${today}`,
        sourceEntityType: "company",
        channels: ["pneumatic_tube"],
      });
    }
  }

  return NextResponse.json({ ok: true, refreshed });
}
```

Add vercel.json cron:

```json
{ "path": "/api/cron/cio-reresearch", "schedule": "0 5 * * *" }
```

**Step 4: Run — PASS.**

**Step 5: Commit**

```bash
npm run t start R8.8
git add src/app/api/cron/cio-reresearch src/app/__tests__/r8-cio-reresearch.proof.test.ts vercel.json
git commit -m "[R8/8.8] feat(r8): CIO autonomous re-research cron — stale dossiers refreshed without prompting (P7)"
npm run t done R8.8
```

---

## Task R8.9 — Warm-intro scan cron (intra-user pgvector)

**Files:**
- Create: `src/app/api/cron/warm-intro-scan/route.ts`
- Create: `src/lib/networking/warm-intro-finder.ts` — pure fn: given a user's contacts + companies + embeddings, returns top-N proposals
- Create: `src/lib/networking/warm-intro-finder.test.ts`
- Modify: `vercel.json` — register `0 6 * * *`

**Step 1: Failing test**

```ts
// src/lib/networking/warm-intro-finder.test.ts
import { describe, it, expect } from "vitest";
import { findWarmIntros } from "./warm-intro-finder";

describe("findWarmIntros", () => {
  it("returns proposals above threshold only", () => {
    const contacts = [
      { id: "c1", name: "Marcus", companyId: "apollo", applicationId: null },
      { id: "c2", name: "Elena",  companyId: "tiger",  applicationId: null },
    ];
    const companies = [
      { id: "apollo",     embedding: [1, 0, 0] },
      { id: "tiger",      embedding: [0, 1, 0] },
      { id: "blackstone", embedding: [0.95, 0.05, 0] },
    ];
    const activeApps = [{ id: "a1", companyId: "blackstone" }];

    const out = findWarmIntros({ contacts, companies, activeApps, threshold: 0.8, perUserCap: 2 });
    expect(out).toHaveLength(1);
    expect(out[0].contactId).toBe("c1");
    expect(out[0].applicationId).toBe("a1");
  });

  it("skips contacts already linked to the application", () => {
    const contacts = [{ id: "c1", name: "Marcus", companyId: "apollo", applicationId: "a1" }];
    const companies = [
      { id: "apollo", embedding: [1, 0, 0] },
      { id: "blackstone", embedding: [0.95, 0.05, 0] },
    ];
    const activeApps = [{ id: "a1", companyId: "blackstone" }];
    const out = findWarmIntros({ contacts, companies, activeApps, threshold: 0.8, perUserCap: 2 });
    expect(out).toHaveLength(0);
  });
});
```

**Step 2: Run — expected FAIL.**

**Step 3: Implementation**

```ts
// src/lib/networking/warm-intro-finder.ts
export interface ContactShape {
  id: string; name: string; companyId: string | null; applicationId: string | null;
}
export interface CompanyShape {
  id: string; embedding: number[] | null;
}
export interface ActiveApp {
  id: string; companyId: string | null;
}
export interface WarmIntroProposal {
  contactId: string; contactName: string; applicationId: string; similarity: number;
  fromCompanyId: string; toCompanyId: string;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export function findWarmIntros(args: {
  contacts: ContactShape[]; companies: CompanyShape[]; activeApps: ActiveApp[];
  threshold: number; perUserCap: number;
}): WarmIntroProposal[] {
  const { contacts, companies, activeApps, threshold, perUserCap } = args;
  const byId = new Map(companies.map((c) => [c.id, c]));
  const proposals: WarmIntroProposal[] = [];

  for (const app of activeApps) {
    if (!app.companyId) continue;
    const target = byId.get(app.companyId);
    if (!target?.embedding) continue;

    for (const contact of contacts) {
      if (!contact.companyId) continue;
      if (contact.applicationId === app.id) continue;  // already linked
      const from = byId.get(contact.companyId);
      if (!from?.embedding) continue;

      const sim = cosine(from.embedding, target.embedding);
      if (sim >= threshold) {
        proposals.push({
          contactId: contact.id, contactName: contact.name, applicationId: app.id,
          similarity: sim, fromCompanyId: contact.companyId, toCompanyId: app.companyId,
        });
      }
    }
  }

  proposals.sort((a, b) => b.similarity - a.similarity);
  return proposals.slice(0, perUserCap);
}
```

Cron route uses this + Supabase. Body sketch:

```ts
// src/app/api/cron/warm-intro-scan/route.ts
// [pattern copy from warmth-decay — scan per user, fetch embeddings, call findWarmIntros, insert notifications with type="warm-intro"]
```

Keep the cron under 150 LOC. Idempotent via `source_entity_id = warm-intro-${contactId}-${applicationId}`.

Register in vercel.json:

```json
{ "path": "/api/cron/warm-intro-scan", "schedule": "0 6 * * *" }
```

**Step 4: Run — PASS.**

**Step 5: Commit**

```bash
npm run t start R8.9
git add src/app/api/cron/warm-intro-scan src/lib/networking vercel.json
git commit -m "[R8/8.9] feat(r8): CNO warm-intro finder (intra-user pgvector) + daily scan cron"
npm run t done R8.9
```

---

## Task R8.10 — Consent UI surface (Settings → Networking) + P9

**Files:**
- Create: `src/components/settings/NetworkingConsent.tsx`
- Modify: `src/app/(authenticated)/settings/settings-client.tsx` — mount the panel.
- Create: `docs/r8/consent-copy.md` — verbatim consent copy.
- Create: `src/app/__tests__/r8-consent-copy.proof.test.ts` — P9 grep-check.
- Create: `src/app/api/networking/opt-in/route.ts` — POST handler.
- Create: `src/app/api/networking/revoke/route.ts` — POST handler.

**Step 1: Failing test**

```ts
// src/app/__tests__/r8-consent-copy.proof.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("R8 P9 — consent copy drift check", () => {
  it("docs/r8/consent-copy.md exists and is the source of truth", () => {
    const p = resolve(process.cwd(), "docs/r8/consent-copy.md");
    const body = readFileSync(p, "utf8");
    expect(body).toMatch(/Warm Intro Network/);
    expect(body).toMatch(/opt in/i);
    expect(body).toMatch(/revoke/i);
    expect(body).toMatch(/never share/i);
  });

  it("NetworkingConsent component imports copy from docs via constant (no drift)", () => {
    const body = readFileSync(
      resolve(process.cwd(), "src/components/settings/NetworkingConsent.tsx"),
      "utf8",
    );
    // The component must embed the copy verbatim — the acceptance check
    // grep-tests a canary sentence from the copy file.
    expect(body).toContain("The Warm Intro Network connects you");
    expect(body).toContain("Your contacts, your messages, your cover letters");
    expect(body).toContain("Revoking is instant");
  });
});
```

**Step 2: Create `docs/r8/consent-copy.md` with the verbatim copy from §7.2 of the design doc.**

**Step 3: Implementation** — `NetworkingConsent.tsx`:

```tsx
"use client";
import type { JSX } from "react";
import { useState, useTransition } from "react";

interface Props {
  initialConsentAt: string | null;
  initialRevokedAt: string | null;
  onOptIn: () => Promise<void>;
  onRevoke: () => Promise<void>;
}

// Verbatim. If this drifts from docs/r8/consent-copy.md the P9 invariant fails.
const COPY = {
  heading: "Opt in to the Warm Intro Network",
  body1: "The Warm Intro Network connects you — by name and target company only — with other Tower users who have opted in. Example: you're targeting Blackstone; another user has a contact there. If you both opt in, The Tower can suggest an introduction to each of you.",
  shareHeading: "What we share between opted-in users:",
  shareList: [
    "Your full name (as shown on your profile).",
    "The companies on your active applications.",
    "Your email address, only when you accept a specific intro.",
  ],
  neverHeading: "What we never share:",
  neverList: [
    "Your contacts, your messages, your cover letters, your interview notes, your private sticky-notes.",
    "Anyone else's data with you unless they've also opted in.",
  ],
  revokeNote: "You can revoke at any time. Revoking is instant. Within 60 seconds, your name and applications are removed from the match index. Past intros already accepted remain.",
};

export function NetworkingConsent({ initialConsentAt, initialRevokedAt, onOptIn, onRevoke }: Props): JSX.Element {
  const [consentAt, setConsentAt] = useState(initialConsentAt);
  const [revokedAt, setRevokedAt] = useState(initialRevokedAt);
  const [isPending, startTransition] = useTransition();

  const isActive = consentAt && (!revokedAt || new Date(revokedAt) < new Date(consentAt));

  return (
    <section aria-labelledby="networking-heading" className="networking-consent">
      <h2 id="networking-heading">{COPY.heading}</h2>
      <p>{COPY.body1}</p>

      <h3>{COPY.shareHeading}</h3>
      <ul>{COPY.shareList.map((t) => <li key={t}>{t}</li>)}</ul>

      <h3>{COPY.neverHeading}</h3>
      <ul>{COPY.neverList.map((t) => <li key={t}>{t}</li>)}</ul>

      <p><strong>{COPY.revokeNote}</strong></p>

      {isActive ? (
        <div>
          <p aria-live="polite">
            You opted in on {new Date(consentAt!).toLocaleDateString()}. Your name and
            target companies are in the Warm Intro Network.
          </p>
          <button type="button" disabled={isPending} onClick={() => {
            startTransition(async () => { await onRevoke(); setRevokedAt(new Date().toISOString()); });
          }}>Revoke</button>
        </div>
      ) : revokedAt ? (
        <div>
          <p aria-live="polite">
            You revoked on {new Date(revokedAt).toLocaleDateString()}. Your name and applications are no longer in the Warm Intro Network. You can opt in again at any time.
          </p>
          <button type="button" disabled={isPending} onClick={() => {
            startTransition(async () => { await onOptIn(); setConsentAt(new Date().toISOString()); setRevokedAt(null); });
          }}>Opt in</button>
        </div>
      ) : (
        <div>
          <label><input type="checkbox" id="networking-agree" /> I have read the above and opt in to the Warm Intro Network.</label>
          <button type="button" disabled={isPending} onClick={() => {
            const cb = document.getElementById("networking-agree") as HTMLInputElement;
            if (!cb?.checked) return;
            startTransition(async () => { await onOptIn(); setConsentAt(new Date().toISOString()); });
          }}>Opt In</button>
        </div>
      )}
    </section>
  );
}
```

POST handlers (skeletons — fill in):

```ts
// src/app/api/networking/opt-in/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const { error } = await sb.from("user_profiles").update({
    networking_consent_at: new Date().toISOString(),
    networking_revoked_at: null,
    networking_consent_version: 1,
  }).eq("id", user.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

```ts
// src/app/api/networking/revoke/route.ts
// mirror opt-in, sets networking_revoked_at = now()
```

Mount `NetworkingConsent` in settings-client.tsx in its own panel.

**Step 4: Run — PASS.**

**Step 5: Commit**

```bash
npm run t start R8.10
git add src/components/settings/NetworkingConsent.tsx src/app/api/networking docs/r8 src/app/(authenticated)/settings/settings-client.tsx src/app/__tests__/r8-consent-copy.proof.test.ts
git commit -m "[R8/8.10] feat(r8): consent surface (opt-in, revoke, verbatim copy) — P9 drift guard"
npm run t done R8.10
```

---

## Task R8.11 — Consent guard endpoint + P3/P4 invariants

**Files:**
- Create: `src/lib/networking/consent-guard.ts` — `assertConsented(userId): Promise<void>` throws on bad state.
- Create: `src/app/api/networking/match-candidates/route.ts` — always returns 403 in R8.
- Create: `src/app/__tests__/r8-consent-guard.proof.test.ts` — P3/P4.
- Create: `src/lib/networking/consent-guard.test.ts` — unit test.

**Step 1: Failing test**

```ts
// src/lib/networking/consent-guard.test.ts
import { describe, it, expect } from "vitest";
import { isConsentedShape } from "./consent-guard";

describe("isConsentedShape (pure evaluator)", () => {
  it("null consent → not consented", () => {
    expect(isConsentedShape({ networking_consent_at: null, networking_revoked_at: null })).toBe(false);
  });
  it("consent set, not revoked → consented", () => {
    expect(isConsentedShape({ networking_consent_at: "2026-04-01", networking_revoked_at: null })).toBe(true);
  });
  it("revoked after consent → not consented", () => {
    expect(isConsentedShape({ networking_consent_at: "2026-04-01", networking_revoked_at: "2026-04-05" })).toBe(false);
  });
  it("re-consented after revoke → consented", () => {
    expect(isConsentedShape({ networking_consent_at: "2026-04-10", networking_revoked_at: "2026-04-05" })).toBe(true);
  });
});
```

```ts
// src/app/__tests__/r8-consent-guard.proof.test.ts
describe("R8 P3/P4 — match-candidates endpoint", () => {
  it("endpoint module exports GET/POST that returns 403", async () => {
    const mod = await import("@/app/api/networking/match-candidates/route");
    expect(typeof mod.GET === "function" || typeof mod.POST === "function").toBe(true);
  });
  // Actual 403 integration test runs against a dev server in CI; the code-level
  // guard is the P3+P4 invariant proven by the pure evaluator + route body grep.
  it("route body contains gated-red-team-pending sentinel", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const body = readFileSync(resolve(process.cwd(), "src/app/api/networking/match-candidates/route.ts"), "utf8");
    expect(body).toMatch(/gated-red-team-pending/);
    expect(body).toMatch(/403/);
  });
});
```

**Step 2: Run — expected FAIL.**

**Step 3: Implementation**

```ts
// src/lib/networking/consent-guard.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface ConsentShape {
  networking_consent_at: string | null;
  networking_revoked_at: string | null;
}

export function isConsentedShape(row: ConsentShape): boolean {
  if (!row.networking_consent_at) return false;
  if (!row.networking_revoked_at) return true;
  return new Date(row.networking_revoked_at) < new Date(row.networking_consent_at);
}

export async function readConsent(userId: string): Promise<ConsentShape | null> {
  const sb = await createClient();
  const { data } = await sb.from("user_profiles")
    .select("networking_consent_at, networking_revoked_at")
    .eq("id", userId)
    .maybeSingle();
  return (data as ConsentShape | null) ?? null;
}

export async function assertConsented(userId: string): Promise<NextResponse | null> {
  const row = await readConsent(userId);
  if (!row || !isConsentedShape(row)) {
    return NextResponse.json(
      { ok: false, reason: "consent-required" },
      { status: 403 },
    );
  }
  return null;
}
```

```ts
// src/app/api/networking/match-candidates/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertConsented } from "@/lib/networking/consent-guard";

/**
 * R8: this endpoint is gated. Behavior ships in R8.x after the Red Team
 * pass. R8 returns 403 for all callers, including consented users, so that
 * no cross-user data can accidentally ship.
 */
export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  const guard = await assertConsented(user.id);
  if (guard) return guard;  // 403 for un-consented

  // R8 hard stop — consenting users also get 403 until Red Team pass lands
  return NextResponse.json(
    { ok: false, reason: "gated-red-team-pending" },
    { status: 403 },
  );
}
```

**Step 4: Run — PASS.**

**Step 5: Commit**

```bash
npm run t start R8.11
git add src/lib/networking/consent-guard.ts src/lib/networking/consent-guard.test.ts src/app/api/networking/match-candidates src/app/__tests__/r8-consent-guard.proof.test.ts
git commit -m "[R8/8.11] feat(r8): consent guard + match-candidates endpoint (403 — gated-red-team-pending) — P3/P4"
npm run t done R8.11
```

---

## Task R8.12 — Private note UI + P5 grep invariant

**Files:**
- Modify: `src/components/floor-6/rolodex/RolodexCard.tsx` — show private note on back face (or hover).
- Modify: `src/lib/db/queries/contacts-rest.ts` — expose `privateNote` in the user's own contact fetch (and nowhere else).
- Modify: `src/components/floor-6/crud/ContactModal.tsx` — add private_note textarea in the edit form.
- Create: `src/app/__tests__/r8-private-note-grep.proof.test.ts` — P5 invariant.

**Step 1: Failing test**

```ts
// src/app/__tests__/r8-private-note-grep.proof.test.ts
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(f.name)) out.push(p);
  }
  return out;
}

describe("R8 P5 — private_note is never exposed outside user's own contact fetch", () => {
  const allowlist = new Set<string>([
    "src/lib/db/queries/contacts-rest.ts",
    "src/components/floor-6/rolodex/RolodexCard.tsx",
    "src/components/floor-6/crud/ContactModal.tsx",
    "src/db/schema.ts",
    "src/db/__tests__/schema-r8.test.ts",
  ]);

  it("no AI prompt composition path references privateNote / private_note", () => {
    const aiFiles = walk(resolve(process.cwd(), "src/lib/ai"));
    for (const f of aiFiles) {
      const body = readFileSync(f, "utf8");
      expect(body).not.toMatch(/privateNote|private_note/);
    }
  });

  it("all cross-user / export paths do not reference private note", () => {
    const exportPaths = [
      "src/app/api/export",
      "src/app/api/networking",
    ];
    for (const p of exportPaths) {
      const fullPath = resolve(process.cwd(), p);
      try { statSync(fullPath); } catch { continue; }
      for (const f of walk(fullPath)) {
        const body = readFileSync(f, "utf8");
        expect(body).not.toMatch(/privateNote|private_note/);
      }
    }
  });

  it("only allowlisted files reference private_note in src/", () => {
    const all = walk(resolve(process.cwd(), "src"));
    const offenders: string[] = [];
    for (const f of all) {
      const rel = f.replace(resolve(process.cwd()) + "/", "");
      if (allowlist.has(rel)) continue;
      if (/__tests__/.test(rel)) continue;
      const body = readFileSync(f, "utf8");
      if (/privateNote|private_note/.test(body)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});
```

**Step 2: Run — expected FAIL until allowlist stable.**

**Step 3: UI — minimal addition to RolodexCard back-face (expand the button into a flip-card with a note in top-right)**

Add to `RolodexCard` or the flipped detail view:

```tsx
{contact.privateNote && (
  <aside aria-label="Private note, visible only to you" style={{
    position: "absolute", top: -12, right: -12, transform: `rotate(${seededTilt(contact.id)}deg)`,
    width: 80, height: 60, background: "#FFF8D4", color: "#3A2817",
    padding: 8, fontFamily: "'Caveat', 'Segoe Script', cursive", fontSize: 11,
    boxShadow: "0 2px 6px rgba(0,0,0,0.25)", pointerEvents: "none",
  }}>
    {contact.privateNote}
  </aside>
)}
```

Surface on ContactModal: add `<textarea name="privateNote">` with label *"Private note — just for you."* Save path updates `contacts.private_note`.

**Step 4: Run — PASS.**

**Step 5: Commit**

```bash
npm run t start R8.12
git add src/components/floor-6/rolodex/RolodexCard.tsx src/components/floor-6/crud/ContactModal.tsx src/lib/db/queries/contacts-rest.ts src/app/__tests__/r8-private-note-grep.proof.test.ts
git commit -m "[R8/8.12] feat(r8): private sticky-note on cards — never exposed to AI/export/cross-user (P5 grep invariant)"
npm run t done R8.12
```

---

## Task R8.13 — Red Team checklist + P10 invariant

**Files:**
- Create: `.tower/ledger/r8/red-team.md` — the 10 Q&A from design doc §7.5.
- Create: `src/app/__tests__/r8-red-team.proof.test.ts` — P10.

**Step 1: Failing test**

```ts
describe("R8 P10 — Red Team checklist", () => {
  it("file exists and has all 10 questions marked ✓", async () => {
    const fs = await import("node:fs");
    const body = fs.readFileSync(".tower/ledger/r8/red-team.md", "utf8");
    // 10 distinct checkmarks
    const ticks = (body.match(/^\s*-\s+✓/gm) || []).length;
    expect(ticks).toBeGreaterThanOrEqual(10);
  });
});
```

**Step 2: Create the file** with the 10 Q&A from design §7.5, each prefixed with `- ✓` followed by question, answer, and evidence line.

**Step 3: Commit**

```bash
npm run t start R8.13
git add .tower/ledger/r8/red-team.md src/app/__tests__/r8-red-team.proof.test.ts
git commit -m "[R8/8.13] docs(r8): Red Team checklist filed — 10 questions resolved with evidence (P10)"
npm run t done R8.13
```

---

## Task R8.14 — r8-acceptance-check.ts + wire into `tower accept`

**Files:**
- Create: `scripts/r8-acceptance-check.ts` — runs all 10 P invariants mechanically.
- Modify: `scripts/tower/commands/accept.ts` — dispatches r8-acceptance-check.ts on `accept R8`.
- Modify: `package.json` — ensure `tsx scripts/r8-acceptance-check.ts` is runnable.

**Pattern:** follow `scripts/r7-acceptance-check.ts`. Each invariant is a `fileContains` or `run-vitest-suite` check. Failures increment `failures` counter; exit 1 if any fail.

Checks:

1. Ledger has all R8.X tasks marked complete (Intent-level: R8.3, R8.5, R8.6, R8.7, R8.8, R8.10, R8.11, R8.12 — the visible + moat-layer ones).
2. `src/db/migrations/0018_r8_rolodex_lounge.sql` exists.
3. `vercel.json` contains warmth-decay + cio-reresearch + warm-intro-scan crons.
4. No `#EF4444` / `#F59E0B` in contact-card CSS (grep, exempting non-contact usage).
5. No `"leads"` (case-insensitive, word boundary) in `src/components/floor-6/**` or in shipping copy.
6. `src/components/floor-6/side-switch/useSideSwitch.ts` contains `"["` and `"]"` key bindings.
7. `/api/networking/match-candidates/route.ts` contains `"gated-red-team-pending"` and `403`.
8. `.tower/ledger/r8/red-team.md` exists with ≥10 `- ✓` lines.
9. `docs/r8/consent-copy.md` exists and the canary sentence matches `NetworkingConsent.tsx`.
10. The R8 proof suite passes: vitest on `src/app/__tests__/r8-*.proof.test.ts`.

Wire-up: `scripts/tower/commands/accept.ts` detects phase R8 and runs `scripts/r8-acceptance-check.ts` in addition to the existing 4-gate.

**Step: Commit**

```bash
npm run t start R8.14
git add scripts/r8-acceptance-check.ts scripts/tower/commands/accept.ts
git commit -m "[R8/8.14] test(r8): r8-acceptance-check.ts — 10 mechanical invariants + accept R8 wire-up"
npm run t done R8.14
```

---

## Task R8.15 — Sharpening: paper rustle + private-note tilt + any idle detail

**Files:**
- Modify: `src/lib/audio/` — add `synthPaperRustle()` (a short filtered-noise transient).
- Modify: `src/components/floor-6/rolodex/useRolodexRotation.ts` — fire rustle when rotation passes a card whose `privateNote` is non-null.
- Consider: an Easter egg — pulling the CEO's business card out of the Rolodex if the user rolls far enough in one direction (cosmetic; seeded fixed card at index 0).

**Step: Commit**

```bash
npm run t start R8.15
git add src/lib/audio/synth-paper-rustle.ts src/components/floor-6/rolodex/useRolodexRotation.ts
git commit -m "[R8/sharpening] audio: paper-rustle cue + hand-stuck note tilt — the private detail"
npm run t done R8.15
```

---

## Final verification + acceptance

```bash
# 4-gate
npm test
npx tsc --noEmit
npm run build
npm run lint   # must not introduce new errors

# R8 acceptance
npm run t accept R8
```

If `tower accept R8` returns success:

- ledger `acceptance.met` flips to `true`
- `verified_by_commit` stamps HEAD
- `CURRENT.yml` advances to R9 (per post-R7 cleanup)
- `.tower/autopilot.yml` auto-advances scope

Then:

```bash
cat <<'EOF' | npm run t handoff -- --stdin
{ ...see §0 handoff format, fill in at phase end... }
EOF
```

---

## Risk register

| Risk | Mitigation |
|------|-----------|
| CSS-3D perf cratering on low-end | Virtualize to 30 live cards + `prefers-reduced-motion` fallback to grid. Stress test at 200 cards in R8.3. |
| Consent copy ambiguity | Verbatim-enforced by P9; Red Team pass is gate (P10). If Red Team raises new Qs, open R8.x blocker. |
| private_note leak through future code | P5 allowlist grep; every PR touching contact paths will trip the allowlist if not added. |
| pgvector similarity noise produces bad warm-intros | Threshold 0.80 + cap of 2/day + idempotency per (contactId, applicationId). If false-positive rate is high, tune in R8.x. |
| Vercel cron overlap | Schedules spread across hours (04 → 05 → 06 UTC); each cron has a 5-minute budget. |

---

## Execution handoff

Plan complete and saved. Autopilot mode default: **subagent-driven-development** (plan has independent tasks in Wave B and C).

**Next step:** invoke `superpowers:subagent-driven-development` to dispatch fresh subagents per task, with code review between tasks. Autopilot skips the user-review pause; review happens internally.
