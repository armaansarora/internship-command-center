import type { JSX } from "react";
import type { Metadata } from "next";

import { LobbyPilotClient } from "./lobby-pilot-client";

/**
 * /lobby-pilot — the additive A/B surface for The Tower's identity mark
 * (The Keystone). It does NOT touch the live lobby. Public, no auth, noindex.
 * Favicon/app-icon assets are scoped to this route via `metadata.icons`, so the
 * production `favicon.ico` is untouched. See docs/MARK-SPEC.md + docs/MORNING-REVIEW.md.
 */
export const metadata: Metadata = {
  title: "Identity Pilot — The Keystone",
  description:
    "A pilot of The Tower's identity mark: a matte-gold Art-Deco keystone with a lit passage you enter.",
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/lobby-pilot/favicon.svg", type: "image/svg+xml" },
      { url: "/lobby-pilot/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/lobby-pilot/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/lobby-pilot/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function LobbyPilotPage(): JSX.Element {
  return <LobbyPilotClient />;
}
