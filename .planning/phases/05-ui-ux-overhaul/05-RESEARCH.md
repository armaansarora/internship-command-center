# Phase 5: UI/UX Overhaul - Research

**Researched:** 2026-03-10
**Domain:** Frontend animation, toast notifications, command palettes, responsive mobile UI
**Confidence:** HIGH

## Summary

Phase 5 transforms the functional Internship Command Center into a premium-feeling application. The codebase is well-structured for this work: all pages are server components that fetch data directly, mutations use server actions returning `{ success, error }` objects, the sidebar is a simple client component, and shadcn/ui provides the component foundation (including a pre-installed `command.tsx` wrapping cmdk and a `skeleton.tsx` component).

The core challenge is integrating Framer Motion page transitions with Next.js 16's App Router, which requires a "FrozenRouter" pattern to prevent premature unmounting during exit animations. The rest of the work -- toast notifications, command palette, loading skeletons, empty states, mobile navigation -- follows well-established patterns with libraries already in the project or their ecosystem.

**Primary recommendation:** Install `motion` (the renamed framer-motion) and `sonner`. Wire Framer Motion page transitions via a FrozenRouter + AnimatePresence pattern in the layout. Add `<Toaster />` to root layout and wrap all server action calls with toast feedback. The cmdk Command component is already installed via shadcn -- wire it to a global keyboard listener. Use Next.js `loading.tsx` files with Skeleton components for loading states, and add a mobile bottom tab bar that shows `md:hidden` while the sidebar shows `hidden md:flex`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-01 | Framer Motion page transitions between routes (AnimatePresence + FrozenRouter pattern) | FrozenRouter + LayoutTransition pattern documented with full code. Uses `LayoutRouterContext` from Next.js internals + `useSelectedLayoutSegment` as key for AnimatePresence. Install `motion` package. |
| UX-02 | Framer Motion list animations -- stagger effects on application list, attention items | Variants with `staggerChildren` in parent transition. Container variant + item variant pattern. Works with existing map-based rendering. |
| UX-03 | Toast notifications (sonner) for all user mutations | Install sonner via `shadcn add sonner`. Place `<Toaster />` in root layout. Wrap server action calls in client components with `toast.success()`/`toast.error()` based on return value. |
| UX-04 | Command palette (cmdk) wired up with Cmd+K | shadcn `command.tsx` already installed with `CommandDialog`. Create a `CommandPalette` client component with keyboard listener (`useEffect` for Cmd+K), populate with nav items and application search. |
| UX-05 | Loading skeletons on all data-fetching pages | Use Next.js `loading.tsx` convention (auto-wraps page in Suspense). Create skeleton compositions matching each page layout using existing `<Skeleton />` component. |
| UX-06 | Empty states with CTAs for every page | Pure UI work. Add conditional rendering when data arrays are empty. Include icon, message, and action button for each page. |
| UX-07 | Inline table editing -- update status and tier directly in tracker table | Add dropdown select cells in the TanStack React Table columns for status and tier. Use `e.stopPropagation()` to prevent row click navigation. Call server actions directly from cell components. |
| UX-08 | Mobile-responsive bottom tab bar replacing sidebar on small screens | Create `BottomTabBar` component with `md:hidden` (sidebar already has `hidden md:flex`). Fixed bottom positioning, same nav items as sidebar. |
| UX-09 | Micro-interactions: hover effects, press states, gradient tier badges | Use `motion.div` with `whileHover` and `whileTap` props. Upgrade tier badges to use gradient backgrounds via Tailwind classes. |
| UX-10 | Swipe actions on mobile cards | Use `motion.div` with `drag="x"` and `onDragEnd` to detect swipe threshold. Implement for follow-up cards (dismiss/complete) and potentially status changes. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| motion | ^12.35 | Page transitions, list animations, gestures, micro-interactions | Renamed from framer-motion. React 19 compatible. Provides AnimatePresence for exit animations, variants for orchestrated lists, drag for swipe gestures. The only React animation library that handles exit animations properly. |
| sonner | ^2.0 | Toast notifications | shadcn-compatible, accessible, minimal bundle. Opinionated defaults that look great with dark themes. `toast.promise()` for async operations. |
| cmdk | ^1.1.1 | Command palette | Already installed. shadcn `command.tsx` already wraps it. Headless, accessible, fast fuzzy search. Powers Linear/Raycast-style command palettes. |

