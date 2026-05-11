import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { signInAs } from "./helpers/auth";
import { TIMES } from "./helpers/fixtures";

/**
 * Revoke networking consent — settings/privacy UI flow.
 *
 * The API-layer revoke cascade is covered by tests/e2e/abuse/consent-rapid-
 * toggle.spec.ts and the unit suite. This Critic council R-add binds the
 * Trust Console end-to-end shape: a UI-triggered revoke fires the same
 * three-step cascade observable via /__test__/writes.
 *
 * The second test pins the user-facing "type REVOKE to confirm" gate that
 * lives in the Trust Console modal — the operator promise that an
 * accidental click on /settings/privacy cannot delete cross-user matching
 * data without an explicit string-typed acknowledgement.
 */
test.describe("Trust Console — revoke networking consent", () => {
  test("authenticated revoke patches user_profiles + purges own match-index", async ({ page }) => {
    const user = { id: randomUUID(), email: `revoke-ui-${randomUUID()}@example.com` };

    await signInAs(page, user, {
      tables: {
        user_profiles: [
          {
            id: user.id,
            email: user.email,
            networking_consent_at: TIMES.anchor,
            networking_revoked_at: null,
            networking_consent_version: 2,
            subscription_tier: "free",
            floors_unlocked: ["L", "PH", "6"],
          },
        ],
        contacts: [],
        networking_match_index: [],
        match_candidate_index: [],
      },
      allowWrites: true,
    });

    const revoke = await page.request.post("http://localhost:3000/api/networking/revoke");
    expect(revoke.status()).toBe(200);

    const writesRes = await page.request.get("http://localhost:3001/__test__/writes");
    const ops = (await writesRes.json()) as Array<{ table: string; method: string }>;

    const profilePatches = ops.filter((o) => o.table === "user_profiles" && o.method === "PATCH");
    expect(profilePatches.length).toBeGreaterThanOrEqual(1);

    const ownIndexDeletes = ops.filter(
      (o) => o.table === "networking_match_index" && o.method === "DELETE",
    );
    expect(ownIndexDeletes.length).toBeGreaterThanOrEqual(1);
  });

  test("Trust Console modal blocks the cascade until REVOKE is typed", async ({
    page,
  }) => {
    test.skip(
      !process.env.TOWER_TRUST_CONSOLE,
      "Trust Console flag is off — page redirects to /settings",
    );
    const user = {
      id: randomUUID(),
      email: `revoke-modal-${randomUUID()}@example.com`,
    };

    await signInAs(page, user, {
      tables: {
        user_profiles: [
          {
            id: user.id,
            email: user.email,
            networking_consent_at: TIMES.anchor,
            networking_revoked_at: null,
            networking_consent_version: 2,
            subscription_tier: "free",
            floors_unlocked: ["L", "PH", "6"],
          },
        ],
        contacts: [],
        networking_match_index: [],
        match_candidate_index: [],
        audit_logs: [],
      },
      allowWrites: true,
    });

    await page.goto("/settings/privacy");

    const revokeButton = page.getByTestId("revoke-button");
    await expect(revokeButton).toBeVisible();
    await revokeButton.click();

    const modal = page.getByTestId("revoke-modal");
    await expect(modal).toBeVisible();

    const confirm = page.getByTestId("revoke-modal-confirm");
    // Confirm starts disabled — clicking should not fire any writes.
    await expect(confirm).toBeDisabled();

    const input = page.getByTestId("revoke-modal-input");
    await input.fill("revoke"); // wrong casing
    await expect(confirm).toBeDisabled();

    await input.fill("REVOKE");
    await expect(confirm).toBeEnabled();
    await confirm.click();

    // Modal disappears on success; success banner appears.
    await expect(modal).toBeHidden({ timeout: 10_000 });
    await expect(page.getByTestId("banner-success")).toBeVisible();

    const writesRes = await page.request.get(
      "http://localhost:3001/__test__/writes",
    );
    const ops = (await writesRes.json()) as Array<{ table: string; method: string }>;
    const profilePatches = ops.filter(
      (o) => o.table === "user_profiles" && o.method === "PATCH",
    );
    expect(profilePatches.length).toBeGreaterThanOrEqual(1);
  });
});
