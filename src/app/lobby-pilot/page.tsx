import type { JSX } from "react";
import type { Metadata } from "next";

import { LobbyPilotClient } from "./lobby-pilot-client";

/**
 * /lobby-pilot — the additive surface for The Tower's mascot (the owl). It does
 * NOT touch the live lobby. Public, no auth, noindex. See
 * docs/research/mascots/MASCOT-DECISION.md.
 */
export const metadata: Metadata = {
  title: "Identity Pilot — The Owl",
  description:
    "A pilot of The Tower's mascot: a friendly cream owl, with a navy twin for light mode.",
  robots: { index: false, follow: false },
};

export default function LobbyPilotPage(): JSX.Element {
  return <LobbyPilotClient />;
}
