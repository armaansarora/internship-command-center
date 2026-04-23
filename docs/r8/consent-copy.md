# R8 — Warm Intro Network consent copy (verbatim)

This file is the canonical source of truth for the consent surface on the
Settings → Networking panel.  `src/components/settings/NetworkingConsent.tsx`
MUST render this copy verbatim (it's enforced by the P9 grep invariant in
`scripts/r8-acceptance-check.ts`).  If you need to change the wording,
bump `user_profiles.networking_consent_version` in a migration and update
both this file AND the component in the same commit — past opt-ins with
the previous version are invalidated and users re-consent.

---

## Heading

Opt in to the Warm Intro Network

## Body

The Warm Intro Network connects you — by name and target company only —
with other Tower users who have opted in. Example: you're targeting
Blackstone; another user has a contact there. If you both opt in, The
Tower can suggest an introduction to each of you.

## What we share between opted-in users:

- Your full name (as shown on your profile).
- The companies on your active applications.
- Your email address, only when you accept a specific intro.

## What we never share:

- Your contacts, your messages, your cover letters, your interview notes, your private sticky-notes.
- Anyone else's data with you unless they've also opted in.

## Revoke note

You can revoke at any time. Revoking is instant. Within 60 seconds, your
name and applications are removed from the match index. Past intros
already accepted remain.

## Checkbox label

I have read the above and opt in to the Warm Intro Network.

## Buttons

- Opt In
- Revoke
