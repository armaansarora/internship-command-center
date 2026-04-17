# VISION SPEC — The Tower
## Immersive Spatial UI Specification (Locked)

**Last updated:** 2026-04-17
**Status:** Approved by Armaan. This document is the canonical reference for all UI decisions.
**Character rendering:** Option A — 2D Illustrated Characters with Parallax Depth (V1)

**Implementation alignment note (2026-04-17):**
- Floor dialogue experiences now share common primitives while preserving floor-specific theme/personality wrappers.
- Character interaction behavior remains machine-driven per floor, standardized by a shared machine factory.
- Architecture details live in `docs/ARCHITECTURE-MAP.md`; this vision doc remains the UX canon.

---

## Core Philosophy

> "This should feel less like software and more like entering a beautifully designed interactive experience that the user explores." — Armaan Arora

This is NOT a dashboard with a nice theme. This is a **spatial experience** — closer to a luxury game UI than a SaaS app. The user doesn't "use" the app — they **enter a building**.

---

## The Building

The entire application IS a building. Every interaction reinforces this metaphor.

| Element | What It Is | What It Replaces |
|---|---|---|
| Lobby | Login/signup screen | Generic sign-in page |
| Elevator | Primary navigation | Sidebar/navbar |
| Floors | Individual pages/features | Route changes |
| Windows | Background layer showing city | Decorative nothing |
| Characters | AI agents with personality | Chatbot widgets |

---

## Floor Directory

| Floor | Room Name | Function | Atmosphere | Character |
|---|---|---|---|---|
| PH | The Penthouse | Dashboard/Overview | NYC skyline, Central Park, golden hour, most luxurious | CEO (orchestrator) |
| 7 | The War Room | Applications/Pipeline | Dark tactical, focused, data-dense war table | CRO — aggressive, numbers-driven |
| 6 | The Rolodex Lounge | Contacts/Networking | Warm networking lounge, relaxed but professional | CNO — warm, social, remembers everyone |
| 5 | The Writing Room | Cover Letters | Quiet, library-like, focused creative | CMO — creative, eloquent |
| 4 | The Situation Room | Follow-ups/Calendar | Alert, time-sensitive, mission-control energy | COO (Dylan Shorts) — organized, deadline-focused |
| 3 | The Briefing Room | Interview Prep | Clean, sharp, preparation space, whiteboards | CPO — methodical, thorough |
| 2 | The Observatory | Analytics | Panoramic, cool blue, analytical, wide view | CFO — analytical, precise, sees patterns |
| 1 | The C-Suite | Agent Hub/CEO Office | Executive boardroom, most impressive room | CEO — commanding, strategic |
| L | The Lobby | Login/Onboarding | Construction-mode (new users) → polished (returning) | Concierge (onboarding guide) |

---

## The Elevator (Navigation System)

**Position:** Always visible on the left side of the screen.
**Visual:** Brushed gold elevator panel with lit floor buttons.
**Indicator:** Real-time floor display counting during transitions.

### Transition Sequence (GSAP Timeline)
1. Doors close — 400ms ease-in
2. Interior visible — brushed gold walls, floor indicator counting
3. Vertical movement feel — background shifts, subtle parallax movement — 600ms
4. Doors open to new floor — 400ms ease-out
5. **Total: ~1.4 seconds** — fast enough to not frustrate, slow enough to feel real

### Interior
During transition, user sees the inside of the elevator:
- Brushed gold wall panels
- Floor indicator display (digital counter)
- Subtle ambient lighting
- Optional: elevator ding sound on arrival

---

## The Skyline (Background Layer)

### Structure
4+ parallax depth layers:
1. **Far distance:** Faint building silhouettes, slightly desaturated
2. **Mid distance:** Recognizable NYC buildings, moderate detail
3. **Near distance:** Prominent buildings with window detail
4. **Window frame:** The room's actual window trim (foreground)

