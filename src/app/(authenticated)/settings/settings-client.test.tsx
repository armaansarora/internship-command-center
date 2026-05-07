import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsClient } from "./settings-client";

const BASE_PROPS = {
  userName: "Alice",
  userEmail: "alice@example.com",
  avatarUrl: null,
  provider: "google",
  subscriptionTier: "free" as const,
  appsUsed: 0,
  deletedAt: null,
  networkingConsentAt: null,
  networkingRevokedAt: null,
  rejectionReflectionsEnabled: true,
  ceoVoiceEnabled: false,
  matchEvents: [],
};

describe("SettingsClient connected services", () => {
  it("surfaces the Gmail and Calendar connection entry point", () => {
    const html = renderToStaticMarkup(
      <SettingsClient {...BASE_PROPS} hasGoogleIntegration={false} />,
    );

    expect(html).toContain("Gmail &amp; Calendar");
    expect(html).toContain("Connect Gmail and Calendar");
    expect(html).toContain("Connect");
    expect(html).not.toContain("Coming Soon");
  });

  it("surfaces manual sync controls after Google is connected", () => {
    const html = renderToStaticMarkup(
      <SettingsClient {...BASE_PROPS} hasGoogleIntegration />,
    );

    expect(html).toContain("Google workspace is connected");
    expect(html).toContain("Sync Gmail");
    expect(html).toContain("Sync Calendar");
    expect(html).toContain("Disconnect");
    expect(html).not.toContain("Coming Soon");
  });
});
