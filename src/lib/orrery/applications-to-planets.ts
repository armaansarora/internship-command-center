/**
 * Pure transformer: ApplicationInput[] → OrreryPlanet[].
 *
 * Lives on the data boundary. No DOM, React, GSAP, or fetch. Every
 * visual + behavior signal the render layer needs is materialized here
 * so a CSS 3D pass and an eventual R3F pass consume the same contract.
 *
 * The supernova-once invariant lives here, not in render: callers pass
 * `hasOfferEverFired` and the transformer suppresses the flag accordingly.
 */

import type { ApplicationInput, OrreryPlanet, PatternMode, Tier } from "./types";

const TIER_BASE_RADIUS = 0.2;
const TIER_RADIUS_STEP = 0.25;
const VELOCITY_WINDOW_DAYS = 90;
const VELOCITY_RADIUS_FLOOR = 0.15;
const VELOCITY_RADIUS_CEIL = 1.0;
const SIZE_BASE_PX = 14;
const SIZE_PER_TIER_PX = 4;
const SIZE_OFFER_BONUS_PX = 6;
const SIZE_CAP_PX = 32;
const DAY_MS = 24 * 60 * 60 * 1000;

// FNV-1a is sufficient for stable, well-distributed angle assignment from
// short ids — we only need determinism, not cryptographic strength.
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function hashIdToAngleDeg(id: string): number {
  let h = FNV_OFFSET_BASIS;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME);
  }
  return ((h >>> 0) % 36000) / 100;
}

function clampTier(raw: number | null): Tier {
  if (raw === 1 || raw === 2 || raw === 3 || raw === 4) return raw;
  return 4;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function radiusForMode(
  mode: PatternMode,
  tier: Tier,
  appliedAt: string | null,
  now: Date,
): number {
  if (mode === "velocity") {
    const daysSince = appliedAt
      ? Math.max(0, (now.getTime() - new Date(appliedAt).getTime()) / DAY_MS)
      : 0;
    return clamp(daysSince / VELOCITY_WINDOW_DAYS, VELOCITY_RADIUS_FLOOR, VELOCITY_RADIUS_CEIL);
  }
  return TIER_BASE_RADIUS + (tier - 1) * TIER_RADIUS_STEP;
}

type VelocityBucket = "recent" | "active" | "aging" | "cold";

function velocityBucket(appliedAt: string | null, now: Date): VelocityBucket {
  if (!appliedAt) return "recent";
  const days = (now.getTime() - new Date(appliedAt).getTime()) / DAY_MS;
  if (days <= 7) return "recent";
  if (days <= 30) return "active";
  if (days <= 60) return "aging";
  return "cold";
}

function colorTokenFor(
  mode: PatternMode,
  tier: Tier,
  status: OrreryPlanet["status"],
  appliedAt: string | null,
  now: Date,
): string {
  if (mode === "tier") return `--orrery-tier-${tier}`;
  if (mode === "velocity") return `--orrery-velocity-${velocityBucket(appliedAt, now)}`;
  return `--orrery-status-${status}`;
}

function sizeFor(tier: Tier, status: OrreryPlanet["status"]): number {
  // Tier 1 inner = bigger; bonus when the planet is a milestone (offer/accepted).
  const base = SIZE_BASE_PX + (4 - tier) * SIZE_PER_TIER_PX;
  const bonus = status === "offer" || status === "accepted" ? SIZE_OFFER_BONUS_PX : 0;
  return Math.min(SIZE_CAP_PX, base + bonus);
}

export function applicationsToPlanets(
  apps: ApplicationInput[],
  mode: PatternMode,
  now: Date = new Date(),
): OrreryPlanet[] {
  return apps.map((app) => {
    const tier = clampTier(app.tier);
    return {
      id: app.id,
      label: app.companyName,
      role: app.role,
      tier,
      status: app.status,
      radius: radiusForMode(mode, tier, app.appliedAt, now),
      angleDeg: hashIdToAngleDeg(app.id),
      sizePx: sizeFor(tier, app.status),
      colorToken: colorTokenFor(mode, tier, app.status, app.appliedAt, now),
      hasSatellite: app.status === "interview_scheduled" || app.status === "interviewing",
      isSupernova: app.status === "offer" && !app.hasOfferEverFired,
      isFading: app.status === "rejected" || app.status === "withdrawn",
      matchScore: app.matchScore,
      appliedAt: app.appliedAt,
      lastActivityAt: app.lastActivityAt,
    };
  });
}
