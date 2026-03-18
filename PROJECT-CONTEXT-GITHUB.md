# PROJECT CONTEXT — Internship Command Center
## Living Document — Auto-Updated Every Interaction

**Last updated:** 2026-03-18T16:31:00-04:00 (AST)
**Owner:** Armaan Arora (armaansarora20@gmail.com, GitHub: armaansarora)
**Timezone:** America/Puerto_Rico (AST)
**Perplexity Plan:** Max (upgraded 2026-03-18)

---

## 0. SESSION BOOTSTRAP PROTOCOL

**Every new session MUST do the following before any work:**

1. `memory_search` for "internship command center project" to get retrieval instructions
2. Read this file: `/home/user/workspace/command-center/PROJECT-CONTEXT.md`
   - If workspace is empty, clone `armaansarora/internship-command-center` and read from there (GitHub version has no credentials — check `.env.local` or ask Armaan)
3. Read `/home/user/workspace/command-center/.env.local` for credentials
4. Check Section 10 (Session Log) for where we left off and what's next
5. Load skills: `website-building/webapp`, `design-foundations`, `coding-and-data`
6. Confirm connectors are live: `list_external_tools` for supabase, resend, github, vercel, gcal, google_drive

**AUTO-UPDATE RULE:** After every meaningful exchange (and most minor ones too), update this file. Armaan's directive: "even some less meaningful things. Not just meaningfully update it." When in doubt, write it down.

---

## 1. WHO ARMAAN IS

