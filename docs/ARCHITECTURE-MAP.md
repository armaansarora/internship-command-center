# Architecture Map

This document is the fastest way to understand how the app is organized today.

## Core Principle

Each floor follows the same shape:

1. **Page** (`src/app/(authenticated)/*/page.tsx`) does auth + data loading.
2. **Client shell** (`src/components/floor-*/...Client.tsx`) handles UI orchestration/state.
3. **Character + Dialogue** (`src/components/floor-*/<agent>-character/*`) owns floor persona UX.
4. **Data mutations** live in:
   - `src/lib/actions/*` (server actions used by pages)
   - `src/lib/db/queries/*-mutations.ts` (database write helpers)

## Agent UI Standardization

All 8 dialogue panels now use shared primitives in:

- `src/components/agents/dialogue/AgentDialoguePanel.tsx`
- `src/components/agents/dialogue/AgentMessageList.tsx`
- `src/components/agents/dialogue/AgentMessageBubble.tsx`
- `src/components/agents/dialogue/AgentToolCallIndicator.tsx`
- `src/components/agents/dialogue/AgentQuickActions.tsx`
- `src/components/agents/dialogue/AgentChatInput.tsx`
- `src/components/agents/dialogue/types.ts`

Per-floor panel files remain as thin wrappers so floor imports stay stable.

## Character Machine Standardization

All character machine modules are now built from:

- `src/lib/agents/create-character-machine.ts`

Machine files remain at:

- `src/lib/agents/ceo/character-machine.ts`
- `src/lib/agents/cfo/character-machine.ts`
- `src/lib/agents/cio/character-machine.ts`
- `src/lib/agents/cmo/character-machine.ts`
- `src/lib/agents/cno/character-machine.ts`
- `src/lib/agents/coo/character-machine.ts`
- `src/lib/agents/cpo/character-machine.ts`
- `src/lib/agents/cro/character-machine.ts`

Extensions preserved:

- **CMO**: writing state
- **CPO**: briefing state
- **CNO**: cold-alert event/context

## Page Mutation Domains

Authenticated page mutations are organized by domain:

- `src/lib/actions/contacts.ts`
- `src/lib/actions/documents.ts`
- `src/lib/actions/interviews.ts`
- `src/lib/actions/outreach.ts`
- `src/lib/actions/notifications.ts`

Backed by query mutation helpers:

- `src/lib/db/queries/contacts-mutations.ts`
- `src/lib/db/queries/documents-mutations.ts`
- `src/lib/db/queries/interviews-mutations.ts`
- `src/lib/db/queries/outreach-mutations.ts`
- `src/lib/db/queries/notifications-mutations.ts`

## Quick Trace: User Action to DB Write

1. User clicks in floor UI component.
2. Floor client calls action prop supplied by page.
3. Page-bound server action in `src/lib/actions/*` runs `requireUser()`.
4. Action calls `src/lib/db/queries/*-mutations.ts` helper.
5. Helper performs scoped write (`user_id` filter / insert ownership).
6. Action revalidates route via `revalidatePath(...)`.

## What To Audit First

1. `src/components/agents/dialogue/` for shared panel behavior.
2. `src/lib/agents/create-character-machine.ts` for machine baseline transitions.
3. `src/lib/actions/*` + `src/lib/db/queries/*-mutations.ts` for mutation ownership and boundaries.