### Already Installed (use directly)
| Library | Version | Purpose | How It's Used |
|---------|---------|---------|---------------|
| @tanstack/react-table | ^8.21 | Table with inline editing | Already powers `app-table.tsx`. Add editable cell renderers for status/tier columns. |
| lucide-react | ^0.577 | Icons for empty states, mobile nav | Already used throughout. Use for empty state illustrations and bottom tab bar icons. |
| shadcn/ui skeleton | installed | Loading skeleton primitives | `<Skeleton />` component already exists at `components/ui/skeleton.tsx`. |
| shadcn/ui command | installed | Command palette primitives | Full `CommandDialog`, `CommandInput`, `CommandList`, `CommandItem`, `CommandGroup` already at `components/ui/command.tsx`. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| motion (Framer Motion) | Next.js View Transitions API (experimental) | View Transitions is native and lighter, but still experimental in Next.js 16 and cannot do orchestrated list stagger or gesture animations. Requirements specify Framer Motion. |
| sonner | shadcn toast (deprecated) | shadcn officially deprecated their toast component in favor of sonner. |
| Custom swipe | react-swipeable | react-swipeable is lighter but motion already provides drag gestures -- no need for a second library. |

**Installation:**
```bash
cd internship-command-center
npm install motion sonner
npx shadcn@latest add sonner
```

Note: `npx shadcn@latest add sonner` will add the `<Toaster />` wrapper component at `components/ui/sonner.tsx` that applies theme-aware styling. The `motion` package replaces `framer-motion` with identical API but `motion/react` import path.

## Architecture Patterns

### Recommended Project Structure (new/modified files)
```
src/
├── app/
│   ├── layout.tsx              # MODIFIED: Add <Toaster />, wrap children in LayoutTransition
│   ├── loading.tsx             # NEW: Dashboard skeleton
│   ├── applications/
│   │   ├── loading.tsx         # NEW: Tracker table skeleton
│   │   └── [id]/
│   │       └── loading.tsx     # NEW: Detail page skeleton
│   ├── cover-letters/
│   │   └── loading.tsx         # NEW: Cover letter page skeleton
│   └── follow-ups/
│       └── loading.tsx         # NEW: Follow-ups page skeleton
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx         # MODIFIED: Already hidden on mobile (hidden md:flex)
│   │   ├── bottom-tab-bar.tsx  # NEW: Mobile bottom navigation
│   │   ├── layout-transition.tsx  # NEW: FrozenRouter + AnimatePresence wrapper
│   │   └── command-palette.tsx # NEW: Global command palette with Cmd+K
│   ├── ui/
│   │   └── sonner.tsx          # NEW (via shadcn add): Toaster wrapper
│   ├── applications/
│   │   ├── columns.tsx         # MODIFIED: Add inline editable cells for status/tier
│   │   ├── status-badge.tsx    # MODIFIED: Add gradient/hover micro-interactions
│   │   └── tier-badge.tsx      # MODIFIED: Add gradient badge styling
│   ├── shared/
│   │   ├── empty-state.tsx     # NEW: Reusable empty state component
│   │   ├── animated-list.tsx   # NEW: Motion list wrapper with stagger
│   │   └── swipeable-card.tsx  # NEW: Swipe gesture wrapper for mobile cards
│   └── follow-ups/
│       └── follow-up-card.tsx  # MODIFIED: Wrap in swipeable for mobile
└── hooks/
    └── use-mobile.ts           # EXISTS: Already detects mobile breakpoint
```

