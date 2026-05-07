import { describe, it, expect, vi } from "vitest";
import { linkContactToApplicationForUser } from "./contacts-mutations";

function makeSupabase(contact: { id: string } | null) {
  const updateSpy = vi.fn((_patch: unknown) => ({
    eq: vi.fn(() => ({
      eq: vi.fn(async () => ({ data: null, error: null })),
    })),
  }));

  const fromSpy = vi.fn((table: string) => {
    if (table === "contacts") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: contact, error: null })),
            })),
          })),
        })),
      };
    }
    if (table === "applications") {
      return { update: updateSpy };
    }
    throw new Error(`unexpected table ${table}`);
  });

  return { client: { from: fromSpy }, updateSpy };
}

describe("linkContactToApplicationForUser", () => {
  it("does not write application.contact_id when the contact is not owned by the user", async () => {
    const { client, updateSpy } = makeSupabase(null);

    await linkContactToApplicationForUser(
      client as never,
      "user-1",
      "victim-contact",
      "app-1",
    );

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("writes application.contact_id after proving contact ownership", async () => {
    const { client, updateSpy } = makeSupabase({ id: "contact-1" });

    await linkContactToApplicationForUser(
      client as never,
      "user-1",
      "contact-1",
      "app-1",
    );

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ contact_id: "contact-1" }),
    );
  });
});
