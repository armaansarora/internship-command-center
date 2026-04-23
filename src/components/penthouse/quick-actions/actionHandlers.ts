/**
 * Quick-action → dispatch mapping for the Penthouse.
 *
 * R2 scope: "Add Application" navigates directly (no agent involved).
 * The other three simulate a pneumatic-tube dispatch:
 *   outgoing envelope → incoming result card with an in-voice acknowledgment
 *   → user clicks to walk onto the owner agent's floor.
 *
 * Real agent execution through these dispatches is R3 territory (overlaps
 * the C-Suite orchestrator work). For now the payloads are the interaction
 * contract; no network call is issued.
 */

export interface QuickActionDispatch {
  /** Stable key used by the card + overlay for state tracking. */
  key: "add_application" | "research_company" | "prep_interview" | "quick_outreach";
  /** Label shown on the card. */
  label: string;
  /** Short description under the label. */
  desc: string;
  /** CSS color for the top-border + icon accent. */
  accentColor: string;
  /** Inner-glow halo for hover + return-card. */
  glowColor: string;
  /** Hover border color. */
  borderColor: string;
  /** Kind of dispatch. */
  kind: "nav" | "agent";
  /** Destination route after the action / the result card's link. */
  route: string;
  /**
   * In-voice acknowledgment shown inside the returning envelope. Populated
   * only for 'agent' kinds. For 'nav' kinds we skip the envelope entirely.
   */
  ackText?: string;
  /** Owner agent label shown on the envelope. */
  ownerAgent?: "CIO" | "CPO" | "CMO";
}

export const QUICK_ACTION_DISPATCHES: QuickActionDispatch[] = [
  {
    key: "add_application",
    label: "Add Application",
    desc: "Track a new opportunity in your pipeline",
    accentColor: "#C9A84C",
    glowColor: "rgba(201,168,76,0.15)",
    borderColor: "rgba(201,168,76,0.25)",
    kind: "nav",
    route: "/war-room?new=1",
  },
  {
    key: "research_company",
    label: "Research Company",
    desc: "Get intelligence on a target company",
    accentColor: "#4C8FD4",
    glowColor: "rgba(76,143,212,0.14)",
    borderColor: "rgba(76,143,212,0.25)",
    kind: "agent",
    route: "/rolodex-lounge",
    ackText: "CIO is warming up on Floor 6. Research briefs land on the whiteboard.",
    ownerAgent: "CIO",
  },
  {
    key: "prep_interview",
    label: "Prep Interview",
    desc: "Generate a briefing packet for your interview",
    accentColor: "#4CAF7E",
    glowColor: "rgba(76,175,126,0.14)",
    borderColor: "rgba(76,175,126,0.25)",
    kind: "agent",
    route: "/briefing-room",
    ackText: "CPO has the Briefing Room ready on Floor 3. Pick the interview to prep.",
    ownerAgent: "CPO",
  },
  {
    key: "quick_outreach",
    label: "Quick Outreach",
    desc: "Draft a cold email or follow-up message",
    accentColor: "#9B6FD4",
    glowColor: "rgba(155,111,212,0.14)",
    borderColor: "rgba(155,111,212,0.25)",
    kind: "agent",
    route: "/writing-room",
    ackText: "CMO is at the desk in the Writing Room on Floor 5. Tell them who and why.",
    ownerAgent: "CMO",
  },
];
