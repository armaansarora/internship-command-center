# THE TOWER — Immersive UI Implementation Plan

> **Date:** March 19, 2026  
> **Status:** DEFINITIVE — ready for implementation  
> **Synthesized from:** 5 research reports + project context  
> **Current state:** Phase 0 complete (SVG skyline, GSAP elevator, CSS day/night). This plan upgrades to a photorealistic, immersive experience.

---

## Table of Contents

1. [What to Build](#1-what-to-build)
2. [Tech Stack Decision](#2-tech-stack-decision)
3. [Architecture](#3-architecture)
4. [Asset Pipeline](#4-asset-pipeline)
5. [Implementation Order](#5-implementation-order)
6. [What's NOT in Scope](#6-whats-not-in-scope)

---

## 1. What to Build

### 1.1 The Penthouse (Dashboard) — Visual Experience

**What the user sees when they log in:**

The Penthouse is the top-floor command center of a luxury NYC skyscraper. The user's browser becomes a floor-to-ceiling window wall looking out over the Manhattan skyline. The React dashboard UI (stats, pipeline, activity feed, quick actions) floats as glass-panel overlays on top of this view — like holographic displays mounted on the window.

**Specific visual layers (back to front):**

1. **Sky** — gradient background that shifts with time of day (warm amber at dawn, blue at midday, deep navy at night)
2. **NYC Skyline** — a real photographic panorama split into 3–4 depth layers, with subtle parallax responding to mouse movement. This is the hero visual. It must look like a real window.
3. **Atmospheric effects** — subtle height fog at the base of distant buildings, bloom on city lights at night, soft vignette framing the edges
4. **Window tint overlay** — a subtle glass effect (CSS `backdrop-filter` + gradient) that makes the UI feel like it's mounted on actual glass
5. **Dashboard UI** — glass-panel stat cards, pipeline visualizer, activity feed, quick actions. These use the existing Tailwind + glass token system from Phase 0.

**The "first login" moment:**

When a user first arrives at the Penthouse, there is a brief cinematic entrance: the view fades in from black (like elevator doors opening), the skyline resolves from a gentle blur to sharp focus, and the dashboard panels slide into position. This takes ~1.5 seconds. Subsequent visits skip the entrance and load instantly.

### 1.2 NYC Skyline Background — The Specific Technique

**Decision: Layered real-photo parallax (NOT full HDRI, NOT procedural 3D, NOT video)**

This is the single most important visual decision. After cross-referencing all five research reports, the layered approach wins decisively:

| Approach | Quality | Perf Cost | Effort | Verdict |
|----------|---------|-----------|--------|---------|
| HDRI environment map (R3F) | 8/10 — good but 360° is wasted for a window view | Medium — 4-8 MB HDRI + 64 MB VRAM | Low | **Rejected** — overkill for a fixed-direction view; no NYC-specific HDRIs readily available per NYC visuals research |
| Procedural 3D city | 6/10 — can't match real Manhattan | High — full 3D scene | Very High | **Rejected** — wrong quality/effort tradeoff for background |
| Looping video | 9/10 — beautiful | Medium-High — bandwidth + decode | Low | **Rejected for default** — use only for login/onboarding as premium accent |
| **Layered photo + parallax** | **9.5/10** — real photography | **Low** — a few PNG layers + CSS/minimal WebGL | **Medium** | **CHOSEN** — best realism, best performance, proven technique |

**How it works:**

1. Start with a single high-res licensed NYC skyline photograph (penthouse-height perspective, looking south/southwest over Manhattan)
2. Run Depth Anything V2 to estimate depth planes
3. Manually separate into **4 layers**: sky, distant skyline, midground buildings, near rooftops/water
4. Each layer is a separate PNG/WebP image, positioned in a CSS 3D perspective container (or as R3F textured planes)
5. Mouse movement shifts layers at different speeds (far = slow, near = faster), creating a "looking through a real window" parallax effect
6. The movement is **subtle** — max ±2% horizontal, ±1% vertical — not aggressive dollying

**Why not R3F for the skyline itself?** Because a photograph-based layered approach produces higher realism than any WebGL technique for a fixed-direction view. R3F adds ~150KB of JS for something achievable with CSS 3D transforms at zero JS cost. However, R3F may be added later for atmospheric particle effects or interior 3D elements if the CSS-first approach needs upgrading.

**The CSS 3D implementation:**

```css
.skyline-container {
  perspective: 1000px;
  transform-style: preserve-3d;
  overflow: hidden;
}
.layer-sky       { transform: translateZ(-400px) scale(1.4); }
.layer-far       { transform: translateZ(-300px) scale(1.3); }
.layer-mid       { transform: translateZ(-150px) scale(1.15); }
.layer-near      { transform: translateZ(-50px) scale(1.05); }
```

Mouse tracking via a lightweight `requestAnimationFrame` loop adjusts `rotateY` and `rotateX` on the container — no library needed. This is the technique described in the game dev research as having a 4.5/5 feasibility rating with "low to medium" performance cost, using only hardware-accelerated CSS transforms.

### 1.3 Day/Night Cycle

**Decision: CSS cross-fade between pre-baked photo variants + CSS variable transitions**

The existing `DayNightProvider` from Phase 0 already tracks 7 time states (dawn, early_morning, morning, midday, afternoon, dusk, night) based on the user's local clock, updating every 60 seconds. This system stays.

**How day/night works visually:**

1. **Two complete skyline layer sets are loaded**: day and night. Day set includes dawn/afternoon warm tint variants. Night set has lit building windows and darker sky.
2. The night layer sits behind the day layer at `opacity: 0`. As time transitions (e.g., dusk → night), the night layer's opacity animates from 0 → 1 over ~3 seconds using CSS transitions driven by the existing `data-time` attribute on the `<html>` element.
3. **UI color tokens** already transition via CSS variables (`--sky-from`, `--sky-to`, `--tint`) — this is built and working in Phase 0's `globals.css`.
4. **Window lights on distant buildings** at night: the night skyline photo naturally shows lit windows. Additionally, the existing SVG skyline's random window-light system (Phase 0's `Skyline.tsx`) can be kept as a supplemental decorative layer rendered behind the photo layers, providing subtle animated twinkling.

**Why not a procedural sky shader or HDRI crossfade?** The game dev research rates CSS opacity crossfading as "low performance cost" compared to "medium" for WebGL shader blending. Since we need only 2 states (day/night) with a slow transition, CSS is strictly simpler and cheaper. The animation research confirms GSAP or even CSS transitions handle this well.

**Variants needed (minimum viable):**
- Day (clear, midday light)
- Night (city lights, dark sky)
- Dawn/dusk (warm amber, can be derived from day via CSS color overlay + reduced brightness)

**Future Phase 2:** Weather variants (rain, snow, overcast) generated via AI editing from the locked base composition using Flux.2 or OpenAI image editing — the NYC visuals research confirms this is the strongest AI workflow for consistent variants.

### 1.4 Floor Navigation (Elevator) Transitions

**Decision: GSAP timeline + CSS transforms (keep and enhance Phase 0 elevator)**

The current `Elevator.tsx` (301 lines, GSAP-powered) already handles door open/close animation, floor counter display, and keyboard accessibility. The upgrade path:

**What the elevator transition looks like:**

1. User clicks a floor in the elevator panel (or uses keyboard)
2. Elevator doors close (existing GSAP timeline — ~0.4s)
3. Floor counter animates through intermediate floors (existing feature)
4. **NEW:** The skyline parallax layers shift vertically during "travel" — simulating the view changing as the elevator ascends/descends. Lower floors see more nearby buildings; higher floors see more open sky and distant skyline. This is a subtle vertical `translateY` shift on the skyline layers.
5. **NEW:** A brief darkening overlay ("between floors" effect) — a 60% opacity dark wash that fades in and out over ~0.3s, masking the route transition underneath
6. Next.js route transition loads the new floor's content
7. Elevator doors open (existing GSAP timeline — ~0.4s)
8. New floor content fades in

**Total transition time:** ~1.2 seconds (doors close 0.4s + travel 0.4s + doors open 0.4s). Must feel snappy, not sluggish.

**GSAP is the right tool here** — the animation research unanimously identifies GSAP ScrollTrigger + Timeline as the gold standard for sequenced, multi-step transitions in Next.js. It's already in the project. The existing `useGSAP()` hook handles SSR safety and React 19 cleanup.

### 1.5 Atmospheric Effects

**Present in the immersive UI (in priority order):**

| Effect | Technique | When | Performance Cost |
|--------|-----------|------|-----------------|
| **Mouse parallax** | CSS 3D transforms + `requestAnimationFrame` | Always | Negligible — hardware-accelerated |
| **Vignette** | CSS `radial-gradient` overlay | Always | Negligible — single CSS layer |
| **Glass tint** | CSS `backdrop-filter: blur(2px) brightness(1.05)` | Always on dashboard panels | Low — hardware-accelerated per game dev research |
| **City light bloom (night)** | CSS `filter: blur(3px)` on a duplicated night-lights layer at low opacity | Night only | Low — single composited layer |
| **Height fog** | Semi-transparent gradient at bottom of skyline (white for day, warm amber for night) | Always | Negligible — CSS gradient |
| **Subtle dust motes** | `tsParticles` overlay, ~50 particles, low velocity | Optional, premium feel | Low — game dev research rates 2D canvas particles as medium, but 50 particles is trivial |

**NOT present (explicitly deferred):**

| Effect | Why Not |
|--------|---------|
| WebGL bloom/DOF post-processing | Adds ~150KB (R3F + postprocessing). CSS alternatives achieve 80% of the effect. Phase 2 upgrade if CSS feels insufficient. |
| Volumetric light rays | Hard — requires custom GLSL. Phase 2+ at earliest. |
| Rain/snow particles | Requires weather variants of skyline photos. Phase 2. |
| Sound design | Howler.js is easy to add but requires sourcing audio assets. Phase 2. |

---

## 2. Tech Stack Decision

### 2.1 What to USE

| Package | Version | Purpose | Why This One |
|---------|---------|---------|-------------|
| `gsap` | `^3.12` | Elevator transitions, entrance animations, scroll-triggered reveals | Already installed in Phase 0. Unanimous #1 pick across animation research and reference sites (J-Vers, Noomo ValenTime, Zentry, Igloo all use GSAP). 26.6 KB gzipped — lightest option. |
| `@gsap/react` | `^2.1` | `useGSAP()` hook for SSR-safe cleanup | Already installed. Official Next.js/React 19 support confirmed. |
| `lenis` | `^1.1` | Smooth scroll for floor-to-floor navigation feel | Used by Zentry, Igloo, Immersive Garden (all Awwwards SOTY winners). Eliminates scroll jank. ~4 KB gzipped. |
| `motion` (Motion for React) | `^12` | Page transitions (`AnimatePresence`), shared-element transitions (`layoutId`), dashboard panel entrance choreography | Best React-native layout animation library per research. 41.6 KB gzip. Complements GSAP — Motion handles React state transitions, GSAP handles scroll/timeline sequences. |
| `tsparticles` + `@tsparticles/react` | `^3` | Subtle dust motes / atmospheric particles | Lightest 2D particle option. Game dev research rates it 4/5 feasibility with React integration. No WebGL overhead. |
| `@tsparticles/slim` | `^3` | Slim bundle (no heavy presets) | Reduces tsParticles bundle to essentials |

**Already installed (Phase 0, keep as-is):**
- `next` 16, `react` 19, `tailwindcss` 3, `drizzle-orm`, `@supabase/ssr`
- Custom `DayNightProvider`, `FloorShell`, `Skyline.tsx`, `Elevator.tsx` (CustomCursor removed — BUG-007)

### 2.2 What NOT to Use (and Why)

| Rejected | Why |
|----------|-----|
| **React Three Fiber / Three.js / `@react-three/drei`** | The most contentious decision. R3F is the research favorite for full 3D scenes, but **The Tower's skyline is a fixed-direction view, not a 360° environment**. A layered photo with CSS 3D transforms achieves higher realism at 0 KB JS cost vs ~150 KB for R3F+Three. The Three.js research itself notes an HDRI background is "a single textured sphere/quad" — we can achieve the same effect with flat images in CSS perspective. **Revisit in Phase 2** if we need interior 3D elements (window frame mesh, reflective surfaces) or true WebGL post-processing. |
| **Remotion** | Animation research explicitly says "do not use as main engine for immersive app background." Frame-based video model doesn't fit a reactive, state-driven UI. |
| **Theatre.js** | Thinner documentation, less production-proven than GSAP. Only useful if we need a visual timeline editor, which we don't for Phase 1. |
| **Rive** | Good for polished vector microinteractions but adds 38-45 KB. The existing CSS + GSAP stack handles our UI needs. Revisit when we need interactive HUD elements. |
| **Lottie / dotLottie** | 33 KB gzip for player. No interactivity advantages over CSS + GSAP for our use case. |
| **Rapier / physics** | Only relevant if we add interactive 3D objects. Phase 2+ at earliest. |
| **Framer Motion (old)** | Superseded by `motion`. Use `motion` package. |

### 2.3 Install Commands

```bash
# New additions to Phase 0
npm install lenis motion @tsparticles/react @tsparticles/slim tsparticles-engine

# Already installed (verify in package.json)
# gsap @gsap/react — confirmed in Phase 0
```

**Total new JS added:** ~50 KB gzipped (lenis ~4KB + motion ~42KB + tsparticles-slim ~4KB). Acceptable for the immersion gained.

---

## 3. Architecture

### 3.1 Integration Pattern: Layered Composition

The immersive scene is **not a WebGL canvas** — it's a layered HTML/CSS composition that coexists naturally with React UI.

```
┌─────────────────────────────────────────────────────────┐
│  <html data-time="night">                               │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  WorldShell (existing — wraps authenticated app)  │  │
│  │                                                   │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  <SkylineScene>          z-index: 0         │  │  │
│  │  │  ├─ Sky gradient (CSS)                      │  │  │
│  │  │  ├─ Skyline layers (4x PNG/WebP in CSS 3D)  │  │  │
│  │  │  ├─ Height fog (CSS gradient)               │  │  │
│  │  │  ├─ Bloom glow layer (CSS, night only)      │  │  │
│  │  │  ├─ Dust motes (tsParticles canvas)         │  │  │
│  │  │  └─ Vignette (CSS radial-gradient)          │  │  │
│  │  │  position: fixed; inset: 0;                 │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                                                   │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  <WindowTint>            z-index: 1         │  │  │
│  │  │  CSS backdrop-filter: blur(1px)             │  │  │
│  │  │  + subtle gradient edge for glass feel      │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                                                   │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  <FloorContent>          z-index: 2         │  │  │
│  │  │  ├─ Elevator (existing, fixed left)         │  │  │
│  │  │  ├─ Dashboard panels (glass cards)          │  │  │
│  │  │  ├─ Navigation                              │  │  │
│  │  │  └─ Floor-specific content                  │  │  │
│  │  │  position: relative;                        │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key principle:** The sky and skyline are **position: fixed** behind everything. The React UI is **position: relative** on top. Pointer events pass through the background layers to the UI. This is the same pattern used by Stripe (Three.js gradient behind homepage) and GitHub (WebGL globe behind content), validated by the Three.js research.

### 3.2 File Structure (New Components)

```
src/
├── components/
│   ├── world/                          # EXISTING directory
│   │   ├── DayNightProvider.tsx         # KEEP — already works
│   │   ├── (deleted)                    # CustomCursor.tsx removed — BUG-007
│   │   ├── FloorShell.tsx               # MODIFY — swap SVG skyline for SkylineScene
│   │   ├── Skyline.tsx                  # KEEP as fallback — rename to SkylineSVG.tsx
│   │   ├── Elevator.tsx                 # MODIFY — add skyline shift + dark overlay
│   │   │
│   │   ├── SkylineScene.tsx             # NEW — master component for immersive background
│   │   ├── SkylineLayers.tsx            # NEW — CSS 3D parallax photo layers
│   │   ├── SkylineParallax.tsx          # NEW — mouse tracking hook + RAF loop
│   │   ├── AtmosphericEffects.tsx       # NEW — fog, vignette, bloom (CSS)
│   │   ├── DustMotes.tsx               # NEW — tsParticles overlay
│   │   └── WindowTint.tsx              # NEW — glass effect overlay
│   │
│   ├── transitions/                     # NEW directory
│   │   ├── FloorTransition.tsx          # NEW — AnimatePresence wrapper for route changes
│   │   ├── ElevatorTransition.tsx       # NEW — GSAP timeline for elevator travel effect
│   │   └── EntranceSequence.tsx         # NEW — first-login cinematic fade-in
│   │
│   └── ui/                             # EXISTING — dashboard panels, cards, etc.
│
├── hooks/
│   ├── useMouseParallax.ts              # NEW — normalized mouse position + smoothing
│   ├── useSkylineVariant.ts             # NEW — selects day/night photo set based on DayNight context
│   └── useReducedMotion.ts              # EXISTING — keep
│
├── lib/
│   ├── day-night.ts                     # EXISTING — keep
│   └── parallax.ts                      # NEW — math utilities for layer offsets
│
└── assets/
    └── skyline/                         # NEW — photo layers (see Asset Pipeline)
        ├── day/
        │   ├── sky.webp
        │   ├── far.webp
        │   ├── mid.webp
        │   └── near.webp
        ├── night/
        │   ├── sky.webp
        │   ├── far.webp
        │   ├── mid.webp
        │   └── near.webp
        └── fallback.webp               # Single compressed image for low-end/mobile
```

### 3.3 Performance Strategy

**Adaptive quality tiers (inspired by GitHub Globe's 4-tier system):**

| Tier | Trigger | What Changes |
|------|---------|-------------|
| **Full** (default) | Modern device, no issues | All 4 parallax layers, dust motes, bloom, full parallax range |
| **Reduced** | `prefers-reduced-motion: reduce` OR low-end device detected | Parallax disabled (static layers), no dust motes, no entrance animation |
| **Minimal** | Very slow device (< 30 FPS detected) or `Save-Data` header | Single fallback image, no layers, no effects |
| **SSR/No-JS** | Server render | Static gradient background (existing Phase 0 FloorShell sky) |

**Detection method:** A lightweight FPS counter runs for the first 2 seconds after mount. If average FPS < 45, drop to Reduced. If < 30, drop to Minimal. Store tier in `localStorage` so subsequent loads don't re-test. This mirrors the GitHub Globe pattern of monitoring over ~50 frames then making a decision.

**Lazy loading:**
- Skyline photos load via `loading="lazy"` on `<img>` elements, with the existing Phase 0 SVG skyline shown as placeholder during load
- `tsParticles` component loaded via `next/dynamic` with `ssr: false`
- Motion's `AnimatePresence` is tree-shaken — only the used features ship
- Night skyline layers are **not loaded until dusk** — triggered by the `DayNightProvider` state change. This saves ~200-400 KB for daytime-only sessions.

**Image optimization:**
- All skyline layers served as WebP (with PNG fallback)
- Desktop: 3840px wide layers (retina-ready)
- Mobile: 1920px wide layers
- `<picture>` elements with `srcset` for responsive loading
- Next.js `<Image>` component handles optimization, or manual `<picture>` if layers need CSS 3D positioning directly

---

## 4. Asset Pipeline

### 4.1 Getting the NYC Skyline Imagery

**Step-by-step process:**

**Step 1: Source the hero photograph**

Option A (recommended for production): License a premium panoramic photograph from Getty Images. Search: ["Manhattan skyline panorama" on Getty](https://www.gettyimages.com/photos/manhattan-skyline-panorama) or ["NYC skyline penthouse view" on Getty](https://www.gettyimages.com/photos/new-york-city-skyline). Budget: $150-500 for royalty-free commercial license. The NYC visuals research confirms Getty has large NYC skyline inventories and clear commercial licensing.

Option B (budget/prototype): Use an Unsplash photo. Search: ["New York skyline" on Unsplash](https://unsplash.com/s/photos/new-york-city-skyline). Irrevocable commercial license, no attribution required. Quality is less curated than Getty but sufficient for MVP.

**Requirements for the hero photo:**
- Perspective: eye-level from ~40th floor, looking south or southwest over Manhattan
- Aspect: ultra-wide (21:9 or wider) preferred, or crop a standard panorama
- Resolution: minimum 4000px wide (ideally 6000px+)
- Lighting: clear day for the "day" master; separately source or edit for "night"
- Composition: open negative space on the left or top for UI overlay

**Step 2: Create depth layers**

1. Run [Depth Anything V2](https://github.com/DepthAnything/Depth-Anything-V2) on the hero photo to generate a depth map
2. In Photoshop/GIMP, use the depth map as a selection guide to separate into 4 layers:
   - **Sky** — everything above the skyline (pure gradient + clouds)
   - **Far** — distant buildings (Empire State, Freedom Tower silhouettes)
   - **Mid** — midground buildings (closer, more detail)
   - **Near** — nearest rooftops, water, foreground elements
3. Inpaint gaps where layers overlap (Photoshop Content-Aware Fill or AI inpainting)
4. Each layer gets a transparent background except sky (which has its own gradient)
5. Export as `.webp` (quality 85) and `.png` (fallback)

**Step 3: Create night variant**

Option A (recommended): Source a separate night photo from the same approximate angle. Many stock sites have day AND night versions of popular NYC viewpoints.

Option B: Use AI image editing to convert the day photo. Use OpenAI image editing or Flux.2 edit workflow with the prompt pattern from the NYC visuals research: *"Edit this skyline image to a nighttime version. Preserve the exact camera position, building layout, framing, perspective. Change only atmosphere and lighting: dark sky, lit building windows, warm city glow, realistic night exposure."* Then manually cut into the same 4 layers.

Option C: Color-grade the day photo in Photoshop (darken sky, add window light dots, warm-shift building faces). Fastest but lowest quality.

### 4.2 Day/Night/Weather Variants

**Phase 1 (MVP):**
- Day set: 4 layers from hero photo
- Night set: 4 layers from night photo or AI-edited variant
- Dawn/dusk: CSS color overlay (`mix-blend-mode: color` with warm amber) on the day set, plus reduced brightness. No separate photos needed.

**Phase 2 (future):**
- Rain: AI-edited variant using Flux.2 reference workflow + rain overlay (tsParticles or pre-rendered loop)
- Snow: AI-edited variant + snow particle overlay
- Overcast: AI-edited variant with grey sky, flatter lighting

**Switching logic:**
```tsx
// useSkylineVariant.ts
const { timeState } = useDayNight();
const isDark = ['dusk', 'night'].includes(timeState);
const variant = isDark ? 'night' : 'day';
// CSS transition on parent container handles crossfade
```

### 4.3 Image Formats, Resolutions, Compression

| Asset | Format | Desktop Size | Mobile Size | Est. File Size (each) |
|-------|--------|-------------|-------------|----------------------|
| Sky layer | WebP | 3840×1080 | 1920×540 | 30-60 KB |
| Far layer | WebP (alpha) | 3840×1080 | 1920×540 | 80-150 KB |
| Mid layer | WebP (alpha) | 3840×1080 | 1920×540 | 100-200 KB |
| Near layer | WebP (alpha) | 3840×1080 | 1920×540 | 80-150 KB |
| Fallback (single) | WebP | 1920×1080 | 1280×720 | 100-200 KB |

**Total download per variant:** ~300-560 KB (desktop), ~150-280 KB (mobile)  
**Total for day + night:** ~600 KB - 1.1 MB. Acceptable — comparable to a single hero video frame.

**Compression settings:**
- WebP quality: 85 (sweet spot for photo realism)
- PNG fallback quality: maximum (for alpha channel layers)
- Use `sharp` or `squoosh` CLI for batch conversion

### 4.4 Where Assets Live

```
public/
└── skyline/
    ├── day/
    │   ├── sky.webp          # Desktop
    │   ├── sky-mobile.webp   # Mobile
    │   ├── far.webp
    │   ├── far-mobile.webp
    │   ├── mid.webp
    │   ├── mid-mobile.webp
    │   ├── near.webp
    │   └── near-mobile.webp
    ├── night/
    │   ├── sky.webp
    │   ├── sky-mobile.webp
    │   ├── far.webp
    │   ├── far-mobile.webp
    │   ├── mid.webp
    │   ├── mid-mobile.webp
    │   ├── near.webp
    │   └── near-mobile.webp
    └── fallback.webp         # Single low-res for minimal tier
```

Files go in `public/` (not `src/assets/`) because they need to be served as static files with correct caching headers. Next.js serves `public/` files at the root URL. Vercel CDN handles edge caching automatically.

---

## 5. Implementation Order

### Phase 1A: Immersive Background (Do First)

| Step | Task | Depends On | Complexity | Est. Time |
|------|------|-----------|------------|-----------|
| **1.1** | **Source & prepare skyline photos** — find hero photo (day), find or create night variant, run Depth Anything V2, cut into 4 layers each, export WebP | Nothing | Medium (mostly design/asset work) | 1-2 days |
| **1.2** | **Build `SkylineScene.tsx`** — container component with CSS 3D perspective, loads day/night layer sets based on `useDayNight()` context, handles crossfade | 1.1 (need assets) | Medium | 0.5 day |
| **1.3** | **Build `useMouseParallax.ts` + `SkylineParallax.tsx`** — mouse tracking with `requestAnimationFrame`, smoothed `lerp`, applies `rotateX`/`rotateY` to perspective container. Respects `prefers-reduced-motion`. | 1.2 | Low | 0.5 day |
| **1.4** | **Build `AtmosphericEffects.tsx`** — vignette (CSS radial-gradient), height fog (CSS linear-gradient), night bloom (duplicated blurred light layer) | 1.2 | Low | 0.5 day |
| **1.5** | **Integrate into `FloorShell.tsx`** — replace or layer behind existing SVG skyline. Keep SVG as loading placeholder (shows immediately, replaced when photos load). | 1.2, 1.3, 1.4 | Low | 0.5 day |
| **1.6** | **Build adaptive quality detection** — FPS monitor for 2 seconds, localStorage tier caching, quality tier context provider | 1.5 | Medium | 0.5 day |

**Subtotal: ~3-4 days**

### Phase 1B: Transitions & Motion (Do Second)

| Step | Task | Depends On | Complexity | Est. Time |
|------|------|-----------|------------|-----------|
| **2.1** | **Install `lenis` + `motion`** — configure Lenis for smooth scroll in `WorldShell`, wrap `(authenticated)/layout.tsx` with `AnimatePresence` | Nothing (can parallel with 1.1) | Low | 0.5 day |
| **2.2** | **Build `EntranceSequence.tsx`** — first-login cinematic: black → skyline blur-to-sharp → panels slide in. Uses GSAP timeline. Skipped on return visits (localStorage flag). | 1.5 (need skyline in place) | Medium | 1 day |
| **2.3** | **Upgrade `Elevator.tsx`** — add skyline vertical shift during floor travel, add dark overlay between floors, integrate with GSAP timeline sequencing | 1.5 (need skyline shift targets) | Medium | 1 day |
| **2.4** | **Build `FloorTransition.tsx`** — Motion `AnimatePresence` + `layoutId` for floor content entering/exiting. Coordinates with elevator door timing. | 2.1, 2.3 | Medium | 1 day |
| **2.5** | **Dashboard panel animations** — staggered entrance of stat cards, pipeline viz, activity feed using Motion `variants` with stagger. | 2.1 | Low | 0.5 day |

**Subtotal: ~3-4 days**

### Phase 1C: Polish & Particles (Do Third)

| Step | Task | Depends On | Complexity | Est. Time |
|------|------|-----------|------------|-----------|
| **3.1** | **Build `DustMotes.tsx`** — tsParticles with ~50 slow-moving white particles, low opacity, slight size variation. Loaded via `next/dynamic`. | Nothing | Low | 0.5 day |
| **3.2** | **Build `WindowTint.tsx`** — glass effect overlay with `backdrop-filter` and subtle edge gradient. Fine-tune per floor (higher floors = clearer glass). | 1.5 | Low | 0.5 day |
| **3.3** | **Mobile optimization** — test on real devices, implement mobile skyline (fewer layers, no parallax, touch-adjusted UI), verify adaptive quality tiers | All above | Medium | 1 day |
| **3.4** | **Loading states** — SVG skyline placeholder → crossfade to photo layers on load. Skeleton cards for dashboard during data fetch. | 1.5, 2.5 | Low | 0.5 day |
| **3.5** | **Performance audit** — Lighthouse, WebPageTest, real device FPS testing. Tune image sizes, compression, layer count if needed. | All above | Medium | 1 day |

**Subtotal: ~3-4 days**

### Parallelizable Work

```
Timeline:
Day 1-2:  [1.1 Source assets] ←→ [2.1 Install lenis + motion]
Day 2-3:  [1.2-1.4 Build skyline] ←→ [3.1 Dust motes]
Day 3-4:  [1.5-1.6 Integrate + adaptive quality]
Day 4-5:  [2.2 Entrance] ←→ [2.3 Elevator upgrade]
Day 5-6:  [2.4 Floor transitions] ←→ [2.5 Dashboard anims]
Day 7:    [3.2-3.3 Window tint + mobile]
Day 8-9:  [3.4-3.5 Loading + perf audit]
```

**Total estimated: 9-12 working days for a solo developer.**

---

## 6. What's NOT in Scope

### Explicitly Skipped for Now

| Feature | Why Skip | When to Revisit |
|---------|----------|----------------|
| **React Three Fiber / Three.js** | CSS-first approach achieves the visual target at lower cost + complexity. Add only if CSS parallax proves insufficient. | Phase 2 — if we need interior 3D (window frame mesh, reflective desk, 3D floor plan) |
| **WebGL post-processing (Bloom, DOF, SSAO)** | CSS `filter` and gradients handle 80% of the atmospheric effect. WebGL adds ~150 KB JS. | Phase 2 — if night city needs true HDR bloom |
| **Custom GLSL shaders** | Hard, time-intensive, not needed for MVP. The Three.js research confirms "zero custom GLSL required" for the MVP. | Phase 2+ — rain-on-glass effect, volumetric god rays |
| **Sound design (Howler.js)** | Easy to add but requires sourcing/licensing audio. The game dev research rates it 5/5 feasibility — it's just not Phase 1 priority. | Phase 2 — ambient city hum, elevator ding, UI interaction sounds |
| **Weather variants (rain/snow)** | Requires additional AI-generated skyline variants + particle systems. | Phase 2 — after base day/night is solid |
| **Interactive 3D floor plan** | Walking through a 3D building model (Bruno Simon style) is extraordinary but months of work. | Phase 3+ or never — elevator metaphor is more practical for a SaaS |
| **Multi-user presence** | Cosmos-style "see who's on which floor" — requires WebSocket infrastructure. | Phase 3+ |
| **AI-navigated camera** | Active Theory's "ask AI to fly camera to a section" — cool but complex. | Phase 3+ |
| **Video backgrounds** | Beautiful but bandwidth-heavy. The NYC visuals research recommends static/2.5D as default, video only for "premium surfaces." | Phase 2 — login page only |
| **Rive animations** | Good for interactive HUD elements but not needed when GSAP + Motion + CSS cover our current needs. | Phase 2 — interactive floor indicators, loading animations |
| **KTX2 texture compression** | Only relevant when using WebGL textures (Three.js). Our CSS-based approach uses standard image formats. | If/when R3F is added |
| **WebGPU** | Bleeding edge. Not needed for CSS-first approach. | Phase 3+ |

### What IS Phase 2 Material (Ordered by Impact)

1. **Sound design** — highest immersion-per-effort ratio after visuals
2. **Weather variants** — rain/snow skyline photos + particle overlays
3. **R3F upgrade path** — if CSS-first proves limiting, add Three.js for interior elements + true post-processing
4. **Video background on login** — short looping timelapse for the lobby/login page
5. **Interactive elevator cab interior** — 3D-rendered elevator walls during floor transition
6. **Rive HUD elements** — animated floor indicators, loading sequences

---

## Appendix A: Key Trade-Off Rationale

### CSS-First vs R3F-First (The Central Decision)

The research reports present two viable paths:

**Path A (R3F-first):** Use React Three Fiber as the rendering engine. Load an HDRI or textured sphere for the skyline. Use `<Bloom>`, `<DepthOfField>`, `<Vignette>` from `@react-three/postprocessing`. Mouse-driven parallax via `useFrame()` camera rotation.

**Path B (CSS-first):** Use real photographs in CSS 3D perspective containers. Use CSS `filter`, `backdrop-filter`, gradients for atmospheric effects. Mouse parallax via `requestAnimationFrame` on container transforms.

**I chose Path B.** Here's why:

1. **Realism:** A real photograph of NYC is more realistic than any HDRI or procedural rendering. The NYC visuals research rates "premium stock panorama" at 9.5/10 quality vs 5.5/10 for HDRI-as-hero.

2. **Bundle size:** Path B adds 0 KB of 3D libraries. Path A adds ~150 KB gzipped (three + @react-three/fiber + @react-three/drei + @react-three/postprocessing). For a SaaS app where every KB affects load time, this matters.

3. **Complexity:** Path B uses HTML/CSS that every React developer understands. Path A requires Three.js knowledge, SSR workarounds (`dynamic` with `ssr: false`), WebGL context management, and shader tuning. The project has a solo developer.

4. **Performance:** CSS 3D transforms are hardware-accelerated and essentially free. WebGL adds a separate rendering context that consumes GPU memory and competes with the browser's compositor.

5. **Upgrade path is clean:** If CSS-first proves insufficient, R3F can be added *alongside* the existing CSS layers — the architecture doesn't need to change. The `SkylineScene` component can swap its internals from CSS to R3F without affecting anything above it.

6. **The game dev research agrees:** It identifies the "sweet spot" as "Advanced HTML/CSS (CSS 3D Transforms + Parallax)" with photos, rating this approach as delivering "90% of the immersive 'presence' through depth, motion, and sound" while avoiding "the heavy javascript payload, battery drain, and complexity of a full React Three Fiber / WebGL canvas."

**The one thing we lose:** True reflective glass simulation (Linear's liquid glass technique). CSS `backdrop-filter` fakes glass well enough for Phase 1. If glass quality becomes a priority, that's when R3F enters the picture.

---

## Appendix B: Reference Architecture from Research

These production sites validate the layered-composition pattern:

- **Stripe.com** — Three.js canvas at z-index -1, React UI on top. Proves the overlay pattern at massive scale.
- **GitHub.com** — WebGL globe with SVG placeholder crossfade, 4-tier quality degradation. Directly inspired our adaptive quality system.
- **Vercel Next.js Conf** — R3F + Next.js with `PerformanceMonitor`. Proves R3F works in Next.js (relevant if we upgrade).
- **Cosmos.video** — Spatial SaaS with game-server architecture. Closest functional analogue to The Tower's concept.
- **Planpoint** — R3F architectural visualization with day/night cycle. Closest domain match.
- **J-Vers** — Next.js + R3F + GSAP + Tailwind. Almost a blueprint if we go R3F route.
- **Linear** — Premium UI without 3D. Proves that craft + speed > gimmicks. Our UI panels should match Linear's polish.

---

*This plan was synthesized from research on Three.js/R3F, animation frameworks (GSAP/Motion/Rive/Remotion/CSS), game development techniques for web, Awwwards-winning reference sites, and NYC visual asset sourcing. Every recommendation traces back to specific findings in those reports.*