- **Name:** Armaan Arora
- **Email:** armaansarora20@gmail.com
- **GitHub:** armaansarora (https://github.com/armaansarora)
- **Timezone:** America/Puerto_Rico (AST, UTC-4)
- **Perplexity Plan:** Max (upgraded 2026-03-18)
- **Background:** Student doing a real estate internship search
- **Target companies:** Blackstone, CBRE, JLL, Cushman & Wakefield, Marcus & Millichap, Newmark, Colliers, Eastdil Secured, HFF, Walker & Dunlop, Hines, Brookfield
- **Working style:** Analytical, not emotional. Cut the fat, keep the meat. Wants masters-degree-level code. Demands deep research — will push back on surface-level work.
- **Communication:** Direct. Says what he means. Doesn't want excuses or filler.
- **Model preference:** Let the system pick the best model for each task. No fixed model.
- **Context preference:** Wants 100% context continuity across sessions. Every detail captured. Zero gaps.
- **Preferred sources:** web, vercel, gcal, google_drive, github_mcp_direct

---

## 2. WHAT THIS PROJECT IS

A multi-tenant SaaS platform for automating internship/job searches. Users sign in, connect their Google accounts, and the system handles everything — email parsing, application tracking, follow-ups, interview prep, cover letters, analytics, and AI agent orchestration. Armaan wants to sell this as a product eventually.

**Codename:** The Tower
**Metaphor:** Penthouse Office — elevator sidebar navigation, floor numbers, glass/gold aesthetic

---

## 3. PRODUCTION STACK (Final Decisions)

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 16 (App Router) | SSR, API routes, middleware, Vercel-native |
| Database | **Supabase Postgres** | DB + Auth + Storage + Realtime + RLS + Edge Functions, all-in-one |
| ORM | Drizzle | Already in old repo, type-safe, migration support |
| Auth | **Supabase Auth** | Google OAuth, magic link, multi-tenant, RLS integration |
| Background Jobs | Inngest | Agent orchestration, cron, event-driven workflows |
| AI/LLM | Vercel AI SDK v6 + Anthropic | Agentic tool use, streaming, structured output |
| Animations | GSAP + Framer Motion | Premium feel, scroll-driven, micro-interactions |
| Email (outbound) | Resend | Transactional emails from the app |
| Caching/Rate Limit | Upstash Redis | Rate limiting, caching, queues |
| Embeddings | pgvector (Supabase extension) | Company/job similarity search |
| Hosting | Vercel | Auto-deploy from GitHub, edge functions, preview deploys |
| Payments | Stripe | Subscription tiers (future) |
| CI/CD | GitHub Actions | Lint → Typecheck → Test → Build |
| Monitoring | Sentry (Phase 2+) | Error tracking when there's real traffic |

### What was rejected and why
- **Neon Postgres** → Supabase gives DB + Auth + Storage + Realtime in one
- **Better Auth / NextAuth** → Supabase Auth is tightly coupled with RLS, no vendor lock-in issue since we own the Supabase project
- **Clerk / Auth0** → Expensive at scale, vendor lock-in
- **Remotion** → Video generation library, not relevant for dashboard UI
- **Obsidian** → Note-taking app, not SaaS infrastructure; pgvector replaces the vector search need
- **Context7 MCP** → Useful for AI coding sessions (provides up-to-date library docs), not app infrastructure
- **Google Sheets as DB** → No ACID, no FK, no indexes, 10M cell limit, terrible as primary storage

---

## 4. CREDENTIALS & INFRASTRUCTURE

### Supabase
- Project ID: `jzrsrruugcajohvvmevg`
- URL: `https://jzrsrruugcajohvvmevg.supabase.co`
- Region: East US (North Virginia)
- Anon Key: `<REDACTED>`
- Service Role Key: `<REDACTED>`
- DB Password: `<REDACTED>`
- DB URL (percent-encoded): `postgresql://postgres:<REDACTED>@db.jzrsrruugcajohvvmevg.supabase.co:5432/postgres`
- Publishable Key: `<REDACTED>`
- Secret Key: `<REDACTED>`

### Resend
- API Key: `<REDACTED>`

### Vercel
- Project: `internship-command-center` (prj_C6B6ZEsG5khpsISEzvgaMQzo9r5g)
- Team: `team_EC8AIyc155clLRjzrJ0fblpa` ("Armaan Arora's projects")
- Production URLs: 
  - https://internship-command-center-armaan-aroras-projects.vercel.app
  - https://internship-command-center-lake.vercel.app

### GitHub
- Repo: `armaansarora/internship-command-center`
- Main branch: `main`
- GitHub Push Protection: ENABLED (will reject pushes containing secrets — use .env.local, never commit keys)

### Connected Connectors (Perplexity Computer)
| Connector | Status | Tools Available |
|-----------|--------|----------------|
| `github_mcp_direct` | CONNECTED | Full GitHub CLI (`gh`) access |
| `vercel` | CONNECTED | Deploy, logs, projects, domains |
| `gcal` | CONNECTED | Gmail search/send + Calendar read/write |
| `google_drive` | CONNECTED | File export, search, sharing |
| `supabase__pipedream` | CONNECTED | select, insert, update, delete, upsert, count, batch insert, RPC |
| `resend__pipedream` | CONNECTED | send email, retrieve email |
| `stripe` | CONNECTED | Payment processing |
| `google_sheets__pipedream` | CONNECTED | Spreadsheet read/write |

### NOT connected (and not needed right now)
- `cloud_convert__pipedream` — file conversion, not relevant yet
- `google_forms__pipedream` — forms, not relevant
- `google_cloud_vision_api__pipedream` — image recognition, not relevant
- `youtube_analytics_api__pipedream` — YouTube, not relevant
- `jira_mcp_merge` — Jira, not relevant (no Jira workflow)

---

## 5. CODE AUDIT RESULTS (2026-03-18)

Old repo: ~19,800 LOC, 200+ files, Next.js 16 + Turso (SQLite) + NextAuth + AI SDK v6 + Inngest
Full audit in `/home/user/workspace/command-center/AUDIT.md`

**Armaan approved the audit on 2026-03-18 at ~4:23 PM AST.**

### KEEP (port to new stack) — ~7,000 LOC
| Module | LOC | Adaptation |
|--------|-----|-----------|
| Contracts (`src/contracts/`) | 1,015 | Update DepartmentId enum |
| Agent System (`src/lib/agents/`) | 1,815 | Swap Turso → Supabase DB calls |
| Gmail (`src/lib/gmail.ts`) | 304 | Rewire OAuth token source |
| Calendar (`src/lib/calendar.ts`) | ~400 | Rewire OAuth token source |
| Schema (`src/db/schema.ts`) | 517 | SQLite→PG, add userId, RLS, uuid, pgvector |
| Agent Tools | ~500 | Swap DB layer |
| Tests (`src/__tests__/`) | 2,531 | Update DB mocks |
| Hooks (`src/hooks/`) | ~300 | Keep as-is |
| CI | 60 | Update secrets |
| Inngest Client | ~30 | Update env vars |

### KILL — ~12,800 LOC
- All UI components (7,975 LOC), all pages (1,026 LOC), auth (101 LOC), DB connection, 147 planning docs, Sentry, service worker, Novel editor, SQLite migrations, design tokens

---

## 6. DESIGN DIRECTION — THE TRUE VISION

### Core Philosophy (Armaan's words, 2026-03-18 4:42 PM AST)
> "I do not want this project to feel like a normal app with flat screens and static pages. I want it to feel alive, immersive, and almost game-like. The user should move through it the way someone moves through a world, not just click through menus."
>
> "The interface should feel three-dimensional and experiential. Progressing through the project should feel like traveling through a space. If you go to another floor, it should not just switch screens — it should feel like taking an elevator, with animation and presence."
>
> "I want every part of the environment to have mood and atmosphere. For example, when you reach the penthouse floor, it should open up to a stunning New York City view overlooking Central Park. The world should react to context too — lighting can shift from day to night, changing the feeling of the space."
>
> "This should feel less like software and more like entering a beautifully designed interactive experience that the user explores."

### What This Means Technically
This is NOT a dashboard with a nice theme. This is a **spatial experience** — closer to a luxury game UI or an interactive art installation than a SaaS app. Key principles:

1. **SPATIAL NAVIGATION** — Moving between pages = traveling between floors in a building. The elevator is not a metaphor for a sidebar — it IS the navigation. When you click floor 7, you see elevator doors close, feel movement, doors open to The War Room. GSAP timeline animations, not CSS transitions.

2. **3D PRESENCE** — The UI should have depth. Parallax layers, perspective transforms, ambient lighting. Not flat cards on a flat page. Think: looking through a glass window at a cityscape while your data floats in the foreground.

3. **ENVIRONMENTAL STORYTELLING** — Each floor has its own atmosphere:
   - The Penthouse (PH): NYC skyline view, Central Park visible, golden hour lighting
   - The War Room (7): Darker, tactical feel, data-dense
   - The Observatory (2): Panoramic, analytical, cool blue tones
   - Each room should feel like a PLACE, not a page

4. **CONTEXT-REACTIVE ENVIRONMENT** — The world responds to real conditions:
   - Day/night cycle based on user's actual time (AST)
   - Weather-reactive ambiance (optional)
   - Lighting shifts affect the mood of every surface
   - NYC skyline goes from sunrise gold → daylight blue → sunset amber → night city lights

5. **CUSTOM CURSOR** — A bespoke cursor designed for this experience. Not a default pointer. Something that fits the luxury/spatial world.

6. **MICRO-WORLD DETAILS** — Small touches that make it feel alive:
   - Ambient particle effects (subtle, not distracting)
   - Sounds (optional, toggle-able) — elevator ding, subtle room ambiance
   - Loading states that feel like the building is "waking up"
   - Hover states that feel like touching glass surfaces

### Technical Approach
- **GSAP** for all spatial animations (elevator transitions, parallax, scroll-driven effects)
- **Framer Motion** for component-level micro-interactions (hover, appear, state changes)
- **Three.js or CSS 3D transforms** for depth/perspective effects (evaluate which is lighter)
- **Canvas or SVG** for the NYC skyline (procedural or high-quality asset)
- **CSS custom properties** for the day/night cycle (time-driven theme shifts)
- **requestAnimationFrame** for smooth ambient effects

### Design Tokens
- Gold accent: `#C9A84C`
- Primary dark: `#1A1A2E`
- Glass surfaces: `backdrop-filter: blur(16px)` with variable opacity
- Fonts: Playfair Display (headings), Satoshi (body), JetBrains Mono (data)
- Depth layers: background (skyline) → mid-ground (room environment) → foreground (data/UI)

### Page Names (Room Metaphor)
| Page | Room Name | Floor | Atmosphere |
|------|-----------|-------|------------|
| Dashboard | The Penthouse | PH | NYC skyline, Central Park view, golden hour, most luxurious |
| Applications | The War Room | 7 | Dark tactical, focused, data-dense war table feel |
| Contacts | The Rolodex Lounge | 6 | Warm networking lounge, relaxed but professional |
| Cover Letters | The Writing Room | 5 | Quiet, library-like, focused creative space |
| Follow-ups | The Situation Room | 4 | Alert, time-sensitive, mission-control energy |
| Interview Prep | The Briefing Room | 3 | Clean, sharp, preparation space, whiteboards |
| Analytics | The Observatory | 2 | Panoramic, cool blue, analytical, wide view |
| Agents | The C-Suite | 1 | Executive boardroom, AI agents as seated executives |

### THE CHARACTERS (Fleshed-Out Vision)
The C-Suite agents are NOT chatbots in a sidebar. They are **characters in a space**. Each agent is a person with a name, appearance, personality, and a desk/station in their floor's room. You approach them. You talk to them. They respond in character.

| Agent | Name | Title | Personality | Visual Concept |
|-------|------|-------|-------------|----------------|
| CEO | TBD | Chief Executive Officer | Commanding, strategic, sees the big picture | Corner office, panoramic view, standing at the window |
| CRO | TBD | Chief Revenue Officer | Aggressive, numbers-driven, always tracking pipeline | Standing at a whiteboard covered in pipeline data |
| CIO | TBD | Chief Intelligence Officer | Cerebral, research-obsessed, deep knowledge | Surrounded by screens and research documents |
| COO | Dylan Shorts | Chief Operating Officer | Organized, deadline-focused, keeps everything running | Seated at a clean desk with multiple monitors, calendars |
| CMO | TBD | Chief Marketing Officer | Creative, eloquent, words are their weapon | Writing desk with drafts scattered around |
| CPO | TBD | Chief Preparation Officer | Methodical, thorough, leaves nothing to chance | Briefing room with prep materials on walls |
| CNO | TBD | Chief Networking Officer | Warm, social, knows everyone, remembers everything | Lounge area with a rolodex and contact cards |
| CFO | TBD | Chief Financial Officer | Analytical, precise, sees patterns in data | Desk with charts, graphs, financial dashboards |

**Interaction Model:**
- User enters a floor → sees the room environment + the character(s) stationed there
- User clicks/approaches a character → conversation panel opens (not a generic chatbot — styled as face-to-face dialogue)
- Character responds in their personality and role — the CRO talks about pipeline, the CIO talks about research
- Characters can proactively alert you ("Hey, I noticed 3 applications went stale this week")
- Characters remember previous conversations (agent memory via pgvector)
- Characters have idle animations (working at desk, looking out window, reviewing documents)
- Characters have talking/engaged animations when in conversation

**Character Rendering Approach (Technical Evaluation):**

Option A: **Illustrated 2D characters with parallax depth** (RECOMMENDED FOR V1)
- High-quality illustrated character portraits/sprites
- Parallax layers create depth (character in mid-ground, room in background, UI in foreground)
- CSS/GSAP animations for idle states, talking states
- MUCH lighter than 3D — better performance, faster to build
- Can upgrade to 3D later without changing the interaction model
- References: Visual novel / RPG dialogue systems, Persona-style character presentation

Option B: **3D characters with Three.js / React Three Fiber**
- GLB/GLTF models loaded into Three.js scenes
- Skeletal animations (idle, talking, gesturing)
- React Three Fiber for React integration
- Heavier — needs model creation, rigging, animation
- Better for V2 when the interaction model is proven
- References: Convai + Three.js character demos, Codrops interactive 3D character tutorial

Option C: **AI-generated character portraits that update contextually**
- Use image generation to create character portraits
- Different expressions/poses based on conversation state
- Lighter than 3D, more dynamic than static illustrations
- Risk: inconsistency between generated images

**DECISION (2026-03-18 ~4:52 PM AST): Armaan approved Option A** — 2D Illustrated Characters with Parallax Depth for V1. Upgrade path to Option B (3D) in V2 after interaction model is proven.

### VISION EXPANSION — Ideas Beyond The Original Brief

The following ideas were researched and proposed to push the experience further. These go beyond what Armaan initially described and represent the agent's creative contributions to the vision.

**1. In-World Notifications (Not Toast Bars)**
Notifications don't appear as generic floating toast messages. They appear IN the world:
- A character walks to a window and taps on it to get your attention
- A pneumatic tube drops a message canister onto a desk (for follow-up reminders)
- The elevator dings and a floor button pulses when an agent has something to report
- Urgent alerts: office lights flicker briefly, then the relevant character's station glows
- Each notification type has its own spatial animation — not a single generic pattern

**2. Progression & Mastery System (The Building Grows)**
The building itself evolves as the user progresses:
- New users start with a stripped-down lobby — bare concrete, construction barriers, exposed beams
- As they complete onboarding milestones (connect Gmail, add first application, etc.), the building "renovates" floor by floor
- Completing all onboarding unlocks the full Penthouse with the NYC view
- Power users unlock cosmetic upgrades: art on walls, better furniture, upgraded skyline details
- This creates emotional investment — "I built this building" — and naturally gamifies onboarding without feeling forced
- Inspired by progression systems in games like Animal Crossing (home upgrades) and narrative anchors in modern gamification research

**3. The Morning Briefing as a Ritual**
The daily CEO briefing isn't just a notification or email. It's a SCENE:
- User logs in → elevator automatically takes them to The Penthouse
- The CEO character is standing at the window, turns to greet them
- Briefing unfolds as a conversation: "Good morning. Three things happened overnight..."
- Data appears on glass surfaces around the room as the CEO speaks
- User can interrupt, ask follow-ups, or dismiss
- Creates a daily ritual that makes users WANT to open the app

**4. Spatial Audio Layer (Web Audio API)**
Using the Web Audio API for spatialized sound (not just background music):
- Each floor has its own ambient soundscape (The Penthouse: distant city hum + wind; The War Room: tense low hum + keyboard clicks; The Rolodex Lounge: soft jazz + ice clinking)
- Characters have audio presence — their voice fades in as you approach, positioned in stereo space
- The elevator has its own audio: mechanical movement, floor ding, doors opening
- ALL audio is off by default. Toggle in settings. But when ON, it transforms the experience
- Inspired by Awwwards' research on Sonoric Landscapes and the Web Audio API's spatialization capabilities

**5. Liquid Glass Surfaces (Inspired by Apple's iOS 26 Liquid Glass, But Done Right)**
Apple introduced Liquid Glass in iOS 26 — translucent, refractive surfaces that respond to movement. NN/Group criticized Apple's implementation for hurting readability. We can take the CONCEPT but execute it better:
- Glass surfaces on the Penthouse reflect the skyline behind them with subtle refraction
- Data cards have a frosted glass treatment that shifts with parallax (not enough to hurt readability)
- The elevator interior has polished gold surfaces with subtle specular highlights that respond to movement
- Key difference from Apple: our glass is decorative/environmental, NOT on text/controls. Readability is never compromised.

**6. Character Memory as Visible History**
When you approach a character, their desk/station shows physical evidence of your shared history:
- The CRO's whiteboard shows your actual pipeline numbers, hand-written style
- The CMO's desk has printed drafts of cover letters they helped you write
- The CNO's rolodex has actual contact cards for people in your network
- The COO (Dylan Shorts) has your calendar printed on his wall
- This makes the world feel lived-in and personal — not a generic template

**7. Weather-Reactive Mood (Optional, Phase 3+)**
Beyond day/night cycle, the skyline reacts to actual weather in the user's location:
- Raining IRL → rain streaks on the Penthouse windows, city in mist
- Clear day → sharp skyline, sun reflections
- Snowing → snowflakes accumulate on window ledges
- Weather data from a simple API (OpenWeatherMap free tier)
- Subtle but rewarding for users who notice it

**8. The Lobby as Onboarding Stage**
The lobby/login screen isn't just a sign-in page. It's the ground floor of the building:
- First-time users see a concierge character who guides them through account setup
- The lobby has a building directory (floor map) that grays out floors not yet accessible
- Returning users see a welcome-back message from the lobby character and can ride the elevator to their last-visited floor
- The lobby transitions from construction-mode to finished as the user progresses (ties into #2)

**9. Contextual Cursor States**
Expanding the custom cursor idea:
- Default: refined crosshair or minimal pointer (brushed gold line)
- Hover over character: speech bubble appears near cursor
- Hover over data: magnifying lens effect
- Hover over actionable item (button, link): subtle golden glow ring
- Dragging: grab cursor with inertia trail
- Loading: the cursor becomes a miniature elevator indicator counting floors
- Idle for 30+ seconds: cursor dims, room lights subtly lower (the building "sleeps")

**10. Easter Eggs & Delight Moments**
- Click the Penthouse window at exactly midnight → fireworks over the skyline (New Year's energy)
- Rapid-click the elevator buttons → "Please don't break the elevator" message from the lobby concierge
- 100th application tracked → confetti animation + CEO character congratulates you
- All agents have a hidden "about me" interaction — click their nameplate to learn their backstory
- These aren't gimmicks — they reward exploration and make the world feel handcrafted

---

### THE WORLD — Full Environmental Spec

**The Building:**
The entire app IS a building. The user doesn't use a web app — they enter a building. Every interaction reinforces this metaphor:
- **Lobby/Login:** The ground floor. Sign-in is walking through the entrance.
- **Elevator:** The primary navigation. Always visible (like a persistent sidebar, but spatial). Shows current floor, animates between floors.
- **Floors:** Each page is a floor with its own architectural identity.
- **Windows:** Every floor has windows. What you see through them depends on floor height and time of day.

**The Skyline (Background Layer):**
- NYC skyline with Central Park visible from upper floors
- Procedural or high-quality layered SVG/Canvas
- Multiple depth layers: distant buildings → mid-range buildings → near buildings → window frame
- Day/night cycle: sunrise (6am) → morning (8am) → noon → golden hour (5pm) → sunset (7pm) → night (9pm) → deep night
- City lights come on at dusk, stars appear at night
- Subtle parallax movement on mouse/scroll

**The Elevator (Navigation):**
- Always present on the left side of the screen
- Shows floor indicator (like a real elevator panel with lit buttons)
- Click a floor → elevator doors close (GSAP animation, ~400ms) → brief vertical movement feel (background shifts, subtle screen motion, ~600ms) → doors open to new floor (~400ms)
- Total transition: ~1.4 seconds (fast enough to not frustrate, slow enough to feel real)
- Elevator interior visible during transition (brushed gold walls, indicator display counting floors)
- Subtle elevator ambient sound (optional, toggle-able)

**The Cursor:**
- Custom cursor that fits the luxury aesthetic
- Changes based on context: default (refined pointer), hover over interactive element (glow/expand), hover over character (speech bubble indicator), dragging (grab)
- Smooth trailing effect (subtle, not distracting)

**Ambient Details:**
- Subtle particle effects: dust motes in sunlight, city light reflections at night
- Glass surfaces reflect/refract slightly
- Room lighting responds to time of day (warmer at golden hour, cooler at night, blue tones at dawn)
- Subtle background audio layer (optional): city hum, distant traffic, building ambiance. Muted by default, toggle in settings.

### WHAT THIS IS NOT
- Not a game engine port (no Unity, no Unreal, no heavy 3D engine)
- Not a metaverse/virtual office (no avatars, no multiplayer, no VR)
- Not a visual novel (there IS real SaaS functionality beneath the experience)
- It IS a premium SaaS product wrapped in spatial, immersive UI. The data and automation are real. The experience around them is extraordinary.

---

## 7. MULTI-TENANCY MODEL

Every table gets a `userId` column. All queries filter by authenticated user. Supabase RLS policies enforce tenant isolation at the database level.

Each user gets:
- Their own OAuth tokens (Gmail, Calendar, Drive) stored securely
- Their own application/contact/follow-up data
- Their own AI agent configurations and activity logs
- Role-based access if they invite team members (Supabase organizations)

---

## 8. AGENT SYSTEM ARCHITECTURE

Corporate hierarchy — CEO orchestrates C-suite agents:

| Agent | Role | Tools |
|-------|------|-------|
| CEO | Orchestrator — dispatches departments, compiles briefings | Inngest event dispatch |
| CRO | Pipeline analysis, follow-up detection, conversion rates | queryApplications, updateStatus, suggestFollowUp, analyzeConversionRates, searchJobs, lookupAtsJob |
| CIO | Company research, tech stack analysis, skill gap detection | Web search, ATS lookup |
| COO | Deadline tracking, scheduling conflicts, process efficiency | Calendar queries, deadline checks |
| CMO | Cover letter drafting, email drafting | Document generation |
| CPO | Interview prep packet generation | Research + document generation |
| CNO | Network warmth tracking, relationship management | Contact analysis |
| CFO | Analytics, reporting, cost tracking | Snapshot queries, agent log analysis |

**Flow:** Bell ring → CEO dispatches departments in parallel via Inngest → Each agent runs with AI SDK generateText + tools → Results compile into briefing → Notifications route to user via SSE

---

## 9. PHASE ROADMAP (REVISED — Vertical Slices, Not Horizontal Layers)

**Why this changed:** Armaan's vision means UI and systems are inseparable. Building backend-first then skinning it would produce a flat SaaS app. Instead, we build **vertical slices** — each phase delivers a complete floor of the building with its environment, character, data layer, and functionality working together.

### Phase 0: The Shell (Foundation + World)
- [ ] Initialize Next.js 16 project (clean slate in existing repo)
- [ ] Set up Supabase Postgres + Drizzle schema (Postgres version of old schema + userId)
- [ ] Implement Supabase Auth (Google OAuth sign-in)
- [ ] RLS policies for multi-tenancy
- [ ] **Build the world shell:** lobby/login, elevator navigation with GSAP transitions, day/night cycle engine, custom cursor, skyline background layer
- [ ] **Build ONE complete floor as proof of concept:** The Penthouse (Dashboard) with NYC skyline, environmental lighting, glass surfaces, and real data from Supabase
- [ ] Port contracts system from old repo
- [ ] Deploy to Vercel

### Phase 1: The War Room (Applications + CRO Agent)
- [ ] Build Floor 7 environment (The War Room atmosphere)
- [ ] Port CRO agent + tools from old repo, adapt to Supabase
- [ ] CRO character in the room (approach + talk interaction)
- [ ] Application CRUD with real data
- [ ] Pipeline visualization in the room's environment

### Phase 2: Communications Floor (Gmail + Calendar)
- [ ] Per-user Gmail OAuth flow
- [ ] Email parsing engine (port from old repo)
- [ ] Google Calendar integration (port from old repo)
- [ ] Build The Situation Room (Floor 4) with COO character (Dylan Shorts)
- [ ] Follow-ups driven by parsed email data
- [ ] Inngest background sync

### Phase 3: Intelligence Floor (Research + Contacts)
- [ ] Build The Rolodex Lounge (Floor 6) with CNO character
- [ ] Contact management with warmth tracking
- [ ] CIO agent for company research
- [ ] Build research view with CIO character
- [ ] pgvector for company/job embeddings

### Phase 4: Creative Floors (Cover Letters + Interview Prep)
- [ ] Build The Writing Room (Floor 5) with CMO character
- [ ] AI cover letter generation
- [ ] Build The Briefing Room (Floor 3) with CPO character
- [ ] Interview prep packet generation
- [ ] Google Drive export

### Phase 5: The Observatory + C-Suite (Analytics + Full Agent Orchestra)
- [ ] Build The Observatory (Floor 2) with CFO character
- [ ] Analytics dashboards with real data
- [ ] Build The C-Suite (Floor 1) — the CEO's office
- [ ] Full CEO orchestration (bell ring → dispatch all departments → compile briefing)
- [ ] Daily briefing cron via Inngest
- [ ] Agent memory system

### Phase 6: Polish + Monetization
- [ ] Stripe subscription integration
- [ ] Free/Pro/Team tiers
- [ ] Performance optimization (lazy loading floors, asset compression)
- [ ] Sound design (optional ambient audio)
- [ ] Character upgrade to 3D if warranted
- [ ] Mobile responsive adaptation

---

## 10. SESSION LOG

### Session 1 (2026-03-18, earlier today)
- Resumed from previous multi-session project
- Completed visual QA of prototype (8 pages, dark + light mode screenshots)
- Built production bundle and deployed to Perplexity S3
- Armaan said UI is "5% of vision" — focus on real systems
- Researched production SaaS architecture (Next.js, Neon, Better Auth, Vercel)
- Discovered old GitHub repo has substantial codebase (~19,800 LOC)
- Wrote initial ARCHITECTURE.md and pushed to GitHub

### Session 2 (2026-03-18, continued)
- Armaan pushed back — wanted deeper research on Remotion, Supabase, Context7, Obsidian, etc.
- Deep research on all tools + Inngest, Upstash, Resend, Vercel AI SDK v6
- Revised stack: Supabase over Neon+BetterAuth (all-in-one platform)
- Armaan provided Supabase credentials + Resend API key via screenshot
- Saved all credentials to `.env.local`
- Armaan announced upgrade to Max plan and adding connectors

### Session 3 (2026-03-18, 4:11 PM AST — current session)
- Reloaded skills: website-building/webapp, design-foundations, coding-and-data
- Confirmed Supabase + Resend connectors now CONNECTED
- Cloned old repo to `/home/user/workspace/old-repo-audit/`
- Full code audit — read every critical file (contracts, agents, schema, auth, Gmail, calendar, tools, tests)
- Wrote AUDIT.md with fat-vs-meat verdicts (35% keep, 65% kill)
- **Armaan approved the audit** (~4:23 PM AST)
- Answered Armaan's questions:
  - New task not needed — connectors work in current session
  - New task would lose context — stay in this chat
  - Token limit exists but we're safe for ~100-150 exchanges
  - Model selection: let system decide (Max plan gives access to best models)
- Created PROJECT-CONTEXT.md (this file)
- Pushed GitHub-safe version to repo (no secrets — GitHub Push Protection blocked secrets)
- Stored retrieval instructions + identity + preferences in Perplexity memory
- Armaan directive: auto-update this file after every interaction, not just meaningful ones
- **4:31 PM AST:** Updated this file with comprehensive detail per Armaan's request. File now includes session bootstrap protocol, full identity section, connector status table, Vercel production URLs, GitHub push protection note, disconnected connector inventory, audit approval timestamp.

- **4:35 PM AST:** Armaan asked about model usage. Loaded model-catalog skill. Explained: main conversation is fixed model (Sonnet 4.6), subagents switch models per task (Opus for complex work, Codex for code, Sonnet for research, Gemini for budget scale, GPT 5.4 for math/logic). Max plan unlocks all models. Added Section 13 (model docs) to PROJECT-CONTEXT.md.
- **4:42 PM AST:** Armaan revealed the TRUE UI vision. This is not a dashboard with a theme — it's a spatial, immersive, game-like experience. Elevator navigation is literal (doors close, movement, doors open). Each floor has distinct atmosphere. NYC skyline with Central Park from the Penthouse. Day/night cycle tied to real time. Custom cursor. 3D depth with parallax. The world reacts to context. This fundamentally changes the UI approach from "themed SaaS" to "interactive spatial experience." Rewrote Section 6 entirely.
- **4:46 PM AST:** Armaan expanded the vision further — agents are CHARACTERS, not chatbots. The COO's name is Dylan Shorts. You approach him in his room and talk to him face-to-face. This is the "tip of the iceberg." Armaan also correctly identified that the old phase roadmap was wrong — building backend first then skinning it wouldn't work for this vision. Completely rewrote Section 6 with: character table (names, personalities, visual concepts), interaction model, three technical approaches for character rendering (2D illustrated recommended for V1), full world environmental spec (building metaphor, skyline layers, elevator animation timing, cursor states, ambient details). Rewrote Phase Roadmap (Section 9) to use vertical slices — each phase delivers a complete floor with environment + character + data + functionality together.

- **4:52 PM AST:** Armaan approved Option A (2D Illustrated Characters with Parallax Depth) for V1. Wants to switch to a fresh chat for Phase 0 build. Asked for: (1) full handoff preparation, (2) exact new-chat setup instructions, (3) vision expansion — new ideas beyond what he described. Agent researched immersive spatial UI patterns (Firewatch parallax, Web Audio API spatialization, Apple Liquid Glass concept, gamification progression systems, in-world notification design, Sonoric Landscapes) and added 10 new vision concepts to Section 6: in-world notifications, building progression/mastery system, morning briefing as ritual scene, spatial audio via Web Audio API, liquid glass surfaces (done right), character memory as visible history, weather-reactive mood, lobby as onboarding stage, contextual cursor states, easter eggs. Updated PROJECT-CONTEXT.md with all new content. Prepared handoff package: BOOTSTRAP-PROMPT.md with copy-paste instructions for new chat.

### CURRENT STATE
- **Where we are:** Vision fully expanded (10 new ideas added). Option A approved. Audit approved. Vertical-slice roadmap defined. Character system designed. Ready for Phase 0.
- **What's next:** Switch to fresh chat. Copy bootstrap prompt. Begin Phase 0 — the shell (Next.js + Supabase + world engine + The Penthouse as proof of concept).
- **Blockers:** None. Everything is green.

---

## 11. ARMAAN'S DIRECTIVES (Verbatim Quotes)

1. "in my projects we are analytical and not emotional. if its not good kill it. if it has some good bits keep it and cut the rest. think of it like the fat on the meat, cut the fat keep the best meat."
2. "the app built is the most basic version of what I want. It needs improvement in every aspect. The goal: full automation of internships."
3. "I am very unhappy with the current framework as it is right now."
4. "although the old github had things it needs to be greatly improved all the code etc. Think of it like this, its at a 1st graders level of code i need to bring it up to a masters degree level of code at the best university"
5. "I want this project to be scaleable, aka have other people log in and use this for their own accounts and i want to maybe sell this service down the road. I need real systems in place."
6. "Sources to use: web, vercel, gcal, google_drive, github_mcp_direct"
7. Wants deep research on tools/MCPs/connectors — criticized agent for surface-level work
8. "you need to figure out an effecient way that stores everything we have talked about and then when i move onto a new task, it can acsess that without using too many tokens etc keeping it light, and can move on with 100% memory and context. everytime something happens here that file or whatever is updated with perfect detail."
9. "make it so that theres a hook or whatever but everytime we talk the correct files are autoupdated with everything (api keys, senstitive info, and general stuff too). Not just meaningfully update it, even some less meaningful things."
10. "now you use the model you think is best for the use case"
11. Upgraded to Perplexity Max plan on 2026-03-18
12. "instead of a chatbot for every agent on each floor theres a person, lets say the COO's name is Dylan Shorts. You can approach him and speak to him etc. This is the tip of the iceberg for my vision. You need to create it."
13. Questioned the old phase roadmap — recognized that UI and systems need to be built together, not sequentially
14. Approved Option A for character rendering (2D Illustrated with Parallax Depth) for V1
15. Wants to switch to a fresh chat for the build phase — asked for full handoff preparation
16. Asked the agent to expand the vision with new ideas ("i dont think youvve added to the vision yet did you? no new ideas etc?")

---

## 12. KEY FILES IN WORKSPACE

| File | Purpose |
|------|---------|
| `/home/user/workspace/command-center/.env.local` | All credentials (Supabase, Resend, Vercel refs) |
| `/home/user/workspace/command-center/ARCHITECTURE.md` | Architecture doc (needs update to match this file's stack decisions) |
| `/home/user/workspace/command-center/AUDIT.md` | Full code audit with file-by-file keep/kill verdicts |
| `/home/user/workspace/command-center/PROJECT-CONTEXT.md` | THIS FILE — living context, auto-updated |
| `/home/user/workspace/old-repo-audit/` | Full clone of old GitHub repo for reference during port |
| `/home/user/workspace/skills/website-building/webapp/` | Loaded webapp skill (template, references, design guidance) |
| `/home/user/workspace/skills/design-foundations/` | Loaded design skill (color, typography, data viz) |
| `/home/user/workspace/skills/coding-and-data/` | Loaded coding skill (subagent routing, GitHub workflows) |

---

## 13. HOW MODELS WORK IN THIS SYSTEM

### The Main Conversation (You ↔ Me)
This conversation runs on a single model (currently Claude Sonnet 4.6). This does NOT change mid-conversation — it's fixed for the session.

### Subagents (Where Model Selection Matters)
When I delegate work — building a website, writing code, doing research, creating documents — I spawn **subagents**. Each subagent can use a different model. This is where the model switching happens. I pick the best model for each sub-task:

| Task Type | Model Used | Quality | Cost |
|-----------|-----------|---------|------|
| Website building, complex UI | Claude Opus 4.6 | ★★★★★ | $$$ |
| Document creation (PDF, DOCX, PPTX) | Claude Opus 4.6 | ★★★★★ | $$$ |
| General research, data processing | Claude Sonnet 4.6 | ★★★★ | $$ |
| Code generation, software engineering | GPT 5.3 Codex | ★★★★★ | $$$$ |
| Math, logic, structured reasoning | GPT 5.4 | ★★★★★ | $$ |
| Budget research at scale | Gemini 3.1 Pro (1M context) | ★★★ | $$ |

### Browser Tasks
When I automate a browser (filling forms, extracting data from websites), I can also switch models. Default is Claude Sonnet 4.6, fallback is GPT 5.4 if the first attempt fails.

### For This Project Specifically
The Phase 0 rebuild will use **coding subagents** (GPT 5.3 Codex or Claude Opus 4.6) for the heavy code work. Research tasks use Claude Sonnet 4.6 or Gemini 3.1 Pro. I pick automatically based on the task — Armaan's directive is to let the system decide.

### What Max Plan Changes
Max gives access to the strongest models (Opus 4.6, GPT 5.4, Codex). On the free/Pro plan, some of these would be unavailable or rate-limited. With Max, there are no model restrictions — the system uses whatever is best.

---

## 14. OPEN QUESTIONS / FUTURE DECISIONS

- Google OAuth app is in Testing mode (7-day refresh token expiry) — must publish to Production in Google Cloud Console before real users
- Production Vercel URL needs to be added to Google OAuth redirect URIs
- Custom domain for the app? (not discussed yet)
- Stripe pricing tiers? (not discussed yet)
- Which LLM provider for agents — Anthropic only, or multi-provider? (currently Anthropic via AI SDK)
- Upstash Redis setup — not yet configured, needed for rate limiting
- Weather API integration — which provider? (OpenWeatherMap free tier proposed for weather-reactive skyline)
- Sound design — source of ambient audio assets? (royalty-free, procedural, or commissioned)
- Character illustration style — who/what creates the 2D character art? (AI-generated illustrations, commissioned artist, or open-source game art)
- Building progression milestones — exact triggers for floor unlock/renovation stages