### Day/Night Cycle
| Time | Sky State | Skyline State | Ambient |
|---|---|---|---|
| 5-7am (Dawn) | Pink/orange gradient | Silhouettes, first lights off | Warm, soft |
| 7-10am (Morning) | Bright clear blue | Full color, sharp | Energetic |
| 10am-2pm (Midday) | White-blue, full brightness | Neutral | Clinical |
| 2-5pm (Afternoon) | Warming golden | Slight warm cast | Comfortable |
| 5-7pm (Golden Hour) | Deep gold/amber | Golden reflections | **Most luxurious** |
| 7-9pm (Dusk) | Purple/orange | City lights switching on | Transitional |
| 9pm-5am (Night) | Dark blue/black | Full city lights, stars, neon | Moody, intimate |

### Parallax Behavior
- Mouse movement: layers shift at different speeds (far = slow, near = fast)
- Scroll: subtle vertical parallax
- Floor height: higher floors show more sky, lower floors show more buildings

---

## The Characters

### Interaction Model
1. User enters a floor → sees the room environment + character at their station
2. User clicks/approaches character → conversation panel opens
3. Panel is styled as **face-to-face dialogue** (portrait, name, typed responses) — NOT a chatbot sidebar
4. Character responds **in personality** (system prompt defines their voice)
5. Characters stream responses via Vercel AI SDK v6
6. Characters can proactively alert ("Hey, 3 applications went stale this week")

### Character States
| State | Visual | When |
|---|---|---|
| Idle | Working at desk, looking at screen, reviewing documents | Default when user is on the floor |
| Alert | Subtle glow/pulse, character looking toward user | Character has something to report |
| Talking | Engaged expression, mouth animation, gestures | In conversation |
| Thinking | Looking away, hand on chin | Processing a request |

### Character Memory (Visible History)
Each character's workspace shows evidence of your shared history:
- CRO's whiteboard: actual pipeline numbers, hand-written style
- CMO's desk: printed drafts of cover letters they helped write
- CNO's rolodex: actual contact cards for people in the network
- COO's wall: user's calendar printed and annotated
- CIO's screens: research dossiers pinned to the wall
- CFO's desk: charts with the user's real analytics data

### Rendering (Option A — V1)
- High-quality 2D illustrated character portraits/sprites
- Parallax layers: room background → character (mid-ground) → UI (foreground)
- CSS/GSAP animations for state transitions
- 3-5 pose variants per character (idle, talking, gesturing, working, alert)
- Transparent backgrounds for compositing
- **Upgrade path:** Option B (3D with Three.js/R3F) in V2 after interaction model proven

### Character Roster

| Agent | Name | Title | Personality | Station |
|---|---|---|---|---|
| CEO | TBD | Chief Executive Officer | Commanding, strategic, big picture | Corner office, panoramic view |
| CRO | TBD | Chief Revenue Officer | Aggressive, numbers-driven, pipeline-obsessed | Whiteboard covered in pipeline data |
| CIO | TBD | Chief Intelligence Officer | Cerebral, research-obsessed | Surrounded by screens and research docs |
| COO | Dylan Shorts | Chief Operating Officer | Organized, deadline-focused | Clean desk, multiple monitors, calendars |
| CMO | TBD | Chief Marketing Officer | Creative, eloquent, words are weapons | Writing desk with scattered drafts |
| CPO | TBD | Chief Preparation Officer | Methodical, thorough, nothing left to chance | Briefing room with prep materials on walls |
| CNO | TBD | Chief Networking Officer | Warm, social, knows everyone | Lounge with rolodex and contact cards |
| CFO | TBD | Chief Financial Officer | Analytical, precise, pattern-finder | Desk with charts and financial dashboards |

---

## Custom Cursor System

| Context | Cursor State | Visual |
|---|---|---|
| Default | Refined pointer | Brushed gold thin crosshair or line |
| Hover: interactive | Glow ring | Subtle golden glow expanding around pointer |
| Hover: character | Speech indicator | Small speech bubble near cursor |
| Hover: data | Magnify | Magnifying lens micro-effect |
| Dragging | Grab | Grab cursor with subtle inertia trail |
| Loading | Elevator indicator | Miniature floor counter ticking |
| Idle (30s+) | Dim | Cursor dims, room lights subtly lower |

