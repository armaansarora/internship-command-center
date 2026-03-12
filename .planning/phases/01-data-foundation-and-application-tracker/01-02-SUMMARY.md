---
phase: 01-data-foundation-and-application-tracker
plan: 02
status: complete
started: 2026-03-06
completed: 2026-03-06
commit: bc400b7
---

## One-Liner

Built dark-mode UI shell with sidebar navigation and a full-featured application tracker table with TanStack sorting, filtering, search, and tier/status badges.

## What Was Built

- Root layout (`src/app/layout.tsx`): Dark mode default (zinc-950 background), Inter font, ThemeProvider wrapper forcing dark theme
- ThemeProvider (`src/components/layout/theme-provider.tsx`): next-themes integration for dark mode persistence
- Sidebar navigation (`src/components/layout/sidebar.tsx`): 4 navigation items -- Overview (/), Applications (/applications), Cover Letter Lab (/cover-letters), Follow-Ups (/follow-ups)
- Home page (`src/app/page.tsx`): Redirects to /applications as the primary view
- Placeholder pages for Cover Letter Lab (`src/app/cover-letters/page.tsx`) and Follow-Ups (`src/app/follow-ups/page.tsx`)
- Application tracker page (`src/app/applications/page.tsx`): Server Component querying all applications from SQLite
- AppTable (`src/components/applications/app-table.tsx`): TanStack React Table with column sorting, client-side filtering, pagination controls
- Column definitions (`src/components/applications/columns.tsx`): Company (clickable link to detail), Role, Tier (sortable), Status (sortable), Applied date (sortable, formatted with date-fns), Platform, Sector
- TierBadge (`src/components/applications/tier-badge.tsx`): Color-coded badges -- Gold for T1, Blue for T2, Violet for T3, Gray for T4
- StatusBadge (`src/components/applications/status-badge.tsx`): Color-coded badges -- Emerald for active/in_progress, Amber for under_review, Fuchsia for interview, Red for rejected, Gray for applied
- AppFilters (`src/components/applications/app-filters.tsx`): Dropdown filters for tier, status, sector, and platform columns
- SearchInput (`src/components/applications/search-input.tsx`): Text search filtering by company name and role
- Responsive layout with horizontal scroll on mobile viewports
- shadcn/ui primitives: badge, button, card, command, dialog, dropdown-menu, input, label, select, separator, sheet, sidebar, skeleton, table, textarea, tooltip

## Key Decisions

- **Force dark mode**: Used next-themes with `forcedTheme="dark"` rather than system preference detection, matching the "command center" aesthetic.
- **TanStack React Table**: Chose over alternatives for headless, type-safe table primitives with built-in sorting/filtering state management.
- **Server Component data fetching**: Application list page is a Server Component that queries the database directly, avoiding API routes for read-heavy pages.
- **Client-side filtering**: Filters and search run client-side on the full dataset (71 rows) rather than server-side queries, keeping the UX snappy without round-trips.

## Deviations from Plan

All three Phase 1 plans (01-01, 01-02, 01-03) were executed together and landed in a single commit (bc400b7) rather than individual per-plan commits. No functional deviations from the planned scope.

## Test Results

No UI-specific tests added in this plan. Core data layer tests from Plan 01-01 remain passing and cover the data feeding this UI.

## Files Modified

- `internship-command-center/src/app/layout.tsx` -- root layout with dark mode and sidebar
- `internship-command-center/src/app/page.tsx` -- home redirect to /applications
- `internship-command-center/src/app/globals.css` -- global styles and Tailwind v4 config
- `internship-command-center/src/app/applications/page.tsx` -- application tracker page
- `internship-command-center/src/app/cover-letters/page.tsx` -- placeholder page
- `internship-command-center/src/app/follow-ups/page.tsx` -- placeholder page
- `internship-command-center/src/components/layout/sidebar.tsx` -- sidebar navigation
- `internship-command-center/src/components/layout/theme-provider.tsx` -- dark mode provider
- `internship-command-center/src/components/applications/app-table.tsx` -- TanStack table component
- `internship-command-center/src/components/applications/columns.tsx` -- column definitions
- `internship-command-center/src/components/applications/tier-badge.tsx` -- tier color badges
- `internship-command-center/src/components/applications/status-badge.tsx` -- status color badges
- `internship-command-center/src/components/applications/app-filters.tsx` -- filter dropdowns
- `internship-command-center/src/components/applications/search-input.tsx` -- search input
- `internship-command-center/src/components/ui/*.tsx` -- 16 shadcn/ui primitives
- `internship-command-center/src/lib/utils.ts` -- cn() classname utility
- `internship-command-center/src/hooks/use-mobile.ts` -- responsive breakpoint hook
- `internship-command-center/components.json` -- shadcn/ui configuration
