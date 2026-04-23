"use client";

import type { JSX } from "react";
import { useMemo, useRef } from "react";
import type { ContactForAgent } from "@/lib/db/queries/contacts-rest";
import { RolodexCard } from "./RolodexCard";
import { useRolodexRotation, normalizeDelta } from "./useRolodexRotation";

const CYLINDER_RADIUS = 240;
const CARD_WIDTH = 160;
const CARD_HEIGHT = 220;
/** Cards strictly within ±45° of the camera center are rendered (live); the
 *  rest are virtual.  At 200 cards this caps the live DOM child count to
 *  ≤ 50.  (Strict-less-than because at 200 cards each card is 1.8° apart
 *  and inclusive-at-45° would put a card on each pole for 51 live.) */
const VISIBLE_ARC_DEG = 90;

interface RolodexProps {
  contacts: ContactForAgent[];
  onFlipCard: (contact: ContactForAgent) => void;
}

/**
 * The centerpiece of Floor 6. A physical cylinder of contact cards. Warmth
 * coloured (cool-blue palette — zero red), rotates on wheel-scroll and arrow
 * keys, virtualizes to ≤ 50 live cards at any moment.
 *
 * This is the P1 invariant: 200+ card fixture rendered without blowing up
 * the live DOM child count.
 */
export function Rolodex({ contacts, onFlipCard }: RolodexProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const { angleDeg, onWheel, onKeyDown } = useRolodexRotation(contacts.length);

  const anglePerCard = contacts.length > 0 ? 360 / contacts.length : 0;

  const cardsWithAngle = useMemo(
    () => contacts.map((c, i) => ({ contact: c, cardAngle: i * anglePerCard })),
    [contacts, anglePerCard],
  );

  const liveCards = useMemo(
    () =>
      cardsWithAngle.filter(({ cardAngle }) => {
        const delta = normalizeDelta(cardAngle - angleDeg);
        return Math.abs(delta) < VISIBLE_ARC_DEG / 2;
      }),
    [cardsWithAngle, angleDeg],
  );

  const focusedId = useMemo(() => {
    if (liveCards.length === 0) return null;
    let minAbs = Infinity;
    let nearest: string | null = null;
    for (const { contact, cardAngle } of liveCards) {
      const abs = Math.abs(normalizeDelta(cardAngle - angleDeg));
      if (abs < minAbs) {
        minAbs = abs;
        nearest = contact.id;
      }
    }
    return nearest;
  }, [liveCards, angleDeg]);

  if (contacts.length === 0) {
    return (
      <div
        className="rolodex-empty"
        role="status"
        aria-live="polite"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Satoshi', sans-serif",
          color: "#C9A84C",
          fontSize: 14,
          opacity: 0.75,
        }}
      >
        <p>No contacts yet. Add one to start building your network.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rolodex-container"
      onWheel={onWheel}
      onKeyDown={onKeyDown}
      role="region"
      aria-label={
        `Rolodex with ${contacts.length} contacts. ` +
        "Use the mouse wheel or arrow keys to rotate, Enter to open."
      }
      aria-roledescription="rotating rolodex"
      tabIndex={0}
      style={{
        perspective: "1200px",
        perspectiveOrigin: "center center",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        outline: "none",
      }}
    >
      <div
        className="rolodex-cylinder"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateY(${-angleDeg}deg)`,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          position: "relative",
          willChange: "transform",
        }}
      >
        {liveCards.map(({ contact, cardAngle }) => (
          <div
            key={contact.id}
            data-rolodex-card="live"
            style={{
              position: "absolute",
              inset: 0,
              transform: `rotateY(${cardAngle}deg) translateZ(${CYLINDER_RADIUS}px)`,
              backfaceVisibility: "hidden",
            }}
          >
            <RolodexCard
              contact={contact}
              onFlip={() => onFlipCard(contact)}
              focused={contact.id === focusedId}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
