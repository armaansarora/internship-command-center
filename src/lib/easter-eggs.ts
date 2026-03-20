/**
 * Easter Egg utilities for The Tower.
 * Pure logic — no React imports. Used by EasterEggs.tsx component.
 */

const SESSION_MIDNIGHT_KEY = "tower-midnight-fireworks-shown";

/**
 * Returns true if the current time is between 00:00 and 00:05 local time
 * AND this hasn't already been shown in this session.
 */
export function shouldShowMidnightFireworks(): boolean {
  if (typeof window === "undefined") return false;

  if (sessionStorage.getItem(SESSION_MIDNIGHT_KEY) === "1") return false;

  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= 0 && minutes < 5;
}

/** Mark midnight fireworks as shown for this session. */
export function markMidnightFireworksShown(): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(SESSION_MIDNIGHT_KEY, "1");
  }
}

/** Character backstories shown on nameplate hover. */
export const CHARACTER_BACKSTORIES: Record<string, string> = {
  CRO: "Former Wall Street trader. Lives for the close.",
  COO: "Ex-military logistics. Never missed a deadline.",
  CMO: "Published novelist. Every word is intentional.",
  CPO: "PhD researcher. Preparation is everything.",
  CIO: "Former intelligence analyst. Data is power.",
  CNO: "Born networker. Remembers every conversation.",
  CFO: "Quant fund veteran. Numbers tell the story.",
  CEO: "Serial founder. Orchestrates like a conductor.",
};

/**
 * Rapid-click elevator tracker.
 * Returns true when the click rate exceeds 10 clicks in 3 seconds.
 */
export class ElevatorClickTracker {
  private timestamps: number[] = [];
  private readonly windowMs = 3000;
  private readonly threshold = 10;

  record(): boolean {
    const now = Date.now();
    this.timestamps.push(now);
    // Prune old timestamps outside the window
    this.timestamps = this.timestamps.filter(
      (t) => now - t <= this.windowMs,
    );
    return this.timestamps.length > this.threshold;
  }

  reset(): void {
    this.timestamps = [];
  }
}
