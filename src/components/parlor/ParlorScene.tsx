import type { JSX, ReactNode } from "react";
import "@/styles/parlor.css";

interface ParlorSceneProps {
  /** The oak table and the folders on it. */
  tableSlot: ReactNode;
  /** The back-wall chart surface (R10.8 populates the pin-stack). */
  chartSlot: ReactNode;
  /** The three-chair convening area (R10.7 populates the chairs). */
  chairsSlot: ReactNode;
  /** Optional side-drawer for the counter-offer draft (later R10 tasks). */
  draftSlot?: ReactNode;
  /**
   * Optional signature affordance — overlay, portal, or any node the
   * calling client wants to render alongside the scene (not positioned
   * by this compositor).
   */
  signatureSlot?: ReactNode;
}

/**
 * The Negotiation Parlor scene compositor.
 *
 * Environment: wood panels, brass sconces, oak floor. Matches the R10.5
 * door palette (deep wood + gold accents) so the annex reads as a natural
 * extension of the C-Suite.
 *
 * Compositor contract:
 *   - Back wall hosts the `chartSlot` (pin-stack chart arrives in R10.8).
 *   - Floor hosts the `tableSlot` (left-ish) and `chairsSlot` (right-ish).
 *   - Draft area is opt-in — no wrapper div when `draftSlot` is omitted.
 *   - Signature slot is a free-form node, rendered after everything else
 *     for overlay/portal patterns.
 *
 * Purely structural: no state, no effects. Styling lives in parlor.css.
 */
export function ParlorScene({
  tableSlot,
  chartSlot,
  chairsSlot,
  draftSlot,
  signatureSlot,
}: ParlorSceneProps): JSX.Element {
  return (
    <div className="parlor-bg" data-floor="parlor">
      <div className="parlor-backwall">{chartSlot}</div>
      <div className="parlor-sconces" aria-hidden="true" />
      <div className="parlor-floor">
        <div className="parlor-table-area">{tableSlot}</div>
        <div className="parlor-chairs-area">{chairsSlot}</div>
      </div>
      {draftSlot ? (
        <aside className="parlor-draft-area">{draftSlot}</aside>
      ) : null}
      {signatureSlot}
    </div>
  );
}