### Pattern 1: FrozenRouter + LayoutTransition (Page Transitions)

**What:** Prevents Next.js App Router from unmounting the exiting page before Framer Motion completes its exit animation.
**When to use:** Wrapping `{children}` in the root layout to animate between routes.
**Example:**

```typescript
// src/components/layout/layout-transition.tsx
'use client';

import { useContext, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LayoutRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useSelectedLayoutSegment } from 'next/navigation';

function usePreviousValue<T>(value: T): T | undefined {
  const prevValue = useRef<T>();
  useEffect(() => {
    prevValue.current = value;
    return () => { prevValue.current = undefined; };
  });
  return prevValue.current;
}

function FrozenRouter({ children }: { children: React.ReactNode }) {
  const context = useContext(LayoutRouterContext);
  const prevContext = usePreviousValue(context) || null;
  const segment = useSelectedLayoutSegment();
  const prevSegment = usePreviousValue(segment);
  const changed = segment !== prevSegment && segment !== undefined && prevSegment !== undefined;

  return (
    <LayoutRouterContext.Provider value={changed ? prevContext : context}>
      {children}
    </LayoutRouterContext.Provider>
  );
}

export function LayoutTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const segment = useSelectedLayoutSegment();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={segment}
        className={className}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        <FrozenRouter>{children}</FrozenRouter>
      </motion.div>
    </AnimatePresence>
  );
}
```

**Critical note:** `LayoutRouterContext` is imported from `next/dist/shared/lib/app-router-context.shared-runtime`. This is a Next.js internal -- it is NOT a public API and could break on major upgrades. This is the standard community workaround until Next.js provides official page transition support. Document this dependency clearly.

### Pattern 2: Toast Wrapper for Server Actions

**What:** Wraps server action calls with toast feedback on success/failure.
**When to use:** Every client component that calls a server action.
**Example:**

```typescript
// Pattern: Wrap server action calls with toast
import { toast } from 'sonner';

async function handleSubmit(formData: FormData) {
  const result = await createApplication(formData);
  if (result.error) {
    toast.error('Failed to add application', { description: result.error });
  } else {
    toast.success('Application added');
    setOpen(false);
    router.refresh();
  }
}
```

**Key insight:** All existing server actions already return `{ success?, error? }` objects. No server-side changes needed -- just add toast calls in the existing client-side handlers.

### Pattern 3: Staggered List Animation

**What:** Items in a list animate in one after another.
**When to use:** Application list items, dashboard action items, follow-up cards.
**Example:**

```typescript
// src/components/shared/animated-list.tsx
'use client';

import { motion } from 'motion/react';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export function AnimatedList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

export function AnimatedItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
```

### Pattern 4: Swipeable Card (Mobile Gestures)

**What:** Cards that respond to horizontal swipe gestures to reveal actions.
**When to use:** Follow-up cards on mobile (swipe to dismiss/complete), application cards.
**Example:**

```typescript
'use client';

import { motion, useMotionValue, useTransform } from 'motion/react';

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
}: {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5]);

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: -120, right: 120 }}
      dragElastic={0.1}
      style={{ x, opacity }}
      onDragEnd={(_, info) => {
        if (info.offset.x < -80 && onSwipeLeft) onSwipeLeft();
        if (info.offset.x > 80 && onSwipeRight) onSwipeRight();
      }}
    >
      {children}
    </motion.div>
  );
}
```

### Pattern 5: Loading Skeletons via loading.tsx

**What:** Next.js auto-wraps page.tsx in Suspense when loading.tsx exists in the same folder.
**When to use:** Every route that fetches data server-side.
**Example:**