Falls back to native cursor on touch devices.

---

## Design Tokens

| Token | Value | Usage |
|---|---|---|
| Gold accent | `#C9A84C` | Elevator, cursor, highlights, premium touches |
| Primary dark | `#1A1A2E` | Deep backgrounds, night mode base |
| Glass surface | `backdrop-filter: blur(16px)` | Data cards, panels, overlays |
| Font: Display | Playfair Display | Floor names, character titles, headings |
| Font: Body | Satoshi | All body text, UI labels |
| Font: Data | JetBrains Mono | Numbers, statistics, code, pipeline data |
| Depth: Background | z-index: 0 | Skyline, room environment |
| Depth: Mid-ground | z-index: 10 | Characters, furniture, room objects |
| Depth: Foreground | z-index: 20 | Data panels, UI elements, conversation |

---

## Vision Expansions (10 Approved Concepts)

### 1. In-World Notifications
No generic toast bars. Notifications appear IN the world:
- Character taps window to get attention
- Pneumatic tube drops a message canister (follow-up reminders)
- Elevator button pulses when an agent has a report
- Urgent: office lights flicker, then relevant character's station glows
- Each notification type has its own spatial animation

### 2. Building Progression System
The building evolves as the user progresses:
- New users: stripped-down lobby — bare concrete, construction barriers, exposed beams
- Milestone unlocks: connect Gmail → comms floor renovates. Add 10 apps → War Room upgrades.
- Full onboarding complete → Penthouse unlocks with NYC view
- Power users: cosmetic upgrades (art on walls, upgraded furniture, skyline details)
- Creates emotional investment — "I built this building"

### 3. The Morning Briefing Ritual
Not a notification. A SCENE:
- Login → elevator auto-takes to Penthouse
- CEO at the window, turns to greet: "Good morning. Three things happened overnight..."
- Data appears on glass surfaces as CEO speaks
- User can interrupt, ask follow-ups, or dismiss

### 4. Spatial Audio (Web Audio API)
Spatialized sound (off by default, toggle in settings):
- Each floor: own ambient soundscape (Penthouse: distant city hum + wind; War Room: tense low hum + keyboard clicks; Rolodex Lounge: soft jazz + ice clinking)
- Characters: voice fades in as you approach, stereo positioning
- Elevator: mechanical movement, floor ding, doors opening

### 5. Liquid Glass Surfaces
Apple's Liquid Glass concept, executed better (no readability compromise):
- Penthouse glass reflects the skyline with subtle refraction
- Data cards: frosted glass that shifts with parallax
- Elevator interior: polished gold with specular highlights responding to movement
- Glass is decorative/environmental only — NEVER on text or controls

### 6. Character Memory as Visible History
See "Character Memory" section above. The room physically reflects your history.

### 7. Weather-Reactive Mood (Phase 6+)
OpenWeatherMap API integration:
- Rain IRL → rain streaks on Penthouse windows, city in mist
- Clear → sharp skyline, sun reflections
- Snow → flakes accumulate on window ledges

### 8. The Lobby as Onboarding Stage
Ground floor doubles as onboarding:
- Concierge character guides through account setup
- Building directory (floor map) grays out locked floors
- Returning users: welcome-back + ride elevator to last-visited floor
- Lobby transitions from construction to finished as user progresses

### 9. Contextual Cursor States
See "Custom Cursor System" section above. Fully specified.

### 10. Easter Eggs
- Midnight: fireworks over skyline (New Year's energy)
- Rapid-click elevator buttons: "Please don't break the elevator" from concierge
- 100th application tracked: confetti + CEO congratulations
- Click character nameplate: hidden "about me" backstory

---

## What This Is NOT

- Not a game engine port (no Unity, Unreal, heavy 3D)
- Not a metaverse/virtual office (no avatars, multiplayer, VR)
- Not a visual novel (real SaaS functionality beneath the experience)
- **It IS:** A premium SaaS product wrapped in spatial, immersive UI. The data and automation are real. The experience around them is extraordinary.
