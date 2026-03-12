# Internship Command Center

Your internship command center -- track applications, generate cover letters, manage follow-ups, and nail your internship search.

## Features

- **Application Tracker** -- Sortable, filterable table with card grid view, inline status/tier editing, and gradient tier badges
- **AI Cover Letters** -- Claude-powered generation with Tavily company research, voice matching, version history, and side-by-side comparison
- **Interview Prep** -- AI-generated company overviews, likely questions, talking points, and recent news
- **Company Comparison** -- Select 2-3 companies for structured comparison tables (culture, size, recent deals, fit)
- **Email Integration** -- Gmail API: view application-related emails, send follow-ups directly from the app
- **Calendar Events** -- Create Google Calendar events for interviews and follow-up reminders with one click
- **Contact Networking** -- Track contacts with relationship warmth (auto-decay), referral chains, and "Who do I know?" cards
- **Command Palette** -- Cmd+K for global search, navigation, and quick actions
- **PWA Support** -- Installable on mobile, works offline with network-first caching
- **Dashboard** -- Attention-first home screen: urgent items, status counters, email/calendar widgets, hero stats

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Server Components, Server Actions) |
| Database | [Turso](https://turso.tech/) (libSQL / SQLite) with [Drizzle ORM](https://orm.drizzle.team/) |
| Auth | [Auth.js v5](https://authjs.dev/) with Google OAuth (JWT strategy) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| AI | [Claude](https://docs.anthropic.com/en/docs/intro-to-claude) (Anthropic SDK) + [Tavily](https://tavily.com/) (company research) |
| Email | Gmail API (read + send) |
| Calendar | Google Calendar API (event creation) |
| Animation | [Motion](https://motion.dev/) (Framer Motion) + CSS transitions |
| Monitoring | [Sentry](https://sentry.io/) (error tracking) |
| Hosting | [Vercel](https://vercel.com/) |

## Screenshots

<!-- Add screenshots here -->
![Dashboard](docs/screenshots/dashboard.png)
![Tracker](docs/screenshots/tracker.png)
![Detail View](docs/screenshots/detail.png)
![Cover Letter](docs/screenshots/cover-letter.png)

## Getting Started

### Prerequisites

- Node.js 18+
- A [Turso](https://turso.tech/) account (free tier works)
- Google Cloud project with OAuth 2.0 credentials
- [Anthropic API key](https://console.anthropic.com/)
- [Tavily API key](https://tavily.com/)

### Setup

```bash
# Clone the repository
git clone https://github.com/armaansarora/internship-command-center.git
cd internship-command-center

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Configure your .env.local with your API keys and credentials
# See .env.example for descriptions of each variable

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

See [`.env.example`](.env.example) for the full list with descriptions. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `TURSO_DATABASE_URL` | Yes | `file:./data/internship.db` for local, `libsql://...` for production |
| `AUTH_SECRET` | Yes | Generate with `npx auth secret` |
| `AUTH_GOOGLE_ID` | Yes | Google Cloud OAuth 2.0 Client ID |
| `AUTH_GOOGLE_SECRET` | Yes | Google Cloud OAuth 2.0 Client Secret |
| `ANTHROPIC_API_KEY` | Yes | Claude API key for AI features |
| `TAVILY_API_KEY` | Yes | Tavily API key for company research |
| `ALLOWED_EMAILS` | Yes | Comma-separated whitelist of allowed sign-in emails |

## Architecture

```
src/
  app/           # Next.js App Router pages and layouts
  components/    # React components (ui/, layout/, feature-specific)
  lib/           # Data layer, server actions, utilities
    actions/     # Server actions (mutations)
    db/          # Drizzle schema and database client
    google.ts    # Gmail + Calendar API client factory
  auth.ts        # Auth.js v5 configuration
```

- **Server Components** for data fetching (no client-side waterfalls)
- **Server Actions** for all mutations (type-safe, no API routes needed)
- **Turso Cloud DB** for edge-compatible SQLite with global replication
- **JWT Strategy** for auth -- OAuth tokens stored in encrypted cookie, no session table needed
- **Promise.all** parallelization for dashboard queries

## Project Documentation

See the [`.planning/`](.planning/) directory for full project documentation, including:

- Architecture decisions and research
- Phase-by-phase execution plans and summaries
- Requirements traceability
- Roadmap and state tracking

## License

MIT
