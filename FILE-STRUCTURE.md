# FILE STRUCTURE — The Tower (Next.js 16 Project)
## Target architecture for Phase 0 init

```
internship-command-center/
├── .github/
│   └── workflows/
│       └── ci.yml                    # Lint → Typecheck → Build → Deploy
│
├── public/
│   ├── fonts/                        # Self-hosted Playfair Display, Satoshi, JetBrains Mono
│   └── favicon.ico
│
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout: fonts, providers, elevator shell
│   │   ├── page.tsx                  # Redirects to /penthouse or /lobby based on auth
│   │   ├── globals.css               # Design tokens, base styles, day/night CSS vars
│   │   ├── lobby/
│   │   │   └── page.tsx              # Login — the building entrance
│   │   ├── penthouse/
│   │   │   └── page.tsx              # Dashboard — Floor PH
│   │   ├── war-room/
│   │   │   └── page.tsx              # Applications — Floor 7 (Phase 1)
│   │   ├── situation-room/
│   │   │   └── page.tsx              # Follow-ups/Calendar — Floor 4 (Phase 2)
│   │   ├── rolodex-lounge/
│   │   │   └── page.tsx              # Contacts — Floor 6 (Phase 3)
│   │   ├── writing-room/
│   │   │   └── page.tsx              # Cover Letters — Floor 5 (Phase 4)
│   │   ├── briefing-room/
│   │   │   └── page.tsx              # Interview Prep — Floor 3 (Phase 4)
│   │   ├── observatory/
│   │   │   └── page.tsx              # Analytics — Floor 2 (Phase 5)
│   │   ├── c-suite/
│   │   │   └── page.tsx              # CEO's Office — Floor 1 (Phase 5)
│   │   └── api/
│   │       ├── auth/
│   │       │   └── callback/route.ts # Supabase OAuth callback
│   │       ├── agents/
│   │       │   ├── [agent]/route.ts  # POST to any agent (CEO, CRO, etc.)
│   │       │   └── bell/route.ts     # "Ring the bell" — CEO dispatch all
│   │       ├── inngest/route.ts      # Inngest webhook handler
│   │       └── webhooks/
│   │           └── stripe/route.ts   # Stripe webhook handler
│   │
│   ├── components/
│   │   ├── world/                    # The spatial experience layer
│   │   │   ├── Elevator.tsx          # Elevator navigation + GSAP transition
│   │   │   ├── ElevatorPanel.tsx     # Floor buttons, indicator display
│   │   │   ├── Skyline.tsx           # Procedural NYC skyline (SVG layers)
│   │   │   ├── DayNightProvider.tsx  # Context provider for time-of-day state
│   │   │   ├── FloorShell.tsx        # Wrapper: window frame + skyline + room content
│   │   │   ├── CustomCursor.tsx      # Custom cursor with contextual states
│   │   │   └── WindowView.tsx        # Skyline view adjusted per floor height
│   │   │
│   │   ├── characters/               # Character interaction system
│   │   │   ├── CharacterSprite.tsx   # 2D character with parallax + state animations
│   │   │   ├── CharacterPanel.tsx    # Face-to-face dialogue UI (not chatbot)
│   │   │   ├── ConversationStream.tsx # AI response streaming display
│   │   │   └── CharacterProvider.tsx # Context for character state management
│   │   │
│   │   ├── rooms/                    # Room-specific environment components
│   │   │   ├── PenthouseRoom.tsx     # Penthouse environment (glass, gold, skyline)
│   │   │   ├── WarRoom.tsx           # Dark tactical room (Phase 1)
│   │   │   ├── SituationRoom.tsx     # Mission control room (Phase 2)
│   │   │   ├── RolodexLounge.tsx     # Warm networking space (Phase 3)
│   │   │   ├── WritingRoom.tsx       # Library-like creative space (Phase 4)
│   │   │   ├── BriefingRoom.tsx      # Prep space with whiteboards (Phase 4)
│   │   │   ├── ObservatoryRoom.tsx   # Analytical panoramic room (Phase 5)
│   │   │   ├── CSuiteRoom.tsx        # Executive boardroom (Phase 5)
│   │   │   └── LobbyRoom.tsx         # Construction → polished entrance
│   │   │
│   │   ├── ui/                       # Reusable UI primitives
│   │   │   ├── GlassCard.tsx         # Frosted glass surface component
│   │   │   ├── GoldButton.tsx        # Primary CTA with gold accent
│   │   │   ├── DataValue.tsx         # Stat display with JetBrains Mono
│   │   │   ├── PipelineBadge.tsx     # Status badges for application pipeline
│   │   │   └── InWorldNotification.tsx # Spatial notification animations
│   │   │
│   │   └── data/                     # Data display components
│   │       ├── ApplicationCard.tsx
│   │       ├── PipelineKanban.tsx
│   │       ├── ContactCard.tsx
│   │       └── AnalyticsChart.tsx
│   │
│   ├── lib/                          # Shared utilities
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser client (createBrowserClient)
│   │   │   ├── server.ts             # Server client (createServerClient)
│   │   │   ├── middleware.ts          # Session update logic for middleware
│   │   │   └── admin.ts              # Service role client (for Inngest/background)
│   │   ├── agents/                   # Ported agent system
│   │   │   ├── registry.ts           # Agent registry: name → config + tools
│   │   │   ├── ceo.ts                # CEO orchestrator
│   │   │   ├── cro.ts                # CRO pipeline agent
│   │   │   ├── cio.ts                # CIO research agent
│   │   │   ├── coo.ts                # COO scheduling agent
│   │   │   ├── cmo.ts                # CMO writing agent
│   │   │   ├── cpo.ts                # CPO prep agent
│   │   │   ├── cno.ts                # CNO networking agent
│   │   │   ├── cfo.ts                # CFO analytics agent
│   │   │   └── tools/                # Shared agent tools
│   │   │       ├── applications.ts   # queryApplications, updateStatus, etc.
│   │   │       ├── contacts.ts       # queryContacts, updateWarmth, etc.
│   │   │       ├── emails.ts         # parseEmail, classifyEmail, etc.
│   │   │       ├── calendar.ts       # getEvents, checkConflicts, etc.
│   │   │       ├── documents.ts      # generateCoverLetter, generatePrepPacket
│   │   │       └── research.ts       # companyLookup, newsSearch, etc.
│   │   ├── gmail.ts                  # Ported Gmail integration (304 LOC)
│   │   ├── calendar.ts               # Ported Calendar integration (~400 LOC)
│   │   ├── contracts/                # Ported contracts system (1,015 LOC)
│   │   ├── day-night.ts              # Time-of-day calculation utilities
│   │   └── utils.ts                  # Shared utilities (cn, formatDate, etc.)
│   │
│   ├── inngest/
│   │   ├── client.ts                 # Inngest client with realtime middleware
│   │   ├── functions/
│   │   │   ├── sync-inbox.ts         # Cron: scan Gmail every 30min
│   │   │   ├── sync-calendar.ts      # Cron: sync Calendar every hour
│   │   │   ├── daily-briefing.ts     # Cron: compile CEO briefing at 8am
│   │   │   ├── check-stale-apps.ts   # Cron: flag stale applications daily
│   │   │   ├── dispatch-agents.ts    # Event: "ring the bell" → fan-out to all agents
│   │   │   └── process-email.ts      # Event: classify and route a single email
│   │   └── events.ts                 # Typed event definitions
│   │
│   ├── db/
│   │   ├── schema.ts                 # Drizzle schema (see SCHEMA-DRAFT.md)
│   │   ├── index.ts                  # Drizzle client initialization
│   │   └── migrations/               # Generated by drizzle-kit
│   │
│   ├── hooks/                        # React hooks (ported ~300 LOC)
│   │   ├── useFloor.ts               # Current floor state + navigation
│   │   ├── useDayNight.ts            # Subscribe to time-of-day context
│   │   ├── useCharacter.ts           # Character interaction state
│   │   ├── useParallax.ts            # Mouse-based parallax offset
│   │   └── useCursor.ts              # Cursor state management
│   │
│   └── middleware.ts                  # Auth check + session refresh (Supabase SSR)
│
├── drizzle.config.ts                 # Drizzle Kit config → Supabase connection
├── next.config.ts                    # Next.js config
├── tailwind.config.ts                # Tailwind v3 config (gold accent, custom tokens)
├── tsconfig.json
├── package.json
├── .env.local                        # Credentials (never committed)
├── .gitignore
│
├── docs/                             # Project documentation (committed)
│   ├── MASTER-PLAN.md
│   ├── VISION-SPEC.md
│   ├── TECH-BRIEF.md
│   ├── SCHEMA-DRAFT.md
│   ├── CHARACTER-PROMPTS.md
│   ├── FILE-STRUCTURE.md             # This file
│   ├── AUDIT.md
│   └── ARCHITECTURE.md
│
└── PROJECT-CONTEXT.md                # Operational context (auto-updated)
```

---

## Notes

- **Phase 0 builds:** `src/app/` (lobby + penthouse), `src/components/world/`, `src/lib/supabase/`, `src/db/`, `src/middleware.ts`, and the contracts port
- **Floors are added incrementally:** Empty page stubs for future floors, filled in per phase
- **`docs/` directory:** All planning docs moved here in the repo to keep root clean
- **`src/lib/agents/`:** Each agent is a single file with system prompt + tool definitions. Registry maps agent name to config.
- **Inngest functions live together:** All background jobs in `src/inngest/functions/` with typed events
