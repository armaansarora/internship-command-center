# UI Polish Research: Animations, Toasts, and Micro-Interactions

**Project:** Internship Command Center
**Researched:** 2026-03-09
**Overall confidence:** HIGH

---

## Table of Contents

1. [Motion (Framer Motion) Setup with Next.js App Router](#1-motion-formerly-framer-motion-setup)
2. [Page Transition Patterns](#2-page-transition-patterns)
3. [List Animation Patterns (Stagger Effects)](#3-list-animation-patterns-stagger-effects)
4. [Loading Skeleton Patterns](#4-loading-skeleton-patterns)
5. [Sonner Toast Setup with shadcn/ui](#5-sonner-toast-setup-with-shadcnui)
6. [cmdk Command Palette Wiring](#6-cmdk-command-palette-wiring)
7. [Empty State Component Patterns](#7-empty-state-component-patterns)
8. [Inline Editing in Data Tables](#8-inline-editing-in-data-tables)
9. [Mobile Bottom Tab Bar Pattern](#9-mobile-bottom-tab-bar-pattern)
10. [Micro-Interaction Patterns](#10-micro-interaction-patterns)
11. [Performance: CSS Transitions vs Motion](#11-performance-css-transitions-vs-motion)
12. [Installation Summary](#12-installation-summary)

---

## 1. Motion (formerly Framer Motion) Setup

**Confidence:** HIGH

### Package Name Change

Framer Motion was rebranded to "Motion" in late 2024. The current package is `motion` (v12.35.x as of March 2026). The old `framer-motion` package still works and is kept in sync, but new projects should use `motion`.

### Installation

```bash
npm install motion
```

### Import Paths

```typescript
// Standard import (client components only)
import { motion, AnimatePresence } from "motion/react";

// For use in Server Component files (rare - prefer wrapper pattern)
import * as motion from "motion/react-client";
```

### The "use client" Rule

Motion components use React hooks internally. Every file that imports from `motion/react` must have `"use client"` at the top. This is non-negotiable in the App Router.

**Recommended pattern:** Create thin wrapper components in a `components/motion/` directory so that Server Components can import and use them without needing `"use client"` themselves.

```typescript
// src/components/motion/fade-in.tsx
"use client";

import { motion } from "motion/react";

export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

Then use in any Server Component page:

```typescript
// src/app/dashboard/page.tsx (Server Component - no "use client")
import { FadeIn } from "@/components/motion/fade-in";

export default async function DashboardPage() {
  const data = await getData();
  return (
    <FadeIn>
      <h1>Dashboard</h1>
      {/* ...content... */}
    </FadeIn>
  );
}
```

### Core API Summary

| Prop | Purpose | Example |
|------|---------|---------|
| `initial` | Starting state | `{ opacity: 0, y: 20 }` |
| `animate` | Target state | `{ opacity: 1, y: 0 }` |
| `exit` | Exit state (needs AnimatePresence) | `{ opacity: 0, y: -20 }` |
| `transition` | How to animate | `{ duration: 0.3, ease: "easeOut" }` |
| `layout` | Auto-animate layout changes | `layout` or `layout="position"` |
| `whileHover` | Hover gesture state | `{ scale: 1.02 }` |
| `whileTap` | Press gesture state | `{ scale: 0.98 }` |
| `variants` | Named animation states | See stagger section |

### AnimatePresence Rules (Critical)

Three requirements for exit animations to work:

1. `AnimatePresence` wraps the conditional -- it sits **outside**, not inside
2. The motion component has a unique `key` prop
3. The motion component is a **direct child** of `AnimatePresence`

```typescript
"use client";

import { AnimatePresence, motion } from "motion/react";

function ConditionalPanel({ show }: { show: boolean }) {
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          key="panel"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          Panel content
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### Layout Animations

The `layout` prop uses the FLIP technique (First, Last, Invert, Play) to animate position and size changes using GPU-accelerated transforms. This is extremely useful for reorderable lists, expanding cards, and filtering/sorting operations.

```typescript
<motion.div layout layoutId="card-expand">
  {isExpanded ? <FullCard /> : <CompactCard />}
</motion.div>
```

**Caveat:** Set `layout="position"` when you only want to animate position changes (not size), which avoids distortion on text and images.

### Sources

- [Motion official site](https://motion.dev/)
- [Motion npm package](https://www.npmjs.com/package/motion) -- v12.35.2
- [Framer Motion Complete Guide 2026](https://inhaq.com/blog/framer-motion-complete-guide-react-nextjs-developers)
- [Using Framer Motion with Next.js Server Components](https://staticmania.com/blog/how-to-use-framer-motion-for-animations-in-next-js)

---

## 2. Page Transition Patterns

**Confidence:** MEDIUM -- the FrozenRouter pattern relies on internal Next.js APIs

### The Problem

Next.js App Router unmounts pages immediately on navigation. There is no built-in hook for "wait for exit animation before unmounting." `AnimatePresence` cannot detect route changes the way it could with Pages Router.

### Recommended Approach: FrozenRouter Pattern

This is the most battle-tested community pattern, but it depends on `LayoutRouterContext` which is an internal Next.js API.

```typescript
// src/components/motion/layout-transition.tsx
"use client";

import { useContext, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useSelectedLayoutSegment } from "next/navigation";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

function usePreviousValue<T>(value: T): T | undefined {
  const prevValue = useRef<T>();
  useEffect(() => {
    prevValue.current = value;
    return () => {
      prevValue.current = undefined;
    };
  });
  return prevValue.current;
}

function FrozenRouter({ children }: { children: React.ReactNode }) {
  const context = useContext(LayoutRouterContext);
  const prevContext = usePreviousValue(context) || null;

  const segment = useSelectedLayoutSegment();
  const prevSegment = usePreviousValue(segment);

  const changed =
    segment !== prevSegment &&
    segment !== undefined &&
    prevSegment !== undefined;

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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={className}
      >
        <FrozenRouter>{children}</FrozenRouter>
      </motion.div>
    </AnimatePresence>
  );
}
```

Usage in the layout that wraps changing pages:

```typescript
// src/app/layout.tsx
<LayoutTransition className="flex-1 overflow-auto">
  {children}
</LayoutTransition>
```

### Simpler Alternative: Entry-Only Animation (Recommended for V1)

Skip exit animations entirely. Use a simple fade-in wrapper on each page. This avoids the fragile FrozenRouter pattern and works reliably.

```typescript
// src/components/motion/page-wrapper.tsx
"use client";

import { motion } from "motion/react";

export function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
```

Then wrap each page:

```typescript
// src/app/dashboard/page.tsx
import { PageWrapper } from "@/components/motion/page-wrapper";

export default async function DashboardPage() {
  return (
    <PageWrapper>
      {/* page content */}
    </PageWrapper>
  );
}
```

### Recommendation

**Use the entry-only pattern for V1.** It is reliable, simple, and gives 80% of the perceived polish. The FrozenRouter exit animation pattern is fragile and may break on Next.js upgrades. Revisit once Next.js provides official route transition APIs (which the Vercel team has discussed).

### Sources

- [Solving Framer Motion Page Transitions in Next.js App Router](https://www.imcorfitz.com/posts/adding-framer-motion-page-transitions-to-next-js-app-router)
- [Next.js issue #49279 -- App router issue with shared layout animations](https://github.com/vercel/next.js/issues/49279)
- [Next.js discussion #42658 -- How to animate route transitions](https://github.com/vercel/next.js/discussions/42658)

---

## 3. List Animation Patterns (Stagger Effects)

**Confidence:** HIGH

### Variants + staggerChildren Pattern

This is the standard approach. Define a parent variant with `staggerChildren` and child variants with the actual animation. Children automatically inherit variant names from the parent.

```typescript
// src/components/motion/stagger-list.tsx
"use client";

import { motion } from "motion/react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,    // 60ms between each child
      delayChildren: 0.1,       // 100ms before first child starts
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

export function StaggerList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
```

### Usage with Card Lists

```typescript
import { StaggerList, StaggerItem } from "@/components/motion/stagger-list";

function ApplicationCards({ apps }: { apps: Application[] }) {
  return (
    <StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {apps.map((app) => (
        <StaggerItem key={app.id}>
          <ApplicationCard app={app} />
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
```

### Usage with Table Rows

For animating table rows, use `motion.tr` instead of wrapping in a div (which would break table HTML semantics):

```typescript
"use client";

import { motion } from "motion/react";

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2 },
  },
};

export function AnimatedTableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.tr variants={rowVariants} className={className}>
      {children}
    </motion.tr>
  );
}
```

Wrap the `<tbody>` in a motion component with container variants:

```typescript
<motion.tbody
  variants={containerVariants}
  initial="hidden"
  animate="visible"
>
  {rows.map((row) => (
    <AnimatedTableRow key={row.id}>
      {/* cells */}
    </AnimatedTableRow>
  ))}
</motion.tbody>
```

### Timing Guidelines

| staggerChildren | Feel | Use for |
|-----------------|------|---------|
| 0.03-0.05s | Rapid cascade | Long lists (20+ items) |
| 0.06-0.08s | Snappy | Medium lists (5-20 items), table rows |
| 0.10-0.15s | Deliberate | Short lists (2-5 cards), dashboard panels |
| > 0.15s | Sluggish | Avoid -- feels broken |

### Sources

- [Motion stagger docs](https://www.framer.com/motion/stagger/)
- [Creating Staggered Animations with Framer Motion](https://medium.com/@onifkay/creating-staggered-animations-with-framer-motion-0e7dc90eae33)

---

## 4. Loading Skeleton Patterns

**Confidence:** HIGH

### Current Setup

The project already has a shadcn Skeleton component (`src/components/ui/skeleton.tsx`) that uses `animate-pulse` from `tw-animate-css`. It renders a pulsing rounded div.

### Pattern: Skeleton Matching Content Shape

Create skeleton components that mirror the shape of the actual content. This is the industry standard pattern.

```typescript
// src/components/skeletons/app-table-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function AppTableSkeleton() {
  return (
    <div className="space-y-3">
      {/* Table header skeleton */}
      <div className="flex gap-4 px-4 py-3">
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[120px]" />
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-4 w-[80px]" />
      </div>
      {/* Table row skeletons */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-border">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[80px]" />
        </div>
      ))}
    </div>
  );
}

export function DashboardCardSkeleton() {
  return (
    <div className="rounded-lg border border-border p-6 space-y-3">
      <Skeleton className="h-4 w-[140px]" />
      <Skeleton className="h-8 w-[60px]" />
      <Skeleton className="h-3 w-[100px]" />
    </div>
  );
}

export function StatusCountersSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <DashboardCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

### Integration with Next.js Streaming

**Method 1: `loading.tsx` file** -- automatic, covers the whole route segment.

```typescript
// src/app/dashboard/loading.tsx
import { StatusCountersSkeleton } from "@/components/skeletons/dashboard-skeletons";

export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-[200px]" /> {/* Title */}
      <StatusCountersSkeleton />
      <AppTableSkeleton />
    </div>
  );
}
```

**Method 2: `Suspense` boundaries** -- granular, allows independent loading for each section.

```typescript
// src/app/dashboard/page.tsx
import { Suspense } from "react";
import { StatusCountersSkeleton } from "@/components/skeletons/dashboard-skeletons";

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <Suspense fallback={<StatusCountersSkeleton />}>
        <StatusCounters />  {/* async Server Component */}
      </Suspense>
      <Suspense fallback={<AppTableSkeleton />}>
        <ApplicationTable />  {/* async Server Component */}
      </Suspense>
    </div>
  );
}
```

**Recommendation:** Use `Suspense` boundaries for granular streaming. `loading.tsx` replaces the entire page with a skeleton, which can feel jarring. Suspense lets parts of the page stream in independently, so the user sees progressive content rather than a full-page skeleton flip.

### Sources

- [Mastering Loading States with loading.js and React Suspense](https://medium.com/@divyanshsharma0631/no-more-blank-screens-mastering-loading-states-skeletons-with-loading-js-80c62b7747a1)
- [Next.js Streaming Handbook](https://www.freecodecamp.org/news/the-nextjs-15-streaming-handbook/)
- [Next.js loading.js API reference](https://nextjs.org/docs/app/api-reference/file-conventions/loading)
- [shadcn Skeleton docs](https://ui.shadcn.com/docs/components/radix/skeleton)

---

## 5. Sonner Toast Setup with shadcn/ui

**Confidence:** HIGH

### Installation

```bash
npx shadcn@latest add sonner
```

This installs the `sonner` npm package and creates `src/components/ui/sonner.tsx`.

### Add Toaster Provider to Root Layout

Place the `<Toaster />` component in the root layout, **after** the main content:

```typescript
// src/app/layout.tsx
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body>
        <ThemeProvider ...>
          <TooltipProvider>
            <div className="flex min-h-screen bg-background text-foreground">
              <AppSidebar />
              <main className="flex-1 overflow-auto">{children}</main>
            </div>
          </TooltipProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
```

**Important:** `<Toaster />` goes outside `<ThemeProvider>` in your layout (at the body level). It manages its own portal. Place it as a sibling to ThemeProvider or at the end of body.

### Configuration Options for Toaster

```typescript
<Toaster
  position="bottom-right"    // default, good for desktop with sidebar
  richColors                 // enables success=green, error=red styling
  closeButton                // adds X button to all toasts
  duration={4000}            // auto-dismiss in 4s (default)
  theme="dark"               // match your forced dark theme
/>
```

### Triggering Toasts from Client Components

```typescript
"use client";

import { toast } from "sonner";

function SaveButton() {
  const handleSave = () => {
    toast.success("Application saved");
  };

  return <button onClick={handleSave}>Save</button>;
}
```

### All Toast Methods

```typescript
import { toast } from "sonner";

// Basic variants
toast("Default notification");
toast.success("Saved successfully");
toast.error("Failed to save");
toast.warning("Check your input");
toast.info("New update available");
toast.loading("Saving changes...");

// With description
toast.success("Application saved", {
  description: "Google SWE Intern position updated",
});

// With action button
toast("Email drafted", {
  action: {
    label: "Send Now",
    onClick: () => sendEmail(),
  },
});

// With cancel button
toast("Delete application?", {
  action: {
    label: "Delete",
    onClick: () => deleteApp(),
  },
  cancel: {
    label: "Cancel",
    onClick: () => {},
  },
});

// Promise toast -- auto-transitions through loading/success/error
toast.promise(saveApplication(formData), {
  loading: "Saving application...",
  success: (data) => `${data.company} application saved!`,
  error: "Failed to save application",
});

// Dismiss programmatically
const toastId = toast.loading("Processing...");
// later...
toast.dismiss(toastId);

// Custom JSX
toast.custom((id) => (
  <div className="bg-card p-4 rounded-lg border">
    <p>Custom toast content</p>
    <button onClick={() => toast.dismiss(id)}>Close</button>
  </div>
));
```

### Triggering Toasts from Server Actions

Server Actions run on the server and cannot call `toast()` directly. There are two patterns:

**Pattern A: Return result, toast on client (recommended -- simple)**

```typescript
// src/actions/applications.ts
"use server";

export async function updateApplication(formData: FormData) {
  try {
    await db.update(applications).set({ ... }).where(eq(applications.id, id));
    return { success: true, message: "Application updated" };
  } catch (error) {
    return { success: false, message: "Failed to update" };
  }
}
```

```typescript
// Client component
"use client";

import { toast } from "sonner";
import { updateApplication } from "@/actions/applications";

function EditForm() {
  const handleSubmit = async (formData: FormData) => {
    const result = await updateApplication(formData);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return <form action={handleSubmit}>...</form>;
}
```

**Pattern B: useActionState + useEffect (for forms using progressive enhancement)**

```typescript
"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateApplication } from "@/actions/applications";

function EditForm() {
  const [state, formAction, isPending] = useActionState(updateApplication, null);

  useEffect(() => {
    if (state?.success) toast.success(state.message);
    if (state?.success === false) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction}>
      <button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
```

**Pattern C: Cookie-based (for cross-redirect toasts)**

For advanced scenarios where a server action redirects and you need the toast to appear on the destination page, use cookies as a bridge. This is described in the [buildui.com post](https://buildui.com/posts/toast-messages-in-react-server-components) but is overkill for most cases. Recommended only if you redirect after server actions and need toast on the target page.

### Sources

- [shadcn Sonner docs](https://ui.shadcn.com/docs/components/radix/sonner)
- [Sonner official docs](https://sonner.emilkowal.ski/getting-started)
- [Sonner toast API](https://sonner.emilkowal.ski/toast)
- [Toast messages in React Server Components](https://buildui.com/posts/toast-messages-in-react-server-components)

---

## 6. cmdk Command Palette Wiring

**Confidence:** HIGH

### Current State

The project already has `cmdk@1.1.1` installed and the shadcn `CommandDialog` component in `src/components/ui/command.tsx`. The component wraps cmdk in a Dialog with search icon, styled lists, and keyboard navigation.

### Implementation: Global Command Palette

```typescript
// src/components/command-palette.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Bell,
  Search,
  Plus,
  Moon,
  Sun,
} from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const runCommand = useCallback(
    (command: () => void) => {
      setOpen(false);
      command();
    },
    []
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, applications, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Navigation */}
        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/applications"))}>
            <Briefcase className="mr-2 h-4 w-4" />
            Applications
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/cover-letters"))}>
            <FileText className="mr-2 h-4 w-4" />
            Cover Letters
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/follow-ups"))}>
            <Bell className="mr-2 h-4 w-4" />
            Follow-ups
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Quick Actions */}
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => runCommand(() => {/* open add dialog */})}>
            <Plus className="mr-2 h-4 w-4" />
            Add Application
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => {/* toggle theme */})}>
            <Sun className="mr-2 h-4 w-4" />
            Toggle Theme
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Dynamic search results -- applications */}
        <CommandGroup heading="Applications">
          {/* Populated dynamically from search */}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
```

### Dynamic Application Search

For searching across applications, fetch data on-demand as the user types:

```typescript
// Inside CommandPalette component
const [query, setQuery] = useState("");
const [results, setResults] = useState<Application[]>([]);

// Debounced search
useEffect(() => {
  if (query.length < 2) {
    setResults([]);
    return;
  }
  const timeout = setTimeout(async () => {
    const data = await searchApplications(query); // server action
    setResults(data);
  }, 200);
  return () => clearTimeout(timeout);
}, [query]);

// In CommandDialog:
<CommandInput
  placeholder="Search..."
  value={query}
  onValueChange={setQuery}
/>
```

**Note:** cmdk has built-in fuzzy filtering via its `filter` prop. For client-side data (small lists), rely on cmdk's built-in filter. For server-side search (large datasets), set `shouldFilter={false}` on the `Command` component and handle filtering yourself.

### Mount in Layout

```typescript
// src/app/layout.tsx
import { CommandPalette } from "@/components/command-palette";

// Inside the layout JSX, after TooltipProvider:
<CommandPalette />
```

### Keyboard Hint in Sidebar

Add a visual hint in the sidebar showing the shortcut:

```typescript
<button
  onClick={() => setOpen(true)}
  className="flex items-center gap-2 text-sm text-muted-foreground"
>
  <Search className="h-4 w-4" />
  <span>Search</span>
  <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
    ⌘K
  </kbd>
</button>
```

### Sources

- [cmdk npm package](https://www.npmjs.com/package/cmdk)
- [shadcn Command docs](https://www.shadcn.io/ui/command)
- [Boost Your React App with cmdk](https://knowledge.buka.sh/boost-your-react-app-with-a-sleek-command-palette-using-cmdk/)

---

## 7. Empty State Component Patterns

**Confidence:** HIGH

### Design Principles

1. One sentence of copy + optional supporting text
2. One prominent CTA (not multiple vague options)
3. An icon or simple illustration (not decorative -- it should reinforce the message)
4. Match the tone of the context (onboarding vs. error vs. no-results)

### Component Implementation

```typescript
// src/components/ui/empty-state.tsx
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

### Contextual Variants

```typescript
// No data yet (onboarding)
<EmptyState
  icon={Briefcase}
  title="No applications yet"
  description="Start tracking your internship applications to stay organized."
  action={{ label: "Add Application", onClick: openAddDialog }}
/>

// Search with no results
<EmptyState
  icon={Search}
  title="No results found"
  description="Try adjusting your search terms or filters."
/>

// Filtered to empty
<EmptyState
  icon={Filter}
  title="No matching applications"
  description="No applications match your current filters."
  action={{ label: "Clear Filters", onClick: clearFilters }}
/>

// Error state
<EmptyState
  icon={AlertCircle}
  title="Something went wrong"
  description="We couldn't load your data. Please try again."
  action={{ label: "Retry", onClick: retry }}
/>
```

### Sources

- [Empty State UX Examples and Design Rules](https://www.eleken.co/blog-posts/empty-state-ux)
- [Empty State UI Design (SetProduct)](https://www.setproduct.com/blog/empty-state-ui-design)
- [GitLab Empty States Pattern](https://design.gitlab.com/patterns/empty-states/)

---

## 8. Inline Editing in Data Tables

**Confidence:** HIGH

### Architecture with TanStack Table

The project uses `@tanstack/react-table@8.21.3`. TanStack Table supports inline editing through its `meta` API and custom cell renderers.

### EditableCell Component

```typescript
// src/components/applications/editable-cell.tsx
"use client";

import { useState, useEffect } from "react";
import type { CellContext } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EditableCellProps<T> extends CellContext<T, unknown> {
  className?: string;
}

export function EditableCell<T>({
  getValue,
  row,
  column,
  table,
  className,
}: EditableCellProps<T>) {
  const initialValue = getValue() as string;
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);

  // Sync external changes
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const onBlur = () => {
    setIsEditing(false);
    if (value !== initialValue) {
      table.options.meta?.updateData(row.index, column.id, value);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.currentTarget.blur(); // triggers onBlur -> save
    }
    if (e.key === "Escape") {
      setValue(initialValue); // revert
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        autoFocus
        className={cn("h-8 w-full", className)}
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-pointer rounded px-2 py-1 hover:bg-accent transition-colors",
        className
      )}
      title="Click to edit"
    >
      {value || <span className="text-muted-foreground italic">Empty</span>}
    </span>
  );
}
```

### TableMeta Type Extension

```typescript
// src/types/table.ts
import "@tanstack/react-table";

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void;
  }
}
```

### Wiring in useReactTable

```typescript
const table = useReactTable({
  data,
  columns,
  meta: {
    updateData: async (rowIndex, columnId, value) => {
      // Optimistic update
      setData((old) =>
        old.map((row, index) =>
          index === rowIndex ? { ...old[rowIndex], [columnId]: value } : row
        )
      );
      // Persist to server
      const row = data[rowIndex];
      const result = await updateApplication(row.id, { [columnId]: value });
      if (!result.success) {
        // Revert on failure
        setData((old) =>
          old.map((r, i) => (i === rowIndex ? data[rowIndex] : r))
        );
        toast.error("Failed to save change");
      } else {
        toast.success("Updated");
      }
    },
  },
});
```

### Column Definition with EditableCell

```typescript
const columns = [
  columnHelper.accessor("company", {
    header: "Company",
    cell: (info) => <EditableCell {...info} />,
  }),
  columnHelper.accessor("role", {
    header: "Role",
    cell: (info) => <EditableCell {...info} />,
  }),
  // Non-editable columns use default rendering
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
];
```

### Sources

- [TanStack Table Editable Data Example](https://tanstack.com/table/latest/docs/framework/react/examples/editable-data)
- [Creating an Editable Table with TanStack](https://muhimasri.com/blogs/react-editable-table/)

---

## 9. Mobile Bottom Tab Bar Pattern

**Confidence:** HIGH

### Implementation

A fixed bottom navigation bar visible only on mobile (hidden on `md:` breakpoint and above since the sidebar takes over).

```typescript
// src/components/layout/mobile-tab-bar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Bell,
} from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/applications", label: "Apps", icon: Briefcase },
  { href: "/cover-letters", label: "Letters", icon: FileText },
  { href: "/follow-ups", label: "Follow-ups", icon: Bell },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href ||
            (href !== "/" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### Layout Integration

```typescript
// src/app/layout.tsx
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";

export default function RootLayout({ children }) {
  return (
    <html ...>
      <body ...>
        <ThemeProvider ...>
          <TooltipProvider>
            <div className="flex min-h-screen bg-background text-foreground">
              <AppSidebar />  {/* hidden on mobile via its own responsive logic */}
              <main className="flex-1 overflow-auto pb-16 md:pb-0">
                {children}
              </main>
            </div>
          </TooltipProvider>
        </ThemeProvider>
        <MobileTabBar />
        <Toaster />
      </body>
    </html>
  );
}
```

Key details:
- `pb-16 md:pb-0` on `<main>` prevents content from being hidden behind the tab bar on mobile
- `md:hidden` on the tab bar hides it when the sidebar is visible
- `backdrop-blur` with semi-transparent background gives a modern frosted-glass effect
- `z-50` ensures it sits above page content

---

## 10. Micro-Interaction Patterns

**Confidence:** HIGH

### Hover Scale + Press State (Motion)

For interactive cards and buttons:

```typescript
"use client";

import { motion } from "motion/react";

// Interactive card wrapper
export function InteractiveCard({ children, className }: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Button with press feedback
export function PressableButton({
  children,
  ...props
}: React.ComponentProps<typeof motion.button>) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
```

### Use CSS for Simple Interactions (Better Performance)

For simple hover/focus effects, CSS is more performant than Motion because it runs on the compositor thread.

```css
/* In globals.css or as Tailwind utilities */

/* Card hover lift */
.card-interactive {
  @apply transition-all duration-200 ease-out;
}
.card-interactive:hover {
  @apply -translate-y-0.5 shadow-md;
}
.card-interactive:active {
  @apply translate-y-0 shadow-sm;
}
```

Or with Tailwind classes directly:

```typescript
<Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm cursor-pointer">
```

### Gradient Badges

```typescript
// src/components/ui/gradient-badge.tsx
import { cn } from "@/lib/utils";

interface GradientBadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const gradientMap = {
  default: "from-primary/20 to-primary/5 text-primary border-primary/20",
  success: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20",
  warning: "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20",
  danger: "from-red-500/20 to-red-500/5 text-red-400 border-red-500/20",
  info: "from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20",
};

export function GradientBadge({
  children,
  variant = "default",
  className,
}: GradientBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        "bg-gradient-to-r border",
        gradientMap[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
```

### Shimmer / Animated Border Effect

For drawing attention to key elements (e.g., a "New" badge or featured card):

```css
/* globals.css */
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

.shimmer-badge {
  background: linear-gradient(
    90deg,
    oklch(0.488 0.243 264.376) 0%,
    oklch(0.627 0.265 303.9) 50%,
    oklch(0.488 0.243 264.376) 100%
  );
  background-size: 200% auto;
  animation: shimmer 3s ease-in-out infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### Focus Ring Animation

```typescript
// Consistent focus ring across interactive elements
// Add to globals.css
<style>
@layer base {
  *:focus-visible {
    @apply outline-2 outline-offset-2 outline-ring/50 transition-[outline-offset] duration-150;
  }
}
</style>
```

### Number Counter Animation

For dashboard stat counters:

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useTransform, animate } from "motion/react";

export function AnimatedCounter({ value, duration = 1 }: { value: number; duration?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      const controls = animate(0, value, {
        duration,
        ease: "easeOut",
        onUpdate: (v) => setDisplayValue(Math.round(v)),
      });
      return controls.stop;
    }
  }, [isInView, value, duration]);

  return <span ref={ref}>{displayValue}</span>;
}
```

### Sources

- [Motion gesture animations docs](https://www.framer.com/motion/gestures/)
- [Create Micro Interactions with Framer Motion](https://egghead.io/lessons/react-create-micro-interactions-with-framer-motion-gesture-props)
- [Animated Border Gradient with Tailwind CSS v4](https://www.hyperui.dev/blog/animated-border-gradient-with-tailwindcss/)

---

## 11. Performance: CSS Transitions vs Motion

**Confidence:** HIGH

### Decision Framework

| Criterion | Use CSS | Use Motion |
|-----------|---------|------------|
| Hover effects | Yes | No |
| Focus states | Yes | No |
| Color transitions | Yes | No |
| Simple opacity/transform | Yes | Depends |
| Conditional enter/exit | No | Yes |
| Layout animations | No | Yes |
| Gesture-driven (drag, tap) | No | Yes |
| Staggered lists | No (hard) | Yes |
| Spring physics | No | Yes |
| State-driven sequences | No | Yes |
| Scroll-linked | Depends | Yes |

### Why CSS Is Faster for Simple Cases

CSS transitions and animations run on the **compositor thread**, separate from JavaScript. This means they cannot be blocked by JavaScript execution and are GPU-accelerated by default. CSS is the right choice for:

- `hover:scale-105` -- hover zoom
- `transition-colors duration-200` -- color changes
- `transition-opacity duration-300` -- fade in/out (static, not conditional)
- `transition-shadow duration-200` -- shadow changes
- `active:scale-95` -- press states

### Why Motion Is Worth It for Complex Cases

Motion adds ~20KB to the bundle (tree-shaken). This cost is justified when you need:

1. **Exit animations** (CSS cannot animate elements being removed from DOM)
2. **Layout animations** (FLIP technique, impossible with pure CSS)
3. **Stagger orchestration** (parent controls timing of children)
4. **Physics-based springs** (natural-feeling deceleration)
5. **Gesture-driven animations** (drag, pan, tap with momentum)
6. **AnimatePresence** for conditional rendering

### Performance Rules

1. **Only animate `transform` and `opacity`** -- these are the only properties that can be composited on the GPU without triggering layout/paint. Motion's `layout` prop handles this automatically.
2. **Avoid animating `height: auto`** -- use `max-height` or Motion's `height: "auto"` which handles it via FLIP.
3. **Use `will-change` sparingly** -- only on elements that will definitely animate, and remove after animation completes.
4. **Keep stagger lists under 50 items** -- for longer lists, virtualize first, then animate visible items.
5. **Prefer `transition` type `"tween"` for UI** -- springs can overshoot and cause extra repaints. Use springs only for gesture-driven or physics-based interactions.

### Recommended Hybrid Approach for This Project

```
CSS (Tailwind classes):
  - All hover effects: hover:scale-*, hover:shadow-*, hover:bg-*
  - All transition-colors, transition-opacity
  - Focus rings and active states
  - Skeleton pulse animation (already using tw-animate-css)

Motion library:
  - Page entry fade-in (PageWrapper component)
  - Card list stagger on mount
  - Table row stagger on mount
  - Conditional panel enter/exit (AnimatePresence)
  - Dashboard counter animations
  - Command palette open/close
  - Status badge transitions (when status changes)
```

### Sources

- [Why Framer Motion Still Beats CSS Animations in 2025](https://medium.com/@theekshanachamodhya/why-framer-motion-still-beats-css-animations-in-2025-16b3d74eccbd)
- [How to Choose Between CSS, Framer Motion, and React Spring](https://jsdev.space/howto/react-animation-solutions/)
- [Framer Motion + Tailwind: The 2025 Animation Stack](https://dev.to/manukumar07/framer-motion-tailwind-the-2025-animation-stack-1801)

---

## 12. Installation Summary

### New Dependencies to Install

```bash
# Animation library
npm install motion

# Toast notifications (via shadcn CLI -- also installs sonner package)
npx shadcn@latest add sonner
```

### Already Installed (No Action Needed)

- `cmdk@1.1.1` -- command palette
- `tw-animate-css@1.4.0` -- CSS animations for shadcn
- `next-themes@0.4.6` -- dark mode
- shadcn Skeleton component -- loading states
- shadcn Command component -- command dialog

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/motion/fade-in.tsx` | Reusable fade-in wrapper |
| `src/components/motion/page-wrapper.tsx` | Page entry animation |
| `src/components/motion/stagger-list.tsx` | Stagger container + item |
| `src/components/ui/sonner.tsx` | Auto-created by shadcn CLI |
| `src/components/command-palette.tsx` | Global Cmd+K palette |
| `src/components/ui/empty-state.tsx` | Empty state pattern |
| `src/components/ui/gradient-badge.tsx` | Gradient badges |
| `src/components/applications/editable-cell.tsx` | Inline cell editing |
| `src/components/layout/mobile-tab-bar.tsx` | Mobile bottom nav |
| `src/components/motion/animated-counter.tsx` | Counter animation |

### Root Layout Changes

The root layout (`src/app/layout.tsx`) needs these additions:
1. `<Toaster />` component (sonner)
2. `<CommandPalette />` component
3. `<MobileTabBar />` component
4. `pb-16 md:pb-0` on `<main>` for mobile tab bar spacing
5. Optional: `<PageWrapper>` around `{children}` for entry animations

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Motion setup + API | HIGH | Official docs, npm registry, multiple verified sources |
| Page transitions | MEDIUM | FrozenRouter uses internal Next.js API; entry-only is safe |
| Stagger animations | HIGH | Well-documented, stable API |
| Skeleton patterns | HIGH | Already have component; standard Next.js streaming pattern |
| Sonner/toasts | HIGH | Official shadcn integration, well-documented API |
| cmdk wiring | HIGH | Already installed; standard pattern |
| Empty states | HIGH | Standard UX pattern, no library dependency |
| Inline editing | HIGH | Official TanStack Table example exists |
| Mobile tab bar | HIGH | Standard responsive pattern, no library needed |
| Micro-interactions | HIGH | Well-documented Motion gestures + CSS |
| CSS vs Motion perf | HIGH | Multiple authoritative sources agree |

## Gaps / Open Questions

- **View Transitions API:** Next.js has experimental support for the browser-native View Transitions API which could replace Motion for page transitions in the future. Worth monitoring but not ready for production use yet.
- **React 19 + Motion compatibility:** The project uses React 19.2.3. Motion 12.x is compatible with React 19, but test the `layout` prop carefully as concurrent rendering can sometimes cause layout animation flicker.
- **Bundle size impact:** Motion adds ~20KB (gzipped) to the client bundle. For this project (internal tool, not public-facing), this is acceptable. If bundle size becomes a concern, the CSS-first approach for simple interactions helps keep the Motion import limited to specific client components.