```typescript
// src/app/applications/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="rounded-md border border-border">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-border">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Key insight:** Skeleton layouts MUST match the actual page layout dimensions to prevent layout shift. Each loading.tsx should mirror the page structure (same padding, max-width, grid layout).

### Anti-Patterns to Avoid

- **Animating server components directly:** Framer Motion components must be client components. Wrap server-fetched data display in a client animation wrapper, don't try to make the page component itself a client component (breaks data fetching).
- **Using `mode="sync"` for page transitions:** Use `mode="wait"` so the exit animation completes before the enter animation starts. `sync` causes both to run simultaneously, which looks janky for page transitions.
- **Spinner fallbacks instead of skeletons:** Requirements explicitly say "loading skeletons (not blank screens or spinners)". Always use Skeleton components that match the page layout.
- **Toast from server actions directly:** `toast()` only works on the client. Never try to call it from a `'use server'` function. Always call it from the client callback after the server action returns.
- **Inline event handlers preventing row navigation:** When adding inline editable cells, always `e.stopPropagation()` on the cell's click/change events, or the table row's `onClick` will fire and navigate away.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast system with portals | sonner `<Toaster />` + `toast()` | Handles stacking, auto-dismiss, swipe-to-close, accessible announcements, dark theme |
| Command palette search | Custom fuzzy search | cmdk's built-in search | Battle-tested fuzzy matching, keyboard navigation, grouping, accessible |
| Page transition state management | Manual route change detection | FrozenRouter + AnimatePresence with `useSelectedLayoutSegment` | Context freezing prevents premature unmount -- extremely hard to get right manually |
| Swipe gesture physics | Manual touch event listeners | motion's `drag` prop with `dragConstraints` and `dragElastic` | Handles velocity, momentum, snap-back, and gesture interruption automatically |
| Mobile detection | Custom media query hook | Existing `use-mobile.ts` hook | Already in the project at 768px breakpoint -- reuse it |

**Key insight:** The animation and gesture work in this phase is exactly the kind of thing that seems simple but has massive edge cases (gesture interruption, SSR hydration, layout shift, exit animation timing). Use the libraries.

## Common Pitfalls

### Pitfall 1: LayoutRouterContext Internal Import Breaking
**What goes wrong:** `next/dist/shared/lib/app-router-context.shared-runtime` is not a public API. Next.js updates could change the path.
**Why it happens:** Next.js doesn't officially support page transition animations yet.
**How to avoid:** Pin the Next.js version (already at 16.1.6). Add a comment in the code documenting this dependency. Consider wrapping the import in a try/catch and falling back to no-animation. Monitor Next.js releases for official View Transitions support (experimental flag already exists: `viewTransition: true` in next.config.js).
**Warning signs:** Build failures after Next.js upgrade mentioning missing module.

### Pitfall 2: Hydration Mismatch with AnimatePresence
**What goes wrong:** Server renders content without motion wrappers, client adds them -- hydration error.
**Why it happens:** Framer Motion components are client-only but wrapped around server-rendered content.
**How to avoid:** Set `initial={false}` on AnimatePresence to skip the initial animation on first render. This prevents the component from trying to animate the already-server-rendered content.
**Warning signs:** React hydration warnings in console.

### Pitfall 3: Loading Skeletons Causing Layout Shift
**What goes wrong:** Skeleton placeholders don't match final content dimensions, causing visible shift when data loads.
**Why it happens:** Skeleton layout was designed without measuring the real page.
**How to avoid:** Mirror exact page structure in loading.tsx -- same padding, max-width, grid columns, approximate heights. Test by throttling network in dev tools.
**Warning signs:** Visible content "jumping" when page loads.

### Pitfall 4: Toast Flooding on Rapid Mutations
**What goes wrong:** User clicks rapidly (e.g., changing status multiple times), toasts stack up.
**Why it happens:** Every mutation fires a toast without deduplication.
**How to avoid:** Use `toast.dismiss()` before showing a new toast for the same action, or use `toast()` with an explicit `id` parameter to replace the previous toast.
**Warning signs:** 5+ toasts stacked on screen after rapid clicks.

### Pitfall 5: Command Palette Not Finding Applications
**What goes wrong:** Cmd+K palette shows navigation but search doesn't find applications.
**Why it happens:** Application data needs to be loaded client-side for the palette to search. Server-side data isn't available in a global client component.
**How to avoid:** Fetch application list via a server action (`getApplicationsForAutocomplete` already exists in `cover-letter-actions.ts`) when the palette opens, with local caching. Use `useSWR` or `useEffect` to load once.
**Warning signs:** Empty search results when typing company/role names.

### Pitfall 6: Mobile Bottom Tab Bar Obscuring Content
**What goes wrong:** Fixed bottom navigation covers page content at the bottom.
**Why it happens:** Fixed positioning takes element out of flow.
**How to avoid:** Add `pb-16 md:pb-0` to the main content area when on mobile. The `useIsMobile` hook already exists.
**Warning signs:** Last items in lists not visible on mobile.

### Pitfall 7: Swipe Gestures Conflicting with Scroll
**What goes wrong:** Horizontal swipe on cards interferes with vertical scrolling on mobile.
**Why it happens:** Touch events captured by drag handler prevent default scroll.
**How to avoid:** Set `dragDirectionLock` on motion.div, which locks to one axis once the gesture direction is determined. Only enable `drag="x"` (not `drag={true}`).
**Warning signs:** Page won't scroll when touching a swipeable card.

## Code Examples

### Command Palette with Application Search

```typescript
// src/components/layout/command-palette.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { LayoutDashboard, Briefcase, FileText, Bell, Search } from 'lucide-react';
import { getApplicationsForAutocomplete } from '@/lib/cover-letter-actions';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [apps, setApps] = useState<{ id: number; company: string; role: string }[]>([]);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (open && apps.length === 0) {
      getApplicationsForAutocomplete().then(setApps);
    }
  }, [open, apps.length]);

  const navigate = useCallback((path: string) => {
    setOpen(false);
    router.push(path);
  }, [router]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search applications, navigate..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate('/')}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Overview
          </CommandItem>
          <CommandItem onSelect={() => navigate('/applications')}>
            <Briefcase className="mr-2 h-4 w-4" />
            Applications
          </CommandItem>
          <CommandItem onSelect={() => navigate('/cover-letters')}>
            <FileText className="mr-2 h-4 w-4" />
            Cover Letter Lab
          </CommandItem>
          <CommandItem onSelect={() => navigate('/follow-ups')}>
            <Bell className="mr-2 h-4 w-4" />
            Follow-Ups
          </CommandItem>
        </CommandGroup>
        {apps.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Applications">
              {apps.map((app) => (
                <CommandItem
                  key={app.id}
                  onSelect={() => navigate(`/applications/${app.id}`)}
                >
                  <Search className="mr-2 h-4 w-4" />
                  {app.company} - {app.role}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
```

### Reusable Empty State

```typescript
// src/components/shared/empty-state.tsx
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {action && (
        <Button size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

### Inline Table Cell Editor

```typescript
// Pattern for inline editable cells in columns.tsx
// Source: TanStack React Table cell rendering API
{
  accessorKey: 'status',
  header: 'Status',
  cell: ({ row }) => (
    <Select
      value={row.original.status}
      onValueChange={async (value) => {
        const formData = new FormData();
        formData.set('id', String(row.original.id));
        formData.set('status', value);
        const result = await updateApplicationStatus(formData);
        if (result.error) toast.error(result.error);
        else toast.success(`Status updated to ${STATUS_LABELS[value as Status]}`);
      }}
    >
      <SelectTrigger
        className="h-7 w-[120px] border-none bg-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <StatusBadge status={row.original.status as Status} />
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
}
```

### Mobile Bottom Tab Bar

```typescript
// src/components/layout/bottom-tab-bar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Briefcase, FileText, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/applications', label: 'Apps', icon: Briefcase },
  { href: '/cover-letters', label: 'Letters', icon: FileText },
  { href: '/follow-ups', label: 'Follow-Ups', icon: Bell },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` package | `motion` package (import from `motion/react`) | Late 2024 | Same API, new package name. `framer-motion` still maintained but `motion` is the future. |
| CSS Modules for animations | Framer Motion + Tailwind | 2023+ | CSS can't do exit animations or gesture-driven animations. Framer Motion is standard for React. |
| Custom toast implementations | sonner (shadcn-recommended) | 2024 | shadcn deprecated their own toast in favor of sonner. It's the ecosystem standard. |
| Next.js Pages Router + AnimatePresence | App Router + FrozenRouter pattern | 2023+ | App Router's streaming model breaks simple AnimatePresence. FrozenRouter is the community standard workaround. |
| Spinner loading states | Skeleton loading via loading.tsx | Next.js 13+ | loading.tsx auto-wraps in Suspense. Skeletons prevent layout shift and feel more polished. |
| Next.js View Transitions API | Still experimental (opt-in flag) | 2025+ | `viewTransition: true` in next.config.js. Not yet stable enough to replace Framer Motion for complex animations. |

**Deprecated/outdated:**
- **shadcn/ui `<Toast />`**: Deprecated in favor of sonner. The shadcn docs now point to sonner.
- **`framer-motion` import path**: While `framer-motion` package still works, new code should import from `motion/react`.
- **`useRouter().events`**: Removed in App Router. Use `useSelectedLayoutSegment()` for detecting route changes.

## Open Questions

1. **LayoutRouterContext stability in Next.js 16.1.6**
   - What we know: The import path `next/dist/shared/lib/app-router-context.shared-runtime` has been stable since Next.js 13.4 through at least 15.x based on community usage.
   - What's unclear: Whether Next.js 16.x changed this internal path. The project is on 16.1.6.
   - Recommendation: Test the import during the first wave of implementation. If it fails, check for the new path or fall back to no page transitions. Add a try/catch boundary.

2. **React Compiler + Framer Motion**
   - What we know: The project has `babel-plugin-react-compiler` installed. Framer Motion v12 claims compatibility with React Compiler.
   - What's unclear: Whether the React Compiler's auto-memoization interferes with motion values or gesture handlers.
   - Recommendation: If animations behave unexpectedly, add `'use no memo'` directive to animation components.

3. **sonner theme integration**
   - What we know: The app uses `forcedTheme="dark"` in ThemeProvider. sonner supports a `theme` prop.
   - What's unclear: Whether the shadcn sonner wrapper auto-detects the forced dark theme.
   - Recommendation: Pass `theme="dark"` explicitly to `<Toaster />` if auto-detection doesn't work.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `internship-command-center/vitest.config.ts` |
| Quick run command | `cd internship-command-center && npx vitest run --reporter=verbose` |
| Full suite command | `cd internship-command-center && npx vitest run --reporter=verbose` |

### Phase Requirements Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-01 | Page transitions render LayoutTransition component | unit | `npx vitest run src/__tests__/layout-transition.test.ts -x` | Wave 0 |
| UX-02 | AnimatedList renders children with stagger variants | unit | `npx vitest run src/__tests__/animated-list.test.ts -x` | Wave 0 |
| UX-03 | Toast fires on server action success/failure | unit | `npx vitest run src/__tests__/toast-integration.test.ts -x` | Wave 0 |
| UX-04 | Command palette opens on Cmd+K, navigates on select | unit | `npx vitest run src/__tests__/command-palette.test.ts -x` | Wave 0 |
| UX-05 | Loading skeletons exist for all routes | smoke | Manual verification - check loading.tsx files exist | manual-only |
| UX-06 | Empty states render when data arrays are empty | unit | `npx vitest run src/__tests__/empty-states.test.ts -x` | Wave 0 |
| UX-07 | Inline status/tier update calls server action | unit | `npx vitest run src/__tests__/inline-edit.test.ts -x` | Wave 0 |
| UX-08 | Bottom tab bar renders on mobile, hidden on desktop | unit | `npx vitest run src/__tests__/bottom-tab-bar.test.ts -x` | Wave 0 |
| UX-09 | Micro-interaction components render with motion props | smoke | Manual verification - visual inspection | manual-only |
| UX-10 | Swipeable card fires callbacks on threshold drag | unit | `npx vitest run src/__tests__/swipeable-card.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd internship-command-center && npx vitest run --reporter=verbose`
- **Per wave merge:** Full suite
- **Phase gate:** Full suite green before verify

### Wave 0 Gaps
- [ ] `src/__tests__/layout-transition.test.ts` -- covers UX-01 (mock LayoutRouterContext)
- [ ] `src/__tests__/animated-list.test.ts` -- covers UX-02
- [ ] `src/__tests__/toast-integration.test.ts` -- covers UX-03 (mock sonner toast)
- [ ] `src/__tests__/command-palette.test.ts` -- covers UX-04 (keyboard event + navigation)
- [ ] `src/__tests__/empty-states.test.ts` -- covers UX-06
- [ ] `src/__tests__/inline-edit.test.ts` -- covers UX-07 (mock server action)
- [ ] `src/__tests__/bottom-tab-bar.test.ts` -- covers UX-08
- [ ] `src/__tests__/swipeable-card.test.ts` -- covers UX-10

Note: UX-05 (loading skeletons) and UX-09 (micro-interactions) are primarily visual/structural and best verified by file existence checks and manual visual inspection. Unit testing motion props adds little value.

## Sources

### Primary (HIGH confidence)
- Project codebase analysis: package.json, all page components, server actions, existing UI components
- [shadcn/ui Sonner docs](https://ui.shadcn.com/docs/components/radix/sonner) - Installation and usage
- [Sonner getting started](https://sonner.emilkowal.ski/getting-started) - API patterns
- [cmdk GitHub](https://cmdk.paco.me/) - Command palette component API
- [Next.js loading.js convention](https://nextjs.org/docs/app/api-reference/file-conventions/loading) - Skeleton loading pattern

### Secondary (MEDIUM confidence)
- [FrozenRouter pattern - Corfitz](https://www.imcorfitz.com/posts/adding-framer-motion-page-transitions-to-next-js-app-router) - FrozenRouter + LayoutTransition implementation, verified by multiple community sources
- [Motion for React docs](https://motion.dev/docs/react) - Package rename from framer-motion to motion, import paths
- [Motion AnimatePresence](https://motion.dev/docs/react-animate-presence) - mode="wait", key prop requirements
- [Motion gestures](https://motion.dev/docs/react-gestures) - Drag, swipe, onDragEnd handler patterns
- [Swipe actions with Framer Motion - OlegWock](https://sinja.io/blog/swipe-actions-react-framer-motion) - Composable swipe pattern
- [Motion stagger](https://www.framer.com/motion/stagger/) - staggerChildren variant pattern
- [Next.js viewTransition config](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition) - Experimental View Transitions API (noted as future option)

### Tertiary (LOW confidence)
- [framer-motion npm](https://www.npmjs.com/package/framer-motion) - Latest version 12.35.2 (WebSearch, not directly verified)
- React Compiler + Framer Motion compatibility claims (from blog post, not tested)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified in npm, shadcn docs, and project codebase. cmdk and skeleton already installed.
- Architecture: HIGH - FrozenRouter pattern verified across multiple independent sources. Toast and skeleton patterns are standard Next.js conventions.
- Pitfalls: HIGH - LayoutRouterContext internal import is a documented known risk. Other pitfalls from project codebase analysis.
- Mobile patterns: MEDIUM - Bottom tab bar pattern is straightforward CSS. Swipe gestures rely on motion's drag API which is well-documented but mobile-specific edge cases (scroll conflict) need testing.

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable -- libraries are mature, patterns well-established)
